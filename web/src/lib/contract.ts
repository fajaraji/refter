import { decodeEventLog, getAddress, isAddress } from 'viem'
import type { Address } from 'viem'
import { publicClient, getWalletClient, ensureMonadTestnet } from './client'
import { CREDENTIALS_ADDRESS } from './contract-address'
import abi from './abi.json'
import { parseWithPattern } from './agent'
import { parseWithGemini, chatWithGemini } from './gemini'
import type { AgentResponse, AgentIntent, AgentParams } from './agent'

const CREDENTIAL_TYPES = ['Reference Letter', 'Certificate', 'Recommendation Letter'] as const
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

function credentialTypeToUint8(name: string): number | undefined {
  const idx = CREDENTIAL_TYPES.findIndex((type) => type.toLowerCase() === name.toLowerCase())
  return idx >= 0 ? idx : undefined
}

function uint8ToCredentialType(value: number | bigint): string {
  return CREDENTIAL_TYPES[Number(value)] ?? 'Unknown'
}

function stringToBytes32(str: string): `0x${string}` {
  const bytes = new TextEncoder().encode(str)
  if (bytes.length > 32) throw new Error('Credential title cannot exceed 32 bytes.')
  const hex = Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `0x${hex.padEnd(64, '0')}` as `0x${string}`
}

function compactPeriod(period: string): string {
  const years = period.match(/\d{4}/g)
  return years && years.length >= 2 ? `${years[0]}-${years[1]}` : period
}

function bytes32ToString(hex: string): string {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(32)
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes).replace(/\0/g, '').trim()
}

export interface Credential {
  id: number
  issuer: Address
  holder: Address
  credentialType: string
  title: string
  issuedAt: number
  active: boolean
}

export interface ExecuteResult {
  ok: boolean
  message: string
  txHash?: string
  credential?: Credential
  credentials?: Credential[]
  isAuthorized?: boolean
}

export interface RoleInfo {
  owner: Address
  isOwner: boolean
  isIssuer: boolean
  holderCredentialCount: number
}

function readCredentialTuple(value: any): {
  issuer: Address
  holder: Address
  credentialType: number | bigint
  title: string
  issuedAt: number | bigint
  active: boolean
} {
  const issuer = (value.issuer ?? value[0]) as Address
  const holder = (value.holder ?? value[1]) as Address
  const credentialType = value.credentialType ?? value[2]
  const title = value.title ?? value[3]
  const issuedAt = value.issuedAt ?? value[5]
  const active = Boolean(value.active ?? value[6])
  return { issuer, holder, credentialType, title, issuedAt, active }
}

// === Read helpers ===
export async function getCredential(id: number): Promise<Credential | null> {
  try {
    const value = await publicClient.readContract({
      address: CREDENTIALS_ADDRESS,
      abi: abi as any,
      functionName: 'getCredential',
      args: [BigInt(id)],
    })
    if (!value) return null
    const c = readCredentialTuple(value)
    if (!c.issuer || c.issuer.toLowerCase() === ZERO_ADDRESS) return null
    return {
      id,
      issuer: c.issuer,
      holder: c.holder,
      credentialType: uint8ToCredentialType(c.credentialType),
      title: typeof c.title === 'string' && c.title.startsWith('0x') ? bytes32ToString(c.title) : String(c.title),
      issuedAt: Number(c.issuedAt),
      active: c.active,
    }
  } catch {
    return null
  }
}

export async function verifyCredential(id: number): Promise<Credential | null> {
  try {
    const result = await publicClient.readContract({
      address: CREDENTIALS_ADDRESS,
      abi: abi as any,
      functionName: 'verifyCredential',
      args: [BigInt(id)],
    }) as any
    const [isValid, issuer, holder, credentialType, title, issuedAt] = result
    const credential = await getCredential(id)
    if (!credential) return null
    return {
      ...credential,
      issuer: issuer as Address,
      holder: holder as Address,
      credentialType: uint8ToCredentialType(credentialType),
      title: typeof title === 'string' && title.startsWith('0x') ? bytes32ToString(title) : credential.title,
      issuedAt: Number(issuedAt),
      active: Boolean(isValid),
    }
  } catch {
    return null
  }
}

export async function getHolderCredentialIds(holder: Address): Promise<bigint[]> {
  return await publicClient.readContract({
    address: CREDENTIALS_ADDRESS,
    abi: abi as any,
    functionName: 'getHolderCredentials',
    args: [holder],
  }) as bigint[]
}

export async function getHolderCredentials(holder: Address): Promise<Credential[]> {
  const ids = await getHolderCredentialIds(holder)
  const credentials = await Promise.all(ids.map((id) => getCredential(Number(id))))
  const validCredentials = credentials.filter((credential): credential is Credential => credential !== null)
  const issuerStatuses = await Promise.all(validCredentials.map((credential) => isAuthorizedIssuer(credential.issuer)))
  return validCredentials.map((credential, index) => ({
    ...credential,
    active: credential.active && issuerStatuses[index],
  }))
}

export async function getOwner(): Promise<Address> {
  return await publicClient.readContract({
    address: CREDENTIALS_ADDRESS,
    abi: abi as any,
    functionName: 'owner',
  }) as Address
}

export async function isAuthorizedIssuer(addr: Address): Promise<boolean> {
  return await publicClient.readContract({
    address: CREDENTIALS_ADDRESS,
    abi: abi as any,
    functionName: 'isAuthorizedIssuer',
    args: [addr],
  }) as boolean
}

export async function getRoleInfo(account: Address | null): Promise<RoleInfo> {
  const owner = await getOwner()
  if (!account) return { owner, isOwner: false, isIssuer: false, holderCredentialCount: 0 }
  const [isIssuer, ids] = await Promise.all([
    isAuthorizedIssuer(account),
    getHolderCredentialIds(account),
  ])
  return {
    owner,
    isOwner: owner.toLowerCase() === account.toLowerCase(),
    isIssuer,
    holderCredentialCount: ids.length,
  }
}

// === Command parser ===
export async function parseIntent(userInput: string): Promise<AgentResponse> {
  const patternResult = parseWithPattern(userInput)
  if (patternResult.intent !== 'chat' && patternResult.intent !== 'unknown') return patternResult

  const geminiResult = await parseWithGemini(userInput)
  if (geminiResult && geminiResult.confidence >= 0.7) {
    const intent = geminiResult.intent as AgentIntent
    if (intent !== 'unknown' && intent !== 'chat') {
      const params = geminiResult.params as AgentParams
      return {
        intent,
        params: {
          holderAddress: params.holderAddress as Address | undefined,
          holderName: params.holderName,
          credentialType: params.credentialType,
          title: params.title,
          period: params.period,
          credentialId: params.credentialId,
        },
        message: patternResult.message,
      }
    }
  }
  return patternResult
}

// === Execution ===
export async function executeAgent(userInput: string, account?: Address): Promise<ExecuteResult> {
  try {
    const parsed = await parseIntent(userInput)

    if (parsed.intent === 'verify') return executeVerify(parsed)
    if (parsed.intent === 'list') return executeList(account)
    if (parsed.intent === 'check_issuer') return executeCheckIssuer(account)
    if (parsed.intent === 'chat') return executeChat(userInput, account)
    if (parsed.intent === 'register') {
      return { ok: false, message: 'Holder registration is not required in the MVP. Enter the holder wallet address when issuing a credential.' }
    }

    if (!account) return { ok: false, message: 'Connect a wallet before performing this action.' }
    if (parsed.intent === 'issue') return executeIssue(parsed, account)
    if (parsed.intent === 'revoke') return executeRevoke(parsed, account)
    return { ok: false, message: parsed.message }
  } catch (error) {
    return { ok: false, message: `Request failed: ${shortError(error)}` }
  }
}

async function executeChat(userInput: string, account?: Address): Promise<ExecuteResult> {
  return { ok: true, message: await chatWithGemini(userInput, account) }
}

async function executeVerify(parsed: AgentResponse): Promise<ExecuteResult> {
  const id = parsed.params.credentialId
  if (!id || !Number.isSafeInteger(id) || id < 1) {
    return {
      ok: false,
      message: 'Public verification uses a Credential ID. Ask the holder for the ID or QR code, then enter it in the Verify tab. Holder names are not used for global lookup.',
    }
  }

  const credential = await verifyCredential(id)
  if (!credential) return { ok: false, message: `Credential #${id} was not found on the blockchain.` }
  const valid = credential.active
  return {
    ok: valid,
    message: valid
      ? `VALID - #${id} ${credential.credentialType}: ${credential.title}\nIssuer: ${credential.issuer}\nHolder: ${credential.holder}\nIssued: ${new Date(credential.issuedAt * 1000).toLocaleDateString('en-US')}`
      : `INVALID - Credential #${id} was revoked or its issuer is no longer authorized.`,
    credential,
  }
}

async function executeList(account?: Address): Promise<ExecuteResult> {
  if (!account) return { ok: false, message: 'Connect the wallet whose credentials you want to view.' }
  const credentials = await getHolderCredentials(account)
  if (credentials.length === 0) return { ok: true, message: 'This wallet has not received any credentials on the blockchain.' }
  const lines = credentials.map((credential) => (
    `#${credential.id} ${credential.active ? 'ACTIVE' : 'REVOKED'} ${credential.credentialType}: ${credential.title} (${new Date(credential.issuedAt * 1000).toLocaleDateString('en-US')})`
  )).join('\n')
  return { ok: true, message: `Credentials for wallet ${account}:\n${lines}`, credentials }
}

async function executeCheckIssuer(account?: Address): Promise<ExecuteResult> {
  if (!account) return { ok: false, message: 'Connect a wallet to check its issuer status.' }
  const authorized = await isAuthorizedIssuer(account)
  return {
    ok: authorized,
    message: authorized
      ? `${account} is an authorized issuer and can issue credentials.`
      : `${account} is not an authorized issuer. The contract owner must authorize this wallet first.`,
    isAuthorized: authorized,
  }
}

async function executeIssue(parsed: AgentResponse, account: Address): Promise<ExecuteResult> {
  const holderAddress = parsed.params.holderAddress
  if (!holderAddress || !isAddress(holderAddress) || holderAddress.toLowerCase() === ZERO_ADDRESS) {
    return { ok: false, message: 'Enter a valid holder wallet address: 0x followed by 40 hexadecimal characters. The issuer wallet cannot be used automatically as the holder.' }
  }

  if (!await isAuthorizedIssuer(account)) {
    return { ok: false, message: 'This wallet is not an authorized issuer. Open the Roles tab and ask the contract owner to authorize it.' }
  }

  const credentialType = parsed.params.credentialType ?? 'Reference Letter'
  const credentialTypeValue = credentialTypeToUint8(credentialType)
  if (credentialTypeValue === undefined) return { ok: false, message: `Unknown credential type: ${credentialType}.` }

  const baseTitle = parsed.params.title?.trim() || 'Reference Letter'
  const displayTitle = parsed.params.period ? `${baseTitle} (${parsed.params.period})` : baseTitle
  const storageTitle = parsed.params.period ? `${baseTitle} ${compactPeriod(parsed.params.period)}` : baseTitle
  if (new TextEncoder().encode(storageTitle).length > 32) {
    return { ok: false, message: 'The job title is too long for the MVP metadata. Shorten it so the title and work years fit within 32 bytes.' }
  }
  const holder = getAddress(holderAddress)

  await ensureMonadTestnet()
  const wallet = getWalletClient()
  const args = [holder, credentialTypeValue, stringToBytes32(storageTitle), stringToBytes32('')] as const
  const gas = await estimateContractGas('issueCredential', args, account)
  const hash = await wallet.writeContract({
    address: CREDENTIALS_ADDRESS,
    abi: abi as any,
    functionName: 'issueCredential',
    args,
    account,
    gas,
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  const id = findIssuedCredentialId(receipt.logs)
  return {
    ok: true,
    message: `Credential${id ? ` #${id}` : ''} was issued on Monad Testnet.\nType: ${credentialType}\nTitle: ${displayTitle}\nHolder: ${parsed.params.holderName ? `${parsed.params.holderName} ` : ''}${holder}\nIssuer: ${account}\nTransaction: ${hash}`,
    txHash: hash,
  }
}

async function executeRevoke(parsed: AgentResponse, account: Address): Promise<ExecuteResult> {
  const id = parsed.params.credentialId
  if (!id || !Number.isSafeInteger(id) || id < 1) return { ok: false, message: 'Enter the Credential ID to revoke.' }

  const credential = await getCredential(id)
  if (!credential) return { ok: false, message: `Credential #${id} was not found on the blockchain.` }
  if (credential.issuer.toLowerCase() !== account.toLowerCase()) return { ok: false, message: 'Only the issuer that created this credential can revoke it.' }
  if (!credential.active) return { ok: false, message: `Credential #${id} has already been revoked.` }

  await ensureMonadTestnet()
  const wallet = getWalletClient()
  const args = [BigInt(id)] as const
  const gas = await estimateContractGas('revokeCredential', args, account)
  const hash = await wallet.writeContract({
    address: CREDENTIALS_ADDRESS,
    abi: abi as any,
    functionName: 'revokeCredential',
    args,
    account,
    gas,
  })
  await publicClient.waitForTransactionReceipt({ hash })
  return { ok: true, message: `Credential #${id} was revoked.\nTransaction: ${hash}`, txHash: hash }
}

export async function manageIssuer(
  target: string,
  action: 'authorize' | 'revoke',
  account: Address,
): Promise<ExecuteResult> {
  if (!isAddress(target) || target.toLowerCase() === ZERO_ADDRESS) return { ok: false, message: 'Invalid issuer wallet address.' }
  const owner = await getOwner()
  if (owner.toLowerCase() !== account.toLowerCase()) return { ok: false, message: 'Only the contract owner can manage issuers.' }

  await ensureMonadTestnet()
  const wallet = getWalletClient()
  const functionName = action === 'authorize' ? 'authorizeIssuer' : 'revokeIssuer'
  const args = [getAddress(target)] as const
  const gas = await estimateContractGas(functionName, args, account)
  const hash = await wallet.writeContract({
    address: CREDENTIALS_ADDRESS,
    abi: abi as any,
    functionName,
    args,
    account,
    gas,
  })
  await publicClient.waitForTransactionReceipt({ hash })
  return {
    ok: true,
    message: `${getAddress(target)} was ${action === 'authorize' ? 'authorized as an issuer' : 'removed from the issuer list'}.\nTransaction: ${hash}`,
    txHash: hash,
  }
}

async function estimateContractGas(functionName: string, args: readonly unknown[], account: Address): Promise<bigint> {
  const estimate = await publicClient.estimateContractGas({
    address: CREDENTIALS_ADDRESS,
    abi: abi as any,
    functionName: functionName as any,
    args: args as any,
    account,
  })
  return estimate + estimate / 10n
}

function findIssuedCredentialId(logs: readonly any[]): number | undefined {
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({ abi: abi as any, data: log.data, topics: log.topics }) as any
      if (decoded.eventName === 'CredentialIssued') {
        const id = Number(decoded.args.id)
        return Number.isSafeInteger(id) ? id : undefined
      }
    } catch {
      // Ignore unrelated logs.
    }
  }
  return undefined
}

function shortError(error: unknown): string {
  const value = error as { shortMessage?: string; message?: string }
  const message = value?.shortMessage || value?.message || String(error)
  const revert = message.match(/reason: "([^"]+)"/)
  if (revert) return revert[1]
  if (/user rejected|denied/i.test(message)) return 'Transaction was cancelled in the wallet.'
  if (/insufficient funds/i.test(message)) return 'Insufficient MON balance for gas.'
  return message.slice(0, 160)
}

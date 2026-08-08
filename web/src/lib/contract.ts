import { publicClient, getWalletClient } from './client'
import { CREDENTIALS_ADDRESS } from './contract-address'
import abi from './abi.json'
import { parseWithPattern } from './agent'
import { parseWithGemini } from './gemini'
import type { AgentResponse, AgentIntent, AgentParams } from './agent'

export interface Credential {
  id: number
  issuer: string
  holder: string
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

// === Read helpers ===
export async function getCredential(id: number): Promise<Credential | null> {
  try {
    const c = (await publicClient.readContract({
      address: CREDENTIALS_ADDRESS,
      abi: abi as any,
      functionName: 'getCredential',
      args: [BigInt(id)],
    })) as any
    if (!c || c.issuer === '0x0000000000000000000000000000000000000000') return null
    return {
      id,
      issuer: c.issuer,
      holder: c.holder,
      credentialType: c.credentialType,
      title: c.title,
      issuedAt: Number(c.issuedAt),
      active: c.active,
    }
  } catch {
    return null
  }
}

export async function verifyCredential(id: number): Promise<Credential | null> {
  try {
    const [isValid, , , , , issuedAt] = (await publicClient.readContract({
      address: CREDENTIALS_ADDRESS,
      abi: abi as any,
      functionName: 'verifyCredential',
      args: [BigInt(id)],
    })) as any
    const c = await getCredential(id)
    if (!c) return null
    return { ...c, active: Boolean(isValid) && c.active, issuedAt: Number(issuedAt) }
  } catch {
    return null
  }
}

export async function getHolderCredentials(holder: `0x${string}`): Promise<Credential[]> {
  const ids = (await publicClient.readContract({
    address: CREDENTIALS_ADDRESS,
    abi: abi as any,
    functionName: 'getHolderCredentials',
    args: [holder],
  })) as bigint[]
  const creds = await Promise.all(ids.map((id) => getCredential(Number(id))))
  return creds.filter((c): c is Credential => c !== null)
}

export async function isAuthorizedIssuer(addr: `0x${string}`): Promise<boolean> {
  return (await publicClient.readContract({
    address: CREDENTIALS_ADDRESS,
    abi: abi as any,
    functionName: 'isAuthorizedIssuer',
    args: [addr],
  })) as boolean
}

// === Hybrid parser ===
export async function parseIntent(userInput: string): Promise<AgentResponse> {
  const patternResult = parseWithPattern(userInput)
  const geminiResult = await parseWithGemini(userInput)
  if (
    geminiResult &&
    geminiResult.confidence > 0.8 &&
    geminiResult.intent !== 'unknown' &&
    geminiResult.intent !== 'null'
  ) {
    const g = geminiResult as any
    return {
      intent: g.intent as AgentIntent,
      params: (g.params ?? {}) as AgentParams,
      message: patternResult.message,
    }
  }
  return patternResult
}

// === Execution ===
export async function executeAgent(userInput: string, account?: `0x${string}`): Promise<ExecuteResult> {
  const parsed = await parseIntent(userInput)

  // Read-only intents don't need a wallet
  if (parsed.intent === 'verify') {
    return executeVerify(parsed)
  }
  if (parsed.intent === 'list') {
    return executeList(parsed, account)
  }
  if (parsed.intent === 'check_issuer') {
    return executeCheckIssuer(parsed, account)
  }

  // Write intents need wallet
  if (!account) {
    return { ok: false, message: 'Hubungkan wallet dulu untuk operasi ini. Klik "Connect Wallet".' }
  }

  if (parsed.intent === 'issue') return executeIssue(parsed, account)
  if (parsed.intent === 'revoke') return executeRevoke(parsed, account)

  return { ok: false, message: parsed.message }
}

async function executeVerify(parsed: AgentResponse): Promise<ExecuteResult> {
  const id = parsed.params.credentialId
  if (!id) {
    return { ok: false, message: 'Kasih ID kredensialnya, contoh: "cek credential ID 1 valid gak?"' }
  }
  const c = await verifyCredential(id)
  if (!c) return { ok: false, message: `Kredensial #${id} tidak ditemukan di blockchain.` }
  const valid = c.active
  return {
    ok: valid,
    message: valid
      ? `✅ VALID — #${id} ${c.credentialType}: ${c.title}\nIssuer: ${c.issuer}\nHolder: ${c.holder}\nTerbit: ${new Date(c.issuedAt * 1000).toLocaleDateString('id-ID')}`
      : `❌ INVALID — Kredensial #${id} (${c.title}) telah dicabut atau issuer tidak lagi terotorisasi.`,
    credential: c,
  }
}

async function executeList(_parsed: AgentResponse, account?: `0x${string}`): Promise<ExecuteResult> {
  if (!account) return { ok: false, message: 'Hubungkan wallet dulu untuk lihat kredensial kamu.' }
  const creds = await getHolderCredentials(account)
  if (creds.length === 0) return { ok: true, message: 'Kamu belum punya kredensial di blockchain.' }
  const lines = creds
    .map((c) => `#${c.id} ${c.active ? '✅' : '❌'} ${c.credentialType}: ${c.title} (${new Date(c.issuedAt * 1000).toLocaleDateString('id-ID')})`)
    .join('\n')
  return { ok: true, message: `Kamu punya ${creds.length} kredensial:\n${lines}`, credentials: creds }
}

async function executeCheckIssuer(_parsed: AgentResponse, account?: `0x${string}`): Promise<ExecuteResult> {
  if (!account) return { ok: false, message: 'Hubungkan wallet dulu.' }
  const auth = await isAuthorizedIssuer(account)
  return {
    ok: auth,
    message: auth
      ? `✅ ${account} adalah issuer terotorisasi. Bisa terbitkan kredensial.`
      : `❌ ${account} BUKAN issuer terotorisasi. Hubungi owner kontrak untuk authorize.`,
    isAuthorized: auth,
  }
}

async function executeIssue(parsed: AgentResponse, account: `0x${string}`): Promise<ExecuteResult> {
  const holder = parsed.params.holderAddress
  if (!holder) return { ok: false, message: 'Kasih alamat pemegang 0x... dulu, contoh: "terbitkan sertifikat untuk 0x1234..."' }
  const credentialType = parsed.params.credentialType ?? 'Sertifikat'
  const title = parsed.params.title ?? 'Kredensial'
  try {
    const wallet = getWalletClient()
    const hash = await wallet.writeContract({
      address: CREDENTIALS_ADDRESS,
      abi: abi as any,
      functionName: 'issueCredential',
      args: [holder, credentialType, title, ''],
      account,
    })
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    const id = Number(receipt.logs[0]?.topics?.[1] ?? 0n)
    return {
      ok: true,
      message: `✅ Kredensial #${id} terbitkan di Monad!\nTipe: ${credentialType}\nJudul: ${title}\nHolder: ${holder}\nTx: ${hash}`,
      txHash: hash,
    }
  } catch (e: any) {
    return { ok: false, message: `Gagal terbitkan: ${shortError(e)}` }
  }
}

async function executeRevoke(parsed: AgentResponse, account: `0x${string}`): Promise<ExecuteResult> {
  const id = parsed.params.credentialId
  if (!id) return { ok: false, message: 'Kasih ID kredensial yang mau dicabut, contoh: "cabut credential ID 3"' }
  try {
    const wallet = getWalletClient()
    const hash = await wallet.writeContract({
      address: CREDENTIALS_ADDRESS,
      abi: abi as any,
      functionName: 'revokeCredential',
      args: [BigInt(id)],
      account,
    })
    await publicClient.waitForTransactionReceipt({ hash })
    return { ok: true, message: `✅ Kredensial #${id} dicabut.\nTx: ${hash}`, txHash: hash }
  } catch (e: any) {
    return { ok: false, message: `Gagal cabut: ${shortError(e)}` }
  }
}

function shortError(e: any): string {
  const msg = e?.shortMessage || e?.message || String(e)
  const revert = msg.match(/reason: "([^"]+)"/)
  if (revert) return revert[1]
  const known = msg.match(/(User rejected|insufficient funds|execution reverted)/i)
  return known ? known[1] : msg.slice(0, 120)
}

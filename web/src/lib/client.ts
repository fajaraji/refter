import { createPublicClient, createWalletClient, custom, http, defineChain, isAddress } from 'viem'
import type { Address } from 'viem'

export const MONAD_TESTNET_CHAIN_ID = 10143
export const MONAD_TESTNET_CHAIN_ID_HEX = '0x279f'
const MONAD_TESTNET_RPC_URL = (import.meta.env.VITE_MONAD_RPC_URL as string | undefined)?.trim()
  || 'https://testnet-rpc.monad.xyz'

export const monadTestnet = defineChain({
  id: MONAD_TESTNET_CHAIN_ID,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: [MONAD_TESTNET_RPC_URL] },
  },
  blockExplorers: {
    default: { name: 'MonadExplorer', url: 'https://testnet.monadexplorer.com' },
  },
})

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(MONAD_TESTNET_RPC_URL),
})

export interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>
  on?: (event: string, listener: (...args: any[]) => void) => void
  removeListener?: (event: string, listener: (...args: any[]) => void) => void
}

export function getEthereum(): EthereumProvider {
  const ethereum = typeof window !== 'undefined' ? (window as Window & { ethereum?: EthereumProvider }).ethereum : undefined
  if (!ethereum) throw new Error('MetaMask was not detected. Please install MetaMask first.')
  return ethereum
}

export async function getChainId(): Promise<number> {
  const chainId = await getEthereum().request({ method: 'eth_chainId' })
  return Number.parseInt(String(chainId), 16)
}

export async function isOnMonadTestnet(): Promise<boolean> {
  try {
    return (await getChainId()) === MONAD_TESTNET_CHAIN_ID
  } catch {
    return false
  }
}

export async function ensureMonadTestnet(): Promise<void> {
  const ethereum = getEthereum()
  if (await getChainId() === MONAD_TESTNET_CHAIN_ID) return

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: MONAD_TESTNET_CHAIN_ID_HEX }],
    })
  } catch (error) {
    if ((error as { code?: number })?.code !== 4902) throw error
    await ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: MONAD_TESTNET_CHAIN_ID_HEX,
        chainName: 'Monad Testnet',
        nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
        rpcUrls: [MONAD_TESTNET_RPC_URL],
        blockExplorerUrls: ['https://testnet.monadexplorer.com'],
      }],
    })
  }
}

export async function getConnectedAccount(): Promise<Address | null> {
  const accounts = await getEthereum().request({ method: 'eth_accounts' })
  const account = Array.isArray(accounts) ? accounts[0] : undefined
  return typeof account === 'string' && isAddress(account) ? account as Address : null
}

// Wallet client is created lazily after MetaMask is connected.
export function getWalletClient() {
  const ethereum = getEthereum()
  return createWalletClient({
    chain: monadTestnet,
    transport: custom(ethereum),
  })
}

export async function getAccount(): Promise<Address> {
  const ethereum = getEthereum()
  const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
  const account = Array.isArray(accounts) ? accounts[0] : undefined
  if (typeof account !== 'string' || !isAddress(account)) throw new Error('No wallet was selected.')
  await ensureMonadTestnet()
  return account as Address
}

import { createPublicClient, createWalletClient, custom, http, defineChain } from 'viem'

export const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'MonadExplorer', url: 'https://testnet.monadexplorer.com' },
  },
})

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
})

// Wallet client built lazily once MetaMask is connected
export function getWalletClient() {
  const { ethereum } = window as any
  if (!ethereum) throw new Error('MetaMask tidak terdeteksi. Install MetaMask dulu.')
  return createWalletClient({
    chain: monadTestnet,
    transport: custom(ethereum),
  })
}

export async function getAccount(): Promise<`0x${string}`> {
  const { ethereum } = window as any
  if (!ethereum) throw new Error('MetaMask tidak terdeteksi')
  const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
  return accounts[0] as `0x${string}`
}

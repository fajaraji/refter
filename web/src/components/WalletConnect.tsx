import { useEffect, useState } from 'react'
import { isAddress } from 'viem'
import type { Address } from 'viem'
import { getAccount, getConnectedAccount, getEthereum, isOnMonadTestnet } from '../lib/client'

interface Props {
  account: Address | null
  onConnect: (addr: Address | null) => void
}

function shortAddr(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function WalletConnect({ account, onConnect }: Props) {
  const [busy, setBusy] = useState(false)
  const [networkOk, setNetworkOk] = useState(true)

  useEffect(() => {
    let mounted = true
    let ethereum
    try {
      ethereum = getEthereum()
    } catch {
      return () => undefined
    }

    async function sync() {
      try {
        const [nextAccount, onMonad] = await Promise.all([getConnectedAccount(), isOnMonadTestnet()])
        if (!mounted) return
        onConnect(nextAccount)
        setNetworkOk(onMonad)
      } catch {
        if (mounted) setNetworkOk(false)
      }
    }

    const handleAccountsChanged = (accounts: unknown) => {
      const next = Array.isArray(accounts) && typeof accounts[0] === 'string' && isAddress(accounts[0])
        ? accounts[0] as Address
        : null
      onConnect(next)
    }
    const handleChainChanged = () => { void sync() }

    void sync()
    ethereum.on?.('accountsChanged', handleAccountsChanged)
    ethereum.on?.('chainChanged', handleChainChanged)
    return () => {
      mounted = false
      ethereum?.removeListener?.('accountsChanged', handleAccountsChanged)
      ethereum?.removeListener?.('chainChanged', handleChainChanged)
    }
  }, [onConnect])

  async function connect() {
    setBusy(true)
    try {
      const address = await getAccount()
      onConnect(address)
      setNetworkOk(true)
    } catch (error: any) {
      alert(error?.shortMessage ?? error?.message ?? 'Failed to connect wallet')
    } finally {
      setBusy(false)
    }
  }

  function disconnect() {
    // MetaMask cannot be disconnected by a dapp. Clear only this app's session.
    onConnect(null)
    localStorage.removeItem('occa_wallet')
  }

  return (
    <button
      id="btn-connect-wallet"
      className={`wallet-btn ${account ? 'connected' : ''} ${account && !networkOk ? 'wrong-network' : ''}`}
      onClick={account ? disconnect : connect}
      disabled={busy}
      title={account && !networkOk ? 'Switch to Monad Testnet before sending a transaction' : undefined}
    >
      {busy ? 'Connecting...' : account ? (networkOk ? `✓ ${shortAddr(account)}` : `⚠ ${shortAddr(account)}`) : 'Connect Wallet'}
    </button>
  )
}

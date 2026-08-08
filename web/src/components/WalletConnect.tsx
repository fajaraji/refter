import { useState } from 'react'
import { getAccount } from '../lib/client'

interface Props {
  account: `0x${string}` | null
  onConnect: (addr: `0x${string}`) => void
}

function shortAddr(a: string) {
  return `${a.slice(0, 6)}...${a.slice(-4)}`
}

export default function WalletConnect({ account, onConnect }: Props) {
  const [busy, setBusy] = useState(false)

  async function connect() {
    setBusy(true)
    try {
      const addr = await getAccount()
      onConnect(addr)
    } catch (e: any) {
      alert(e?.message ?? 'Gagal connect wallet')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      id="btn-connect-wallet"
      className={`wallet-btn ${account ? 'connected' : ''}`}
      onClick={connect}
      disabled={busy || !!account}
    >
      {busy ? 'Menghubungkan...' : account ? `✓ ${shortAddr(account)}` : 'Connect Wallet'}
    </button>
  )
}

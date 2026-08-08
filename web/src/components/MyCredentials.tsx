import { useEffect, useState } from 'react'
import { getHolderCredentials } from '../lib/contract'
import type { Credential } from '../lib/contract'
import CredentialCard from './CredentialCard'

export default function MyCredentials({ account }: { account: `0x${string}` | null }) {
  const [creds, setCreds] = useState<Credential[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!account) {
      setCreds([])
      return
    }
    setBusy(true)
    getHolderCredentials(account)
      .then(setCreds)
      .finally(() => setBusy(false))
  }, [account])

  if (!account) return <p className="empty">Connect wallet untuk lihat kredensial kamu.</p>
  if (busy) return <p className="empty">Memuat kredensial...</p>
  if (creds.length === 0) return <p className="empty">Belum ada kredensial di wallet ini.</p>

  return (
    <div className="cred-grid">
      {creds.map((c) => (
        <CredentialCard key={c.id} credential={c} />
      ))}
    </div>
  )
}

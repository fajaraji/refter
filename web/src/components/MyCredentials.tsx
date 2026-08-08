import { useEffect, useState } from 'react'
import { getHolderCredentials } from '../lib/contract'
import type { Credential } from '../lib/contract'
import CredentialCard from './CredentialCard'

export default function MyCredentials({ account }: { account: `0x${string}` | null }) {
  const [creds, setCreds] = useState<Credential[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!account) {
      setCreds([])
      setError('')
      return
    }
    setBusy(true)
    setError('')
    getHolderCredentials(account)
      .then(setCreds)
      .catch(() => setError('Credentials could not be loaded. Check the network and contract address configuration.'))
      .finally(() => setBusy(false))
  }, [account])

  if (!account) return <p className="empty">Connect a wallet to view its credentials.</p>
  if (busy) return <p className="empty">Loading credentials...</p>
  if (error) return <p className="empty">{error}</p>
  if (creds.length === 0) return <p className="empty">This wallet has no credentials yet.</p>

  return (
    <>
      <p className="section-hint">This shows only credentials whose holder address matches the connected wallet. To check someone else, use Verify with a Credential ID.</p>
      <div className="cred-grid">
        {creds.map((c) => (
          <CredentialCard key={c.id} credential={c} />
        ))}
      </div>
    </>
  )
}

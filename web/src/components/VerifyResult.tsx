import { useState } from 'react'
import { verifyCredential } from '../lib/contract'
import type { Credential } from '../lib/contract'
import CredentialCard from './CredentialCard'

export default function VerifyResult() {
  const [id, setId] = useState('')
  const [cred, setCred] = useState<Credential | null>(null)
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'missing' | 'error'>('idle')

  async function check() {
    const n = parseInt(id, 10)
    if (!Number.isSafeInteger(n) || n < 1) return
    setState('busy')
    setCred(null)
    try {
      const c = await verifyCredential(n)
      if (!c) {
        setState('missing')
      } else {
        setCred(c)
        setState('done')
      }
    } catch {
      setState('error')
    }
  }

  return (
    <section className="verify-panel">
      <p className="section-hint">Verification is public. You do not need a wallet; enter the Credential ID shared by the holder.</p>
      <form
        className="verify-form"
        onSubmit={(e) => {
          e.preventDefault()
          check()
        }}
      >
        <input
          id="verify-id-input"
          value={id}
          onChange={(e) => setId(e.target.value.replace(/\D/g, ''))}
          placeholder="Credential ID, example: 1"
          inputMode="numeric"
        />
        <button id="btn-verify" type="submit" disabled={!id || state === 'busy'}>
          {state === 'busy' ? 'Checking...' : 'Verify'}
        </button>
      </form>

      {state === 'missing' && (
        <div className="verify-result revoked">
          <h3>❌ Not found</h3>
          <p>Credential #{id} does not exist on the blockchain.</p>
        </div>
      )}

      {state === 'error' && (
        <div className="verify-result revoked">
          <h3>Unable to read the blockchain</h3>
          <p>Check the network connection or contract address configuration.</p>
        </div>
      )}

      {state === 'done' && cred && (
        <div className="verify-result">
          <div className={`banner ${cred.active ? 'valid' : 'revoked'}`}>
            {cred.active ? '✅ VALID — Credential is active' : '❌ INVALID — Credential revoked'}
          </div>
          <CredentialCard credential={cred} />
        </div>
      )}
    </section>
  )
}

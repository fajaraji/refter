import { useState } from 'react'
import { verifyCredential } from '../lib/contract'
import type { Credential } from '../lib/contract'
import CredentialCard from './CredentialCard'

export default function VerifyResult() {
  const [id, setId] = useState('')
  const [cred, setCred] = useState<Credential | null>(null)
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'missing'>('idle')

  async function check() {
    const n = parseInt(id, 10)
    if (!n) return
    setState('busy')
    const c = await verifyCredential(n)
    if (!c) {
      setState('missing')
    } else {
      setCred(c)
      setState('done')
    }
  }

  return (
    <section className="verify-panel">
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
          placeholder="ID kredensial, contoh: 1"
          inputMode="numeric"
        />
        <button id="btn-verify" type="submit" disabled={!id || state === 'busy'}>
          {state === 'busy' ? 'Memeriksa...' : 'Verifikasi'}
        </button>
      </form>

      {state === 'missing' && (
        <div className="verify-result revoked">
          <h3>❌ Tidak ditemukan</h3>
          <p>Kredensial #{id} tidak ada di blockchain.</p>
        </div>
      )}

      {state === 'done' && cred && (
        <div className="verify-result">
          <div className={`banner ${cred.active ? 'valid' : 'revoked'}`}>
            {cred.active ? '✅ VALID — Kredensial asli & aktif' : '❌ INVALID — Kredensial dicabut'}
          </div>
          <CredentialCard credential={cred} />
        </div>
      )}
    </section>
  )
}

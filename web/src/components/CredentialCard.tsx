import type { Credential } from '../lib/contract'

export default function CredentialCard({ credential }: { credential: Credential }) {
  return (
    <div className={`cred-card ${credential.active ? 'valid' : 'revoked'}`}>
      <div className="cred-head">
        <span className={`badge ${credential.active ? 'ok' : 'no'}`}>
          {credential.active ? '✅ AKTIF' : '❌ DICABUT'}
        </span>
        <span className="cred-id">#{credential.id}</span>
      </div>
      <h3 className="cred-title">{credential.title}</h3>
      <p className="cred-type">{credential.credentialType}</p>
      <div className="cred-meta">
        <p>Issuer: <span className="mono">{credential.issuer.slice(0, 10)}...</span></p>
        <p>Holder: <span className="mono">{credential.holder.slice(0, 10)}...</span></p>
        <p>Terbit: {new Date(credential.issuedAt * 1000).toLocaleDateString('id-ID')}</p>
      </div>
    </div>
  )
}

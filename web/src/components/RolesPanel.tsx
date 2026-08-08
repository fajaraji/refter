import { useCallback, useEffect, useState } from 'react'
import { isAddress } from 'viem'
import type { Address } from 'viem'
import { getRoleInfo, manageIssuer } from '../lib/contract'
import type { RoleInfo } from '../lib/contract'
import { isOnMonadTestnet } from '../lib/client'
import { walletAddressError } from '../lib/address'

interface Props {
  account: Address | null
}

function shortAddress(address: string) {
  return `${address.slice(0, 8)}...${address.slice(-6)}`
}

export default function RolesPanel({ account }: Props) {
  const [roleInfo, setRoleInfo] = useState<RoleInfo | null>(null)
  const [networkOk, setNetworkOk] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<'authorize' | 'revoke' | null>(null)
  const [issuerAddress, setIssuerAddress] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const issuerAddressError = walletAddressError(issuerAddress)
  const issuerAddressValid = Boolean(issuerAddress) && !issuerAddressError

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [info, onMonad] = await Promise.all([getRoleInfo(account), isOnMonadTestnet()])
      setRoleInfo(info)
      setNetworkOk(onMonad)
    } catch {
      setError('Roles could not be loaded. Check the RPC and contract address configuration.')
    } finally {
      setLoading(false)
    }
  }, [account])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function updateIssuer(action: 'authorize' | 'revoke') {
    if (!account || !roleInfo?.isOwner) return
    if (!isAddress(issuerAddress) || !issuerAddressValid) {
      setError(issuerAddressError ?? 'Enter a valid issuer wallet address.')
      return
    }
    setBusy(action)
    setMessage('')
    setError('')
    try {
      const result = await manageIssuer(issuerAddress, action, account)
      if (result.ok) {
        setMessage(result.message)
        setIssuerAddress('')
        await refresh()
      } else {
        setError(result.message)
      }
    } catch {
      setError('The issuer management transaction failed or was cancelled.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="role-panel">
      <div className="role-panel-header">
        <div>
          <p className="eyebrow">Wallet access</p>
          <h2>Roles & Access</h2>
        </div>
        <span className={`network-badge ${networkOk ? 'online' : ''}`}>
          {!account ? 'Public verifier' : networkOk ? 'Monad Testnet' : 'Wallet is not on Monad Testnet'}
        </span>
      </div>

      <p className="role-intro">
        Roles are determined by the smart contract, not by an application name. Verifiers do not need a wallet; they only need a Credential ID.
      </p>

      {loading && <p className="form-hint">Reading roles from the blockchain...</p>}
      {error && <p className="form-error role-message">{error}</p>}
      {message && <p className="role-success">{message}</p>}

      <div className="role-grid">
        <div className="role-card">
          <span className="role-card-label">Contract owner</span>
          <strong>{roleInfo ? shortAddress(roleInfo.owner) : '...'}</strong>
          <small>{roleInfo?.isOwner ? 'This wallet is the owner' : 'Manages the issuer list'}</small>
        </div>
        <div className="role-card">
          <span className="role-card-label">Issuer</span>
          <strong>{!account ? 'Guest' : roleInfo?.isIssuer ? 'Active' : 'Not active'}</strong>
          <small>{account ? 'Can issue credentials when authorized' : 'Connect a wallet to check'}</small>
        </div>
        <div className="role-card">
          <span className="role-card-label">Holder</span>
          <strong>{!account ? 'Guest' : roleInfo?.holderCredentialCount ? 'Yes' : 'No credentials yet'}</strong>
          <small>{account ? `${roleInfo?.holderCredentialCount ?? 0} credential(s) received by this wallet` : 'A holder is determined by the recipient address'}</small>
        </div>
        <div className="role-card">
          <span className="role-card-label">Verifier</span>
          <strong>Everyone</strong>
          <small>Public verification uses a Credential ID</small>
        </div>
      </div>

      {account && (
        <p className="role-account">Active wallet: <span className="mono">{account}</span></p>
      )}

      {account && roleInfo?.isOwner && (
        <form className="issuer-admin" onSubmit={(event) => event.preventDefault()}>
          <div>
            <p className="eyebrow">Owner only</p>
            <h3>Manage issuers</h3>
            <p className="form-hint">Authorize a company or HR wallet to issue credentials. Revoking an issuer stops issuance and makes that issuer\'s credentials invalid to verifiers.</p>
          </div>
          <input
            className="form-input"
            value={issuerAddress}
            onChange={(event) => setIssuerAddress(event.target.value)}
            placeholder="Issuer wallet address: 0x..."
            spellCheck={false}
          />
          {issuerAddress && issuerAddressError && <p className="form-error">{issuerAddressError}</p>}
          <div className="issuer-actions">
            <button className="form-submit" type="button" onClick={() => void updateIssuer('authorize')} disabled={busy !== null || !issuerAddressValid}>
              {busy === 'authorize' ? 'Processing...' : 'Authorize issuer'}
            </button>
            <button className="form-submit secondary" type="button" onClick={() => void updateIssuer('revoke')} disabled={busy !== null || !issuerAddressValid}>
              {busy === 'revoke' ? 'Processing...' : 'Revoke issuer'}
            </button>
          </div>
        </form>
      )}

      <div className="role-rules">
        <p><strong>Owner:</strong> the wallet returned by <code>owner()</code>; the owner manages issuers.</p>
        <p><strong>Issuer:</strong> a wallet listed in <code>authorizedIssuers</code>; issuers pay gas and create credentials.</p>
        <p><strong>Holder:</strong> the address recorded as the credential recipient; the holder does not need to connect during issuance.</p>
        <p><strong>Verifier:</strong> any visitor; no special role, database, or wallet is required.</p>
      </div>
    </section>
  )
}

import { useEffect, useRef, useState } from 'react'
import { executeAgent } from '../lib/contract'
import type { ExecuteResult } from '../lib/contract'
import { walletAddressError } from '../lib/address'

interface Message {
  role: 'user' | 'agent'
  text: string
  txHash?: string
  isError?: boolean
}

interface Props {
  account: `0x${string}` | null
}

type FormType = 'issue' | 'verify' | 'list' | 'revoke' | null
const CHAT_STORAGE_PREFIX = 'refter_chat_v2_'

const CHIPS: { icon: string; label: string; form: FormType }[] = [
  { icon: '📄', label: 'Issue Reference Letter', form: 'issue' },
  { icon: '🔍', label: 'Verify Credential ID', form: 'verify' },
  { icon: '🗂️', label: 'My Credentials', form: 'list' },
  { icon: '❌', label: 'Revoke Credential', form: 'revoke' },
]

function loadMessages(account: string | null): Message[] {
  try {
    const raw = localStorage.getItem(account ? `${CHAT_STORAGE_PREFIX}${account.toLowerCase()}` : `${CHAT_STORAGE_PREFIX}anon`)
    const parsed = raw ? (JSON.parse(raw) as Message[]) : null
    return parsed && Array.isArray(parsed) && parsed.length ? parsed : []
  } catch {
    return []
  }
}

const WELCOME: Message = {
  role: 'agent',
  text: 'Hello! RefTer lets issuers create credentials for holder wallets, holders view their credentials, and anyone verify someone else\'s credential by ID.',
}

export default function ChatAgent({ account }: Props) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = loadMessages(account)
    return saved.length ? saved : [WELCOME]
  })
  const [busy, setBusy] = useState(false)
  const [activeForm, setActiveForm] = useState<FormType>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  useEffect(() => {
    try {
      localStorage.setItem(
        account ? `${CHAT_STORAGE_PREFIX}${account.toLowerCase()}` : `${CHAT_STORAGE_PREFIX}anon`,
        JSON.stringify(messages),
      )
    } catch { /* ignore */ }
  }, [messages, account])

  async function runCommand(command: string, displayText: string) {
    setMessages((m) => [...m, { role: 'user', text: displayText }])
    setBusy(true)
    try {
      const res: ExecuteResult = await executeAgent(command, account ?? undefined)
      setMessages((m) => [
        ...m,
        { role: 'agent', text: res.message, txHash: res.txHash, isError: !res.ok },
      ])
    } catch {
      setMessages((m) => [...m, { role: 'agent', text: 'Something went wrong while processing the request.', isError: true }])
    } finally {
      setBusy(false)
    }
  }

  async function handleSubmit(formData: Record<string, string>) {
    let command = ''
    switch (activeForm) {
      case 'issue':
        command = `issue reference letter for ${formData.holderName} with address ${formData.holderAddress} as ${formData.jobTitle} from ${formData.period}`
        break
      case 'verify':
        command = `check credential ID ${formData.credentialId}`
        break
      case 'list':
        command = 'view my credentials'
        break
      case 'revoke':
        command = `revoke credential ID ${formData.credentialId}`
        break
    }
    if (!command) return
    const displayText = CHIPS.find((chip) => chip.form === activeForm)?.label ?? command
    setActiveForm(null)
    await runCommand(command, displayText)
  }

  return (
    <section className="chat-panel">
      <div className="chat-messages" id="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role} ${m.isError ? 'error' : ''}`}>
            {m.role === 'agent' && <div className="msg-agent-avatar">Ai</div>}
            <div className="bubble">
              <pre>{m.text}</pre>
              {m.txHash && (
                <a
                  className="tx-link"
                  href={`https://testnet.monadexplorer.com/tx/${m.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View transaction ↗
                </a>
              )}
            </div>
            {m.role === 'user' && (
              <div className="msg-user-avatar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#94a3b8"/></svg>
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="msg agent">
            <div className="msg-agent-avatar">Ai</div>
            <div className="bubble typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {activeForm && (
        <div className="form-overlay">
          <div className="form-card">
            <div className="form-header">
              <h3>{CHIPS.find((c) => c.form === activeForm)?.label}</h3>
              <button className="form-close" onClick={() => setActiveForm(null)}>✕</button>
            </div>
            {activeForm === 'issue' && <IssueForm onSubmit={handleSubmit} />}
            {activeForm === 'verify' && <VerifyForm onSubmit={handleSubmit} />}
            {activeForm === 'list' && (
              <div className="form-body">
                <p className="form-hint">This shows credentials whose holder address matches the connected wallet. To check someone else\'s credential, use a Credential ID in Verify.</p>
                <button className="form-submit" onClick={() => handleSubmit({})} disabled={busy}>
                  {busy ? 'Processing...' : 'View My Credentials'}
                </button>
              </div>
            )}
            {activeForm === 'revoke' && <RevokeForm onSubmit={handleSubmit} />}
          </div>
        </div>
      )}

      <div className="chips-bar">
        {CHIPS.map((c) => (
          <button
            key={c.label}
            className={`chip ${activeForm === c.form ? 'chip-active' : ''}`}
            onClick={() => setActiveForm(activeForm === c.form ? null : c.form)}
            disabled={busy}
          >
            <span style={{ opacity: 0.8 }}>{c.icon}</span> {c.label}
          </button>
        ))}
      </div>
    </section>
  )
}

// === Forms ===

function Field({ label, value, onChange, placeholder, type, maxLength }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  maxLength?: number
}) {
  return (
    <label className="form-field">
      <span className="form-label">{label}</span>
      <input
        className="form-input"
        type={type ?? 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </label>
  )
}

function SubmitButton({ busy, label }: { busy: boolean; label: string }) {
  return <button className="form-submit" type="submit" disabled={busy}>{busy ? 'Processing...' : label}</button>
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const YEARS = Array.from({ length: 30 }, (_, i) => String(2000 + i))

function MonthYearSelect({ label, month, year, onMonth, onYear }: {
  label: string
  month: string
  year: string
  onMonth: (v: string) => void
  onYear: (v: string) => void
}) {
  return (
    <label className="form-field">
      <span className="form-label">{label}</span>
      <div style={{ display: 'flex', gap: '8px' }}>
        <select className="form-input" value={month} onChange={(e) => onMonth(e.target.value)}>
          <option value="">Month</option>
          {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="form-input" value={year} onChange={(e) => onYear(e.target.value)}>
          <option value="">Year</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </label>
  )
}

function IssueForm({ onSubmit }: { onSubmit: (data: Record<string, string>) => void }) {
  const [holderName, setHolderName] = useState('')
  const [holderAddress, setHolderAddress] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [startMonth, setStartMonth] = useState('')
  const [startYear, setStartYear] = useState('')
  const [endMonth, setEndMonth] = useState('')
  const [endYear, setEndYear] = useState('')
  const [busy, setBusy] = useState(false)

  const period = `${startMonth} ${startYear} - ${endMonth} ${endYear}`
  const periodValid = startMonth && startYear && endMonth && endYear
  const addressError = walletAddressError(holderAddress, true)
  const canSubmit = holderName.trim() && holderAddress.trim() && jobTitle.trim() && periodValid && !addressError

  return (
    <form className="form-body" onSubmit={async (e) => {
      e.preventDefault()
      if (!canSubmit) return
      setBusy(true)
      await onSubmit({ holderName, holderAddress, jobTitle, period })
      setBusy(false)
    }}>
      <p className="form-hint">The issuer wallet is the issuer identity. A company name is not required for every credential; the issuer wallet must be authorized by the owner.</p>
      <Field label="Holder Name (label)" value={holderName} onChange={setHolderName} placeholder="Example: Taylor Morgan" />
      <Field label="Holder Wallet Address" value={holderAddress} onChange={setHolderAddress} placeholder="0x1234567890abcdef1234567890abcdef12345678" maxLength={42} />
      {holderAddress && addressError && <span className="form-error">{addressError}</span>}
      <Field label="Job Title" value={jobTitle} onChange={setJobTitle} placeholder="Example: QA Engineer" maxLength={22} />
      <span className="form-hint">The MVP stores compact metadata: job title plus work years must fit within 32 bytes.</span>
      <MonthYearSelect label="Employment Start" month={startMonth} year={startYear} onMonth={setStartMonth} onYear={setStartYear} />
      <MonthYearSelect label="Employment End" month={endMonth} year={endYear} onMonth={setEndMonth} onYear={setEndYear} />
      <SubmitButton busy={busy} label="Issue Reference Letter" />
    </form>
  )
}

function VerifyForm({ onSubmit }: { onSubmit: (data: Record<string, string>) => void }) {
  const [credentialId, setCredentialId] = useState('')
  const [busy, setBusy] = useState(false)
  const canSubmit = credentialId.trim()

  return (
    <form className="form-body" onSubmit={async (e) => {
      e.preventDefault()
      if (!canSubmit) return
      setBusy(true)
      await onSubmit({ credentialId })
      setBusy(false)
    }}>
      <p className="form-hint">You do not need a wallet to verify someone else\'s credential. Ask the holder for the Credential ID or QR code.</p>
      <Field label="Credential ID (number)" value={credentialId} onChange={setCredentialId} placeholder="Example: 1" type="number" />
      <SubmitButton busy={busy} label="Verify Credential" />
    </form>
  )
}

function RevokeForm({ onSubmit }: { onSubmit: (data: Record<string, string>) => void }) {
  const [credentialId, setCredentialId] = useState('')
  const [busy, setBusy] = useState(false)
  const canSubmit = credentialId.trim()

  return (
    <form className="form-body" onSubmit={async (e) => {
      e.preventDefault()
      if (!canSubmit) return
      setBusy(true)
      await onSubmit({ credentialId })
      setBusy(false)
    }}>
      <Field label="Credential ID (number)" value={credentialId} onChange={setCredentialId} placeholder="Example: 1" type="number" />
      <SubmitButton busy={busy} label="Revoke Credential" />
    </form>
  )
}

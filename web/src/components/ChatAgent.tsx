import { useEffect, useRef, useState } from 'react'
import { executeAgent } from '../lib/contract'
import type { ExecuteResult } from '../lib/contract'

interface Message {
  role: 'user' | 'agent'
  text: string
  txHash?: string
  isError?: boolean
}

interface Props {
  account: `0x${string}` | null
}

const SUGGESTIONS = [
  'Terbitkan sertifikat Workshop Monad 101 untuk 0x130F0257a1fCe5fb96355853f832CD2aD742d668',
  'Cek credential ID 1 valid gak?',
  'Kredensial saya apa aja?',
  'Apakah wallet saya issuer terotorisasi?',
]

export default function ChatAgent({ account }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'agent',
      text: 'Halo! Saya agent kredensial on-chain. Saya bisa terbitkan, verifikasi, dan cabut kredensial di blockchain Monad. Coba salah satu contoh di bawah, atau ketik sendiri.',
    },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  async function send(text?: string) {
    const userText = (text ?? input).trim()
    if (!userText || busy) return
    setMessages((m) => [...m, { role: 'user', text: userText }])
    setInput('')
    setBusy(true)
    const res: ExecuteResult = await executeAgent(userText, account ?? undefined)
    setMessages((m) => [
      ...m,
      { role: 'agent', text: res.message, txHash: res.txHash, isError: !res.ok },
    ])
    setBusy(false)
  }

  return (
    <section className="chat-panel">
      <div className="chat-messages" id="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role} ${m.isError ? 'error' : ''}`}>
            <div className="bubble">
              <pre>{m.text}</pre>
              {m.txHash && (
                <a
                  className="tx-link"
                  href={`https://testnet.monadexplorer.com/tx/${m.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Lihat transaksi di MonadExplorer ↗
                </a>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="msg agent">
            <div className="bubble typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="suggestions">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="chip" onClick={() => send(s)} disabled={busy}>
            {s.length > 60 ? s.slice(0, 60) + '…' : s}
          </button>
        ))}
      </div>

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <input
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Contoh: "terbitkan paklaring untuk 0x... posisi Senior Dev"'
          disabled={busy}
        />
        <button id="btn-send" type="submit" disabled={busy || !input.trim()}>
          Kirim
        </button>
      </form>
    </section>
  )
}

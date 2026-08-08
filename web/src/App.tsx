import { useState } from 'react'
import ChatAgent from './components/ChatAgent'
import MyCredentials from './components/MyCredentials'
import VerifyResult from './components/VerifyResult'
import WalletConnect from './components/WalletConnect'
import { monadTestnet } from './lib/client'
import './index.css'

type Tab = 'chat' | 'mine' | 'verify'

export default function App() {
  const [account, setAccount] = useState<`0x${string}` | null>(null)
  const [tab, setTab] = useState<Tab>('chat')

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">🤖</span>
          <div>
            <h1>OnChain Credentials Agent</h1>
            <p className="sub">Terbitkan & verifikasi kredensial anti-palsu di Monad</p>
          </div>
        </div>
        <div className="top-right">
          <span className="net-pill">Monad Testnet</span>
          <WalletConnect account={account} onConnect={setAccount} />
        </div>
      </header>

      <nav className="tabs" role="tablist">
        <button className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>
          💬 AI Agent
        </button>
        <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
          🗂️ Kredensial Saya
        </button>
        <button className={tab === 'verify' ? 'active' : ''} onClick={() => setTab('verify')}>
          🔍 Verifikasi
        </button>
      </nav>

      <main>
        {tab === 'chat' && <ChatAgent account={account} />}
        {tab === 'mine' && <MyCredentials account={account} />}
        {tab === 'verify' && <VerifyResult />}
      </main>

      <footer>
        <a href={`https://testnet.monadexplorer.com/address/${monadTestnet.id}`} target="_blank" rel="noreferrer">
          Kontrak: {monadTestnet.name}
        </a>
      </footer>
    </div>
  )
}

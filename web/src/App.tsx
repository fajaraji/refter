import { useState } from 'react'
import ChatAgent from './components/ChatAgent'
import MyCredentials from './components/MyCredentials'
import VerifyResult from './components/VerifyResult'
import WalletConnect from './components/WalletConnect'
import RolesPanel from './components/RolesPanel'
import './index.css'

type Tab = 'chat' | 'mine' | 'verify' | 'roles'
const TAB_ITEMS: { key: Tab; icon: string; label: string }[] = [
  { key: 'chat', icon: '✨', label: 'AI Agent' },
  { key: 'mine', icon: '🗂️', label: 'My Credentials' },
  { key: 'verify', icon: '🔍', label: 'Verify' },
  { key: 'roles', icon: '🔐', label: 'Roles' },
]

export default function App() {
  const [account, setAccount] = useState<`0x${string}` | null>(null)
  const [tab, setTab] = useState<Tab>('chat')

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo-icon">R</div>
          <h1>RefPer</h1>
        </div>
        <div className="top-right">
          <WalletConnect account={account} onConnect={setAccount} />
          <nav className="tabs">
            {TAB_ITEMS.map(({ key, icon, label }) => (
              <button
                key={key}
                className={`tab-btn ${tab === key ? 'active' : ''}`}
                onClick={() => setTab(key)}
              >
                {icon} <span className="tab-label">{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main>
        {tab === 'chat' && <ChatAgent key={account ?? 'anon'} account={account} />}
        {tab === 'mine' && (
          <div className="section-panel" style={{ padding: '20px' }}>
            <MyCredentials account={account} />
          </div>
        )}
        {tab === 'verify' && (
          <div className="section-panel" style={{ padding: '20px' }}>
            <VerifyResult />
          </div>
        )}
        {tab === 'roles' && (
          <div className="section-panel" style={{ padding: '20px' }}>
            <RolesPanel account={account} />
          </div>
        )}
      </main>
    </div>
  )
}

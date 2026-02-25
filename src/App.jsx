// src/App.jsx
// We're building a dashboard layout.
// Left column = WalletCard (connection + balance)
// Right column = Week 2 apps (Send, History, Token Checker)
// More components will be added here as we build them.

import WalletCard from './components/WalletCard'
import SendEth from './components/SendEth'
import './App.css'

export default function App() {
  return (
    <div className="app-layout">
      <div className="grid-bg" aria-hidden="true" />

      <header className="app-header">
        <span className="app-logo">◈ Web3 Dashboard</span>
        <span className="app-week">Week 2 — Sending + Reading Data</span>
      </header>

      <main className="app-main">
        {/* Left column — wallet connection */}
        <div className="col-left">
          <WalletCard />
        </div>

        {/* Right column — Week 2 apps stack here */}
        <div className="col-right">
          <SendEth />
          {/* TxHistory and TokenChecker will go here next */}
        </div>
      </main>
    </div>
  )
}
// src/App.jsx
import WalletCard    from './components/WalletCard'
import SendEth       from './components/SendEth'
import TxHistory     from './components/TxHistory'
import TokenChecker  from './components/TokenChecker'
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
        {/* Left column — wallet stays sticky while you scroll right column */}
        <div className="col-left">
          <WalletCard />
        </div>

        {/* Right column — all 3 Week 2 apps stacked */}
        <div className="col-right">
          <SendEth />
          <TxHistory />
          <TokenChecker />
        </div>
      </main>
    </div>
  )
}
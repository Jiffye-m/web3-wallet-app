// src/components/WalletCard.jsx
import { useWallet } from '../hooks/useWallet'
import './WalletCard.css'

export default function WalletCard() {
  const {
    shortAddress,
    address,
    balance,
    network,
    status,
    error,
    connect,
    disconnect,
    isConnected,
    isConnecting,
  } = useWallet()

  return (
    <div className="wallet-wrapper">
      {/* Background grid lines */}
      <div className="grid-bg" aria-hidden="true" />

      <div className="wallet-card">

        {/* Header */}
        <div className="card-header">
          <div className="logo-row">
            <span className="logo-dot" />
            <span className="logo-text">Web3 Wallet</span>
          </div>
          <div className={`status-badge status-${status}`}>
            <span className="status-dot" />
            {status === 'connected' ? 'Live' : status === 'connecting' ? 'Connecting' : 'Offline'}
          </div>
        </div>

        {/* Main Content */}
        {!isConnected ? (
          // ── DISCONNECTED STATE ──
          <div className="disconnected-state">
            <div className="hero-icon">
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M32 8L56 20V44L32 56L8 44V20L32 8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M32 8V56M8 20L32 32L56 20" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeDasharray="4 3"/>
              </svg>
            </div>
            <h1 className="hero-title">Connect Your Wallet</h1>
            <p className="hero-subtitle">
              Link MetaMask to view your address, balance, and network in real time.
            </p>

            {error && (
              <div className="error-box">
                <span className="error-icon">!</span>
                {error}
              </div>
            )}

            <button
              className="connect-btn"
              onClick={connect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <span className="spinner" />
                  Waiting for MetaMask...
                </>
              ) : (
                <>
                  <svg className="metamask-icon" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M32.958 1L19.888 10.44l2.44-5.77L32.958 1z" fill="#E17726"/>
                    <path d="M2.042 1l12.95 9.54-2.32-5.87L2.042 1z" fill="#E27625"/>
                    <path d="M28.17 23.44l-3.48 5.33 7.45 2.05 2.14-7.27-6.11-.11zM.77 23.55l2.12 7.27 7.44-2.05-3.47-5.33-6.09.11z" fill="#E27625"/>
                    <path d="M9.9 14.48l-2.08 3.14 7.4.33-.25-7.96-5.07 4.49zM25.1 14.48l-5.1-4.59-.17 8.06 7.4-.33-2.13-3.14z" fill="#E27625"/>
                    <path d="M10.33 28.77l4.47-2.17-3.85-3-.62 5.17zM20.2 26.6l4.46 2.17-.61-5.17-3.85 3z" fill="#E27625"/>
                  </svg>
                  Connect MetaMask
                </>
              )}
            </button>
          </div>
        ) : (
          // ── CONNECTED STATE ──
          <div className="connected-state">

            {/* Network badge */}
            <div className="network-row">
              <span className="network-pill">
                <span className="network-pulse" />
                {network}
              </span>
            </div>

            {/* Balance — the hero number */}
            <div className="balance-display">
              <span className="balance-label">ETH Balance</span>
              <div className="balance-amount">
                <span className="balance-number">{balance}</span>
                <span className="balance-unit">ETH</span>
              </div>
            </div>

            {/* Address */}
            <div className="address-block">
              <span className="address-label">Wallet Address</span>
              <div className="address-row">
                <span className="address-short">{shortAddress}</span>
                <button
                  className="copy-btn"
                  onClick={() => navigator.clipboard.writeText(address)}
                  title="Copy full address"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </button>
              </div>
              <span className="address-full">{address}</span>
            </div>

            {/* Stats row */}
            <div className="stats-row">
              <div className="stat">
                <span className="stat-label">Chain</span>
                <span className="stat-value">Sepolia</span>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <span className="stat-label">Protocol</span>
                <span className="stat-value">EIP-1559</span>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <span className="stat-label">Standard</span>
                <span className="stat-value">ERC-20</span>
              </div>
            </div>

            <button className="disconnect-btn" onClick={disconnect}>
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Footer note */}
      <p className="footer-note">
        Week 1 · Web3 Wallet Dashboard · Ethers.js + MetaMask
      </p>
    </div>
  )
}
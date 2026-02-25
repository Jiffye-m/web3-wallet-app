// src/components/TxHistory.jsx

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWalletStore } from '../store/walletStore'
import './TxHistory.css'

// ── Etherscan API URL ─────────────────────────────────────────
// VITE_ prefix is required by Vite to expose env variables to the browser.
// Without VITE_ prefix, the variable is undefined in the frontend.
// Never store secrets without the VITE_ prefix check — but API keys
// for public block explorers are fine to expose in frontend apps.
const ETHERSCAN_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY

// V2 API — uses chainid=11155111 for Sepolia instead of a subdomain
// Etherscan deprecated the old api-sepolia.etherscan.io/api endpoint
const ETHERSCAN_API = (address) =>
  `https://api.etherscan.io/v2/api?chainid=11155111&module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=${ETHERSCAN_KEY}`

// Helper: convert Wei string to ETH
const weiToEth = (wei) => parseFloat(ethers.formatEther(wei)).toFixed(6)

// Helper: shorten address for display
const short = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—'

// Helper: convert Unix timestamp → readable date
const formatDate = (timestamp) => {
  const date = new Date(parseInt(timestamp) * 1000)
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export default function TxHistory() {
  const address     = useWalletStore(s => s.address)
  const isConnected = useWalletStore(s => s.status === 'connected')

  const [txs, setTxs]         = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [fetched, setFetched] = useState(false)

  const fetchHistory = async () => {
    if (!address) return

    // Guard: if no API key in .env, show a helpful message
    if (!ETHERSCAN_KEY) {
      setError('Missing VITE_ETHERSCAN_API_KEY in .env file. See instructions above.')
      setFetched(true)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(ETHERSCAN_API(address))
      const data     = await response.json()

      if (data.status === '1') {
        setTxs(data.result)
      } else if (data.message === 'No transactions found') {
        setTxs([])
      } else if (data.result?.includes('Invalid API Key')) {
        setError('Invalid Etherscan API key. Check your .env file.')
      } else if (data.result?.includes('rate limit')) {
        setError('Rate limited. Wait a moment and refresh.')
      } else {
        setError('Could not fetch transactions. Try refreshing.')
      }

    } catch (err) {
      setError('Network error. Check your connection and try again.')
    } finally {
      setLoading(false)
      setFetched(true)
    }
  }

  useEffect(() => {
    if (address) fetchHistory()
    else { setTxs([]); setFetched(false); setError(null) }
  }, [address])

  return (
    <div className="tx-card">

      <div className="tx-header">
        <div className="tx-header-left">
          <span className="tx-icon">⇄</span>
          <span className="tx-title">Transaction History</span>
        </div>
        <div className="tx-header-right">
          {isConnected && (
            <span className="tx-count">
              {txs.length > 0 ? `${txs.length} txns` : 'No txns'}
            </span>
          )}
          {isConnected && (
            <button
              className="refresh-btn"
              onClick={fetchHistory}
              disabled={loading}
              title="Refresh"
            >
              <span className={loading ? 'spin' : ''}>↻</span>
            </button>
          )}
        </div>
      </div>

      <div className="tx-body">

        {!isConnected && (
          <div className="tx-empty">
            <span className="tx-empty-icon">⛓</span>
            <p>Connect your wallet to view transaction history.</p>
          </div>
        )}

        {isConnected && loading && (
          <div className="tx-loading">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="tx-skeleton">
                <div className="skeleton-left">
                  <div className="skeleton-line short" />
                  <div className="skeleton-line long" />
                </div>
                <div className="skeleton-right">
                  <div className="skeleton-line medium" />
                  <div className="skeleton-line short" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isConnected && !loading && error && (
          <div className="tx-error-box">
            <div className="error-icon-wrap">!</div>
            <div className="error-text">
              <span className="error-title">Could Not Load Transactions</span>
              <span className="error-body">{error}</span>
            </div>
          </div>
        )}

        {isConnected && !loading && !error && fetched && txs.length === 0 && (
          <div className="tx-empty">
            <span className="tx-empty-icon">📭</span>
            <p>No transactions found on Sepolia yet.</p>
            <p className="tx-empty-sub">Send some ETH using the form above to create your first one.</p>
          </div>
        )}

        {isConnected && !loading && txs.length > 0 && (
          <div className="tx-list">
            {txs.map((tx) => {
              const isSent     = tx.from.toLowerCase() === address.toLowerCase()
              const isFailed   = tx.isError === '1'
              const ethValue   = weiToEth(tx.value)
              const isContract = tx.input !== '0x'

              return (
                <div key={tx.hash} className={`tx-row ${isFailed ? 'tx-failed' : ''}`}>

                  <div className={`tx-direction ${isSent ? 'sent' : 'received'}`}>
                    <span className="tx-arrow">{isSent ? '↑' : '↓'}</span>
                    <div className="tx-direction-info">
                      <span className="tx-type">
                        {isFailed ? 'Failed' : isContract ? 'Contract' : isSent ? 'Sent' : 'Received'}
                      </span>
                      <span className="tx-date">{formatDate(tx.timeStamp)}</span>
                    </div>
                  </div>

                  <div className="tx-address-col">
                    <span className="tx-address-label">{isSent ? 'To' : 'From'}</span>
                    <span className="tx-address-value">
                      {short(isSent ? tx.to : tx.from)}
                    </span>
                  </div>

                  <div className="tx-value-col">
                    <span className={`tx-value ${isSent ? 'value-sent' : 'value-received'}`}>
                      {isSent ? '−' : '+'}{ethValue} ETH
                    </span>
                    <a
                      className="tx-link"
                      href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ↗ Etherscan
                    </a>
                  </div>

                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
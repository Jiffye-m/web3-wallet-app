// src/components/TxHistory.jsx
// ─────────────────────────────────────────────────────────────
// App 2 of Week 2: Transaction History Viewer
//
// New concepts introduced here:
//   - Etherscan API  → we can't get tx history from Ethers.js alone.
//                      Ethers reads current blockchain state (balances,
//                      blocks). For history we call Etherscan's REST API.
//   - fetch()        → standard browser fetch, same as your Node apps.
//   - Parsing tx data → understanding what each field in a tx means.
//
// Why not provider.getHistory()?
//   That method was removed in Ethers v6. The correct Web3 pattern
//   is to use a blockchain indexer (Etherscan, Alchemy, TheGraph).
//   Etherscan has a free API that returns tx history for any address.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWalletStore } from '../store/walletStore'
import './TxHistory.css'

// Etherscan Sepolia API — free, no key needed for low usage
// We fetch the last 10 transactions for the connected wallet
const ETHERSCAN_API = (address) =>
  `https://api-sepolia.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc`

// Helper: convert Wei string to ETH with 6 decimal places
const weiToEth = (wei) => parseFloat(ethers.formatEther(wei)).toFixed(6)

// Helper: shorten any address for display
const short = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—'

// Helper: convert Unix timestamp to readable date
const formatDate = (timestamp) => {
  const date = new Date(parseInt(timestamp) * 1000) // Unix is seconds, JS needs ms
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function TxHistory() {
  const address     = useWalletStore(s => s.address)
  const isConnected = useWalletStore(s => s.status === 'connected')

  // Local state for this component only
  const [txs, setTxs]       = useState([])       // array of transaction objects
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [fetched, setFetched] = useState(false)   // have we fetched at least once?

  // ── fetchHistory() ────────────────────────────────────────────
  // Calls Etherscan API and stores results in local state
  const fetchHistory = async () => {
    if (!address) return

    setLoading(true)
    setError(null)

    try {
      // fetch() is the same as in your React/Node apps — plain HTTP GET
      const response = await fetch(ETHERSCAN_API(address))
      const data     = await response.json()

      // Etherscan returns { status: "1", result: [...txs] } on success
      // status "0" means no transactions found or API error
      if (data.status === '1') {
        setTxs(data.result)
      } else if (data.message === 'No transactions found') {
        setTxs([]) // valid response — wallet just has no history yet
      } else {
        setError('Could not fetch transactions. Try again.')
      }

    } catch (err) {
      setError('Network error. Check your connection.')
    } finally {
      setLoading(false)
      setFetched(true)
    }
  }

  // Auto-fetch when wallet connects
  // useEffect with [address] dependency = runs whenever address changes
  // This is one of the few places useEffect makes sense — syncing with an external API
  useEffect(() => {
    if (address) fetchHistory()
    else { setTxs([]); setFetched(false) }
  }, [address])

  return (
    <div className="tx-card">

      {/* Header */}
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
              {/* Refresh icon — rotates when loading */}
              <span className={loading ? 'spin' : ''}>↻</span>
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="tx-body">

        {/* Not connected */}
        {!isConnected && (
          <div className="tx-empty">
            <span className="tx-empty-icon">⛓</span>
            <p>Connect your wallet to view transaction history.</p>
          </div>
        )}

        {/* Loading */}
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

        {/* Error */}
        {isConnected && !loading && error && (
          <div className="tx-error">
            <span>!</span> {error}
          </div>
        )}

        {/* Empty state */}
        {isConnected && !loading && !error && fetched && txs.length === 0 && (
          <div className="tx-empty">
            <span className="tx-empty-icon">📭</span>
            <p>No transactions found for this wallet on Sepolia.</p>
            <p className="tx-empty-sub">Send some ETH using the form to create your first transaction.</p>
          </div>
        )}

        {/* Transaction list */}
        {isConnected && !loading && txs.length > 0 && (
          <div className="tx-list">
            {txs.map((tx) => {
              // Determine if this tx was SENT or RECEIVED from our wallet's perspective
              const isSent     = tx.from.toLowerCase() === address.toLowerCase()
              const isFailed   = tx.isError === '1'
              const ethValue   = weiToEth(tx.value)
              const isContract = tx.input !== '0x' // has input data = contract call

              return (
                <div key={tx.hash} className={`tx-row ${isFailed ? 'tx-failed' : ''}`}>

                  {/* Direction indicator */}
                  <div className={`tx-direction ${isSent ? 'sent' : 'received'}`}>
                    <span className="tx-arrow">{isSent ? '↑' : '↓'}</span>
                    <div className="tx-direction-info">
                      <span className="tx-type">
                        {isFailed ? 'Failed' : isContract ? 'Contract' : isSent ? 'Sent' : 'Received'}
                      </span>
                      <span className="tx-date">{formatDate(tx.timeStamp)}</span>
                    </div>
                  </div>

                  {/* Address — show who you sent to or received from */}
                  <div className="tx-address-col">
                    <span className="tx-address-label">{isSent ? 'To' : 'From'}</span>
                    <span className="tx-address-value">
                      {short(isSent ? tx.to : tx.from)}
                    </span>
                  </div>

                  {/* Value + link */}
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
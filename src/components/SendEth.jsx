// src/components/SendEth.jsx

import { useState } from 'react'
import { ethers } from 'ethers'
import { useWalletStore } from '../store/walletStore'
import './SendEth.css'

const STAGES = { IDLE: 'idle', CONFIRMING: 'confirming', MINING: 'mining', SUCCESS: 'success', ERROR: 'error' }

// ── friendlyError() ───────────────────────────────────────────
// Ethers throws raw blockchain errors that are ugly and technical.
// This function catches the common ones and returns human-readable messages.
const friendlyError = (err) => {
  const msg = err.message || ''

  if (err.code === 4001)
    return null // user rejected — not an error, just go back to idle

  if (msg.includes('INSUFFICIENT_FUNDS') || msg.includes('insufficient funds'))
    return 'Insufficient funds. Remember gas fees are deducted on top of the amount you send.'

  if (msg.includes('invalid address') || msg.includes('bad address'))
    return 'Invalid recipient address. Double-check it starts with 0x and is 42 characters.'

  if (msg.includes('network') || msg.includes('could not detect'))
    return 'Network error. Check your MetaMask is on Sepolia and try again.'

  if (msg.includes('nonce'))
    return 'Transaction conflict. Try again in a few seconds.'

  if (msg.includes('gas'))
    return 'Gas estimation failed. The transaction may not be valid.'

  return 'Transaction failed. Please try again.'
}

export default function SendEth() {
  const isConnected = useWalletStore(s => s.status === 'connected')
  const balance     = useWalletStore(s => s.balance)

  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount]       = useState('')
  const [stage, setStage]         = useState(STAGES.IDLE)
  const [txHash, setTxHash]       = useState(null)
  const [errorMsg, setErrorMsg]   = useState(null)

  const validate = () => {
    if (!ethers.isAddress(toAddress))
      return 'Invalid address. Must start with 0x and be 42 characters long.'
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0)
      return 'Enter a valid amount greater than 0.'
    // Reserve 0.001 ETH for gas — never let user send the full balance
    if (amt > parseFloat(balance) - 0.001)
      return `Max sendable is ${(parseFloat(balance) - 0.001).toFixed(4)} ETH. The rest is reserved for gas.`
    return null
  }

  const sendEth = async () => {
    const validationError = validate()
    if (validationError) { setErrorMsg(validationError); return }

    setErrorMsg(null)

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer   = await provider.getSigner()

      setStage(STAGES.CONFIRMING)

      const tx = await signer.sendTransaction({
        to:    toAddress,
        value: ethers.parseEther(amount),
      })

      setStage(STAGES.MINING)

      const receipt = await tx.wait()
      setTxHash(receipt.hash)
      setStage(STAGES.SUCCESS)
      useWalletStore.getState().refreshBalance()

    } catch (err) {
      if (err.code === 4001) { setStage(STAGES.IDLE); return }
      setErrorMsg(friendlyError(err))
      setStage(STAGES.ERROR)
    }
  }

  const reset = () => {
    setToAddress(''); setAmount(''); setStage(STAGES.IDLE); setTxHash(null); setErrorMsg(null)
  }

  // MAX = balance minus 0.001 ETH reserved for gas
  const handleMax = () => {
    const max = (parseFloat(balance) - 0.001).toFixed(4)
    setAmount(max > 0 ? max : '0')
  }

  const isBusy = stage === STAGES.CONFIRMING || stage === STAGES.MINING

  return (
    <div className="send-card">
      <div className="send-header">
        <div className="send-header-left">
          <span className="send-icon">↗</span>
          <span className="send-title">Send ETH</span>
        </div>
        {isConnected && (
          <span className="send-balance">Balance: {balance} ETH</span>
        )}
      </div>

      <div className="send-body">

        {stage === STAGES.SUCCESS ? (
          <div className="success-state">
            <div className="success-icon">✓</div>
            <p className="success-title">Transaction Sent!</p>
            <p className="success-sub">Confirmed on Sepolia testnet.</p>
            <a
              className="etherscan-link"
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Etherscan ↗
            </a>
            <p className="tx-hash-label">Transaction Hash</p>
            <p className="tx-hash-value">{txHash}</p>
            <button className="send-btn" onClick={reset}>Send Another</button>
          </div>

        ) : (
          <>
            <div className="field">
              <label className="field-label">Recipient Address</label>
              <input
                className={`field-input ${errorMsg && !ethers.isAddress(toAddress) ? 'input-error' : ''}`}
                type="text"
                placeholder="0x..."
                value={toAddress}
                onChange={e => { setToAddress(e.target.value); setErrorMsg(null) }}
                disabled={isBusy}
                spellCheck={false}
              />
            </div>

            <div className="field">
              <label className="field-label">
                Amount (ETH)
                <span className="field-hint">— keep 0.001 for gas</span>
              </label>
              <div className="amount-row">
                <input
                  className="field-input"
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.001"
                  value={amount}
                  onChange={e => { setAmount(e.target.value); setErrorMsg(null) }}
                  disabled={isBusy}
                />
                <button className="max-btn" onClick={handleMax} disabled={isBusy || !balance}>
                  MAX
                </button>
              </div>
            </div>

            {/* ── Error box — clean, human readable ── */}
            {errorMsg && (
              <div className="send-error">
                <div className="error-icon-wrap">!</div>
                <div className="error-text">
                  <span className="error-title">Transaction Error</span>
                  <span className="error-body">{errorMsg}</span>
                </div>
              </div>
            )}

            {stage === STAGES.CONFIRMING && (
              <div className="status-msg confirming">
                <span className="status-spinner" />
                <span>Waiting for MetaMask confirmation...</span>
              </div>
            )}

            {stage === STAGES.MINING && (
              <div className="status-msg mining">
                <span className="status-spinner" />
                <span>Broadcast. Waiting for block confirmation...</span>
              </div>
            )}

            <button
              className="send-btn"
              onClick={sendEth}
              disabled={isBusy || !isConnected || !toAddress || !amount}
            >
              {isBusy
                ? <><span className="status-spinner white" /> Processing...</>
                : 'Send ETH'
              }
            </button>

            {!isConnected && (
              <p className="send-warning">Connect your wallet first.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
// src/components/TokenChecker.jsx
// ─────────────────────────────────────────────────────────────
// App 3 of Week 2: ERC20 Token Balance Checker
//
// New concepts introduced here:
//   - ethers.Contract()    → creates an instance to talk to a deployed contract
//   - ERC20 ABI            → the standard interface every ERC20 token shares
//   - contract.balanceOf() → reads token balance for any address
//   - contract.symbol()    → reads the token's ticker (USDC, LINK, etc.)
//   - contract.decimals()  → reads how many decimal places the token uses
//   - ethers.formatUnits() → like formatEther but for any decimal count
//
// Key insight:
//   Every ERC20 token is a smart contract deployed at a specific address.
//   They all share the same ABI (same function names/signatures).
//   So you can check ANY token's balance with the same code —
//   just swap the contract address.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react'
import { ethers } from 'ethers'
import { useWalletStore } from '../store/walletStore'
import './TokenChecker.css'

// ── Minimal ERC20 ABI ─────────────────────────────────────────
// We only need 3 functions for this component.
// A full ERC20 ABI has ~10 functions — we only include what we call.
// This is a common pattern: use minimal ABIs to keep code clean.
const ERC20_ABI = [
  // balanceOf: given a wallet address, returns token balance in smallest units
  'function balanceOf(address account) view returns (uint256)',
  // symbol: returns the ticker e.g. "USDC", "LINK", "DAI"
  'function symbol() view returns (string)',
  // decimals: returns how many decimal places e.g. USDC=6, ETH=18, LINK=18
  'function decimals() view returns (uint8)',
  // name: returns the full name e.g. "USD Coin"
  'function name() view returns (string)',
]

// ── Pre-loaded Sepolia test tokens ────────────────────────────
// These are real ERC20 contracts deployed on Sepolia testnet.
// Users can pick one or paste any contract address manually.
const PRESET_TOKENS = [
  {
    name: 'Chainlink',
    symbol: 'LINK',
    address: '0x779877A7B0D9E8603169DdbD7836e478b462478b',
  },
  {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    address: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
  },
  {
    name: 'USD Coin (Test)',
    symbol: 'USDC',
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  },
]

export default function TokenChecker() {
  const address     = useWalletStore(s => s.address)
  const isConnected = useWalletStore(s => s.status === 'connected')

  const [contractAddress, setContractAddress] = useState('')
  const [walletAddress, setWalletAddress]     = useState('')
  const [result, setResult]                   = useState(null)   // token data on success
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState(null)

  // ── checkBalance() ───────────────────────────────────────────
  const checkBalance = async () => {
    const contractAddr = contractAddress.trim()
    const checkAddr    = walletAddress.trim() || address // default to connected wallet

    // Validate both addresses
    if (!ethers.isAddress(contractAddr)) {
      setError('Invalid token contract address.')
      return
    }
    if (!ethers.isAddress(checkAddr)) {
      setError('Invalid wallet address to check.')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // 1. Create a Provider — we only need to READ, so no signer needed
      const provider = new ethers.BrowserProvider(window.ethereum)

      // 2. Create a Contract instance
      //    ethers.Contract(address, abi, providerOrSigner)
      //    - address: where the contract lives on the blockchain
      //    - abi: tells Ethers what functions exist and their signatures
      //    - provider: read-only connection (no signer needed for view functions)
      const contract = new ethers.Contract(contractAddr, ERC20_ABI, provider)

      // 3. Call contract functions
      //    These are all "view" functions — they READ state, don't change it.
      //    So they're FREE and instant (no gas, no MetaMask popup).
      //    We call them all in parallel with Promise.all for speed.
      const [rawBalance, symbol, decimals, name] = await Promise.all([
        contract.balanceOf(checkAddr),   // returns BigInt in smallest units
        contract.symbol(),               // returns string e.g. "LINK"
        contract.decimals(),             // returns number e.g. 18
        contract.name(),                 // returns string e.g. "ChainLink Token"
      ])

      // 4. Format the balance
      //    formatUnits(value, decimals) — like formatEther but flexible
      //    USDC has 6 decimals, LINK has 18 — formatUnits handles both
      const balance = ethers.formatUnits(rawBalance, decimals)

      setResult({
        balance:  parseFloat(balance).toLocaleString('en-US', { maximumFractionDigits: 6 }),
        rawBalance: rawBalance.toString(),
        symbol,
        name,
        decimals: decimals.toString(),
        contractAddress: contractAddr,
        checkedAddress: checkAddr,
        hasBalance: parseFloat(balance) > 0,
      })

    } catch (err) {
      if (err.message?.includes('BAD_DATA') || err.message?.includes('could not decode')) {
        setError('This address is not a valid ERC20 token contract.')
      } else if (err.message?.includes('CALL_EXCEPTION')) {
        setError('Contract call failed. The address may not be an ERC20 token.')
      } else {
        setError('Could not fetch token data. Check the contract address.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ── Fill a preset token into the input ───────────────────────
  const selectPreset = (token) => {
    setContractAddress(token.address)
    setResult(null)
    setError(null)
  }

  // ── Use connected wallet address ──────────────────────────────
  const useMyWallet = () => {
    setWalletAddress(address || '')
    setError(null)
  }

  return (
    <div className="token-card">

      {/* Header */}
      <div className="token-header">
        <div className="token-header-left">
          <span className="token-icon">◎</span>
          <span className="token-title">Token Balance Checker</span>
        </div>
        <span className="token-badge">ERC-20</span>
      </div>

      <div className="token-body">

        {/* Preset tokens */}
        <div className="presets-section">
          <span className="presets-label">Quick select (Sepolia)</span>
          <div className="presets-row">
            {PRESET_TOKENS.map(token => (
              <button
                key={token.address}
                className={`preset-btn ${contractAddress === token.address ? 'active' : ''}`}
                onClick={() => selectPreset(token)}
              >
                {token.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Token contract address */}
        <div className="field">
          <label className="field-label">Token Contract Address</label>
          <input
            className="field-input"
            type="text"
            placeholder="0x... (ERC20 contract address)"
            value={contractAddress}
            onChange={e => { setContractAddress(e.target.value); setResult(null); setError(null) }}
            disabled={loading}
            spellCheck={false}
          />
        </div>

        {/* Wallet address to check */}
        <div className="field">
          <label className="field-label">
            Wallet Address to Check
            <span className="field-optional"> — leave empty to use connected wallet</span>
          </label>
          <div className="amount-row">
            <input
              className="field-input"
              type="text"
              placeholder="0x... (or leave empty)"
              value={walletAddress}
              onChange={e => { setWalletAddress(e.target.value); setError(null) }}
              disabled={loading}
              spellCheck={false}
            />
            {isConnected && (
              <button className="mine-btn" onClick={useMyWallet} disabled={loading}>
                Mine
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="token-error">
            <div className="error-icon-wrap">!</div>
            <div className="error-text">
              <span className="error-title">Error</span>
              <span className="error-body">{error}</span>
            </div>
          </div>
        )}

        {/* Check button */}
        <button
          className="check-btn"
          onClick={checkBalance}
          disabled={loading || !contractAddress}
        >
          {loading ? (
            <><span className="status-spinner white" /> Querying Contract...</>
          ) : (
            'Check Balance'
          )}
        </button>

        {/* Result */}
        {result && (
          <div className="token-result">

            <div className="result-header">
              <div className="token-name-row">
                <span className="token-symbol-badge">{result.symbol}</span>
                <span className="token-full-name">{result.name}</span>
              </div>
              <span className={`balance-status ${result.hasBalance ? 'has-balance' : 'no-balance'}`}>
                {result.hasBalance ? 'Has tokens' : 'Empty'}
              </span>
            </div>

            {/* Big balance number */}
            <div className="result-balance">
              <span className="result-amount">{result.balance}</span>
              <span className="result-symbol">{result.symbol}</span>
            </div>

            {/* Metadata grid */}
            <div className="result-meta">
              <div className="meta-item">
                <span className="meta-label">Decimals</span>
                <span className="meta-value">{result.decimals}</span>
              </div>
              <div className="meta-divider" />
              <div className="meta-item">
                <span className="meta-label">Wallet</span>
                <span className="meta-value">
                  {result.checkedAddress.slice(0,6)}...{result.checkedAddress.slice(-4)}
                </span>
              </div>
              <div className="meta-divider" />
              <div className="meta-item">
                <span className="meta-label">Contract</span>
                <a
                  className="meta-link"
                  href={`https://sepolia.etherscan.io/token/${result.contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View ↗
                </a>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
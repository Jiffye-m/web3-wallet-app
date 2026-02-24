// src/store/walletStore.js
// ─────────────────────────────────────────────────────────────
// This is our GLOBAL wallet store using Zustand.
//
// Think of it like a single object that lives outside React.
// Any component in the entire app can READ from it or CALL
// its actions — and they all see the same data.
//
// Zustand syntax reminder:
//   create((set, get) => ({ ... }))
//   - set()  → updates the store state
//   - get()  → reads the current store state from inside the store
// ─────────────────────────────────────────────────────────────

import { create } from 'zustand'
import { ethers } from 'ethers'

// A helper map so we show readable names instead of raw chain IDs
const NETWORK_NAMES = {
  1:        'Ethereum Mainnet',
  11155111: 'Sepolia Testnet',
  137:      'Polygon',
  80001:    'Mumbai Testnet',
}

// ── The store ──────────────────────────────────────────────────
export const useWalletStore = create((set, get) => ({

  // ── STATE ────────────────────────────────────────────────────
  // These are the values any component can read

  address:   null,   // Full wallet address e.g. "0x1234...abcd"
  balance:   null,   // ETH balance as a string e.g. "0.0500"
  network:   null,   // Human readable network name e.g. "Sepolia Testnet"
  chainId:   null,   // Raw chain ID number e.g. 11155111
  status:    'idle', // 'idle' | 'connecting' | 'connected' | 'error'
  error:     null,   // Error message string or null


  // ── DERIVED (computed from state) ────────────────────────────
  // shortAddress is not stored — we just compute it when needed.
  // We expose a getter function for it instead.
  getShortAddress: () => {
    const { address } = get()
    if (!address) return null
    // Slice the address:  "0x0879...aF38"
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  },


  // ── ACTIONS ──────────────────────────────────────────────────
  // These are the functions components call to trigger changes

  // ── connect() ────────────────────────────────────────────────
  // Called when user clicks "Connect MetaMask"
  connect: async () => {

    // 1. Check MetaMask is installed
    //    window.ethereum is injected by MetaMask into the browser
    if (!window.ethereum) {
      set({ error: 'MetaMask not found. Install it at metamask.io', status: 'error' })
      return
    }

    // 2. Set status to 'connecting' so the button shows a spinner
    set({ status: 'connecting', error: null })

    try {
      // 3. Create a Provider
      //    A Provider is our READ-ONLY connection to the blockchain.
      //    BrowserProvider wraps MetaMask specifically.
      const provider = new ethers.BrowserProvider(window.ethereum)

      // 4. Request account access
      //    This line triggers the MetaMask popup asking user to connect.
      //    It returns an array of account addresses the user approved.
      await provider.send('eth_requestAccounts', [])

      // 5. Get the Signer
      //    A Signer is a Provider that CAN sign transactions.
      //    Think: Provider = read, Signer = read + write
      const signer = await provider.getSigner()

      // 6. Get wallet address from the signer
      const address = await signer.getAddress()

      // 7. Get ETH balance
      //    getBalance() returns the balance in WEI (the smallest unit).
      //    1 ETH = 1,000,000,000,000,000,000 Wei
      //    formatEther() converts Wei → ETH as a readable string
      const rawBalance = await provider.getBalance(address)
      const balance = parseFloat(ethers.formatEther(rawBalance)).toFixed(4)

      // 8. Get network info
      const networkInfo = await provider.getNetwork()
      const chainId = Number(networkInfo.chainId)
      const network = NETWORK_NAMES[chainId] || `Chain ID: ${chainId}`

      // 9. Update the store with everything we fetched
      set({ address, balance, network, chainId, status: 'connected' })

      // 10. Start listening for MetaMask events
      //     This is what makes the UI "live" — it auto-updates
      //     when the user changes account or network in MetaMask
      get().startListeners()

    } catch (err) {
      // Code 4001 = user clicked "Reject" in MetaMask popup
      const message = err.code === 4001
        ? 'Connection rejected. Please try again.'
        : (err.message || 'Something went wrong.')

      set({ status: 'error', error: message })
    }
  },


  // ── disconnect() ─────────────────────────────────────────────
  // Resets everything back to the initial idle state.
  // Note: MetaMask doesn't have a true "disconnect" API,
  // so we just clear our own store state.
  disconnect: () => {
    // Remove the event listeners we added in startListeners()
    get().stopListeners()

    set({
      address: null,
      balance: null,
      network: null,
      chainId: null,
      status:  'idle',
      error:   null,
    })
  },


  // ── refreshBalance() ─────────────────────────────────────────
  // Fetches the latest balance for the current address.
  // Called automatically when accounts or network change.
  refreshBalance: async () => {
    const { address } = get()
    if (!address) return

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const rawBalance = await provider.getBalance(address)
      const balance = parseFloat(ethers.formatEther(rawBalance)).toFixed(4)
      set({ balance })
    } catch {
      // silently fail — balance just won't update
    }
  },


  // ── startListeners() ─────────────────────────────────────────
  // Attaches event listeners to MetaMask (window.ethereum).
  // MetaMask fires these events automatically when things change.
  startListeners: () => {

    // EVENT 1: accountsChanged
    // Fires when the user switches accounts in MetaMask.
    // MetaMask passes an array of the new accounts.
    const onAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        // User disconnected all accounts from MetaMask side
        get().disconnect()
      } else {
        // User switched to a different account
        // Update the address and refresh the balance
        set({ address: accounts[0] })
        get().refreshBalance()
      }
    }

    // EVENT 2: chainChanged
    // Fires when the user switches networks in MetaMask.
    // MetaMask passes the new chainId as a HEX string e.g. "0xaa36a7"
    const onChainChanged = (hexChainId) => {
      const chainId = parseInt(hexChainId, 16) // convert hex → number
      const network = NETWORK_NAMES[chainId] || `Chain ID: ${chainId}`
      set({ chainId, network })
      get().refreshBalance()
    }

    // Register the listeners on window.ethereum
    window.ethereum.on('accountsChanged', onAccountsChanged)
    window.ethereum.on('chainChanged',    onChainChanged)

    // Store references so we can remove them later in stopListeners()
    // We attach them to the store object directly (not to state)
    get()._listeners = { onAccountsChanged, onChainChanged }
  },


  // ── stopListeners() ──────────────────────────────────────────
  // Removes the MetaMask event listeners.
  // Important: always clean up listeners to avoid memory leaks.
  stopListeners: () => {
    const listeners = get()._listeners
    if (!listeners) return

    window.ethereum.removeListener('accountsChanged', listeners.onAccountsChanged)
    window.ethereum.removeListener('chainChanged',    listeners.onChainChanged)
    get()._listeners = null
  },


  // Internal — not used by components
  _listeners: null,

}))
// src/hooks/useWallet.js
import { useState, useCallback } from 'react'
import { ethers } from 'ethers'

// Network names map
const NETWORKS = {
  1: 'Ethereum Mainnet',
  11155111: 'Sepolia Testnet',
  137: 'Polygon',
  80001: 'Mumbai Testnet',
}

export function useWallet() {
  const [address, setAddress] = useState(null)
  const [balance, setBalance] = useState(null)
  const [network, setNetwork] = useState(null)
  const [status, setStatus] = useState('idle') // idle | connecting | connected | error
  const [error, setError] = useState(null)

  const connect = useCallback(async () => {
    // 1. Check MetaMask is installed
    if (!window.ethereum) {
      setError('MetaMask not found. Please install it at metamask.io')
      setStatus('error')
      return
    }

    try {
      setStatus('connecting')
      setError(null)

      // 2. Create provider from MetaMask
      const provider = new ethers.BrowserProvider(window.ethereum)

      // 3. Request user to connect — this triggers the MetaMask popup
      await provider.send('eth_requestAccounts', [])

      // 4. Get signer (the connected account)
      const signer = await provider.getSigner()

      // 5. Get wallet address
      const walletAddress = await signer.getAddress()

      // 6. Get ETH balance (returned in Wei, convert to ETH)
      const rawBalance = await provider.getBalance(walletAddress)
      const ethBalance = ethers.formatEther(rawBalance)

      // 7. Get network info
      const networkInfo = await provider.getNetwork()
      const chainId = Number(networkInfo.chainId)
      const networkName = NETWORKS[chainId] || `Chain ID: ${chainId}`

      // 8. Update state
      setAddress(walletAddress)
      setBalance(parseFloat(ethBalance).toFixed(4))
      setNetwork(networkName)
      setStatus('connected')

    } catch (err) {
      // User rejected the connection
      if (err.code === 4001) {
        setError('Connection rejected. Please try again.')
      } else {
        setError(err.message || 'Something went wrong')
      }
      setStatus('error')
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
    setBalance(null)
    setNetwork(null)
    setStatus('idle')
    setError(null)
  }, [])

  // Helper: shorten address for display  e.g. 0x1234...abcd
  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null

  return {
    address,
    shortAddress,
    balance,
    network,
    status,
    error,
    connect,
    disconnect,
    isConnected: status === 'connected',
    isConnecting: status === 'connecting',
  }
}
import React, { useState, useEffect } from 'react';
import contractService from '../services/contractService';
import apiService from '../services/apiService';
import { TOKENS } from '../config/contracts';

const Scanner = () => {
  const [connected, setConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [chainId, setChainId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');
  
  // Form state
  const [contractAddress, setContractAddress] = useState('');
  const [targetChain, setTargetChain] = useState('137');
  const [scanType, setScanType] = useState('basic');
  const [paymentToken, setPaymentToken] = useState('0x0000000000000000000000000000000000000000');
  
  // Stats
  const [stats, setStats] = useState(null);

  useEffect(() => {
    checkConnection();
    loadStats();
  }, []);

  const checkConnection = async () => {
    try {
      if (window.ethereum && window.ethereum.selectedAddress) {
        await connectWallet();
      }
    } catch (error) {
      console.error('Auto-connect failed:', error);
    }
  };

  const loadStats = async () => {
    try {
      const platformStats = await apiService.getStats();
      setStats(platformStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const connectWallet = async () => {
    try {
      setError('');
      const result = await contractService.connect();
      setConnected(true);
      setUserAddress(result.address);
      setChainId(result.chainId);
      
      if (result.chainId !== 137) {
        setError('Please switch to Polygon network');
        await contractService.switchToPolygon();
      }
    } catch (error) {
      setError(error.message);
      console.error('Connection error:', error);
    }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    setError('');
    setScanResult(null);
    setLoading(true);

    try {
      // Purchase scan
      const purchaseResult = await contractService.purchaseScan(
        contractAddress,
        parseInt(targetChain),
        scanType === 'full',
        paymentToken
      );

      // Wait for scan results
      const scanData = await apiService.checkScanResult(purchaseResult.scanId);
      setScanResult(scanData);
      
      // Reload stats
      loadStats();
      
    } catch (error) {
      setError(error.message);
      console.error('Scan error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'LOW': return 'text-green-500';
      case 'MEDIUM': return 'text-yellow-500';
      case 'HIGH': return 'text-orange-500';
      case 'CRITICAL': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">🔍 MemeScanner</h1>
            <div>
              {connected ? (
                <div className="flex items-center space-x-4">
                  <span className="text-green-400">● Connected</span>
                  <span className="text-sm bg-gray-700 px-3 py-1 rounded">
                    {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                  </span>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Scanner Form */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-6">Scan Contract</h2>
              
              {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleScan} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Contract Address
                  </label>
                  <input
                    type="text"
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Target Chain
                  </label>
                  <select
                    value={targetChain}
                    onChange={(e) => setTargetChain(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="137">Polygon</option>
                    <option value="1">Ethereum</option>
                    <option value="56">BSC</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Scan Type
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setScanType('basic')}
                      className={`p-4 rounded border ${
                        scanType === 'basic'
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="font-semibold">Basic Scan</div>
                      <div className="text-sm text-gray-400">$1.00</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanType('full')}
                      className={`p-4 rounded border ${
                        scanType === 'full'
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <div className="font-semibold">Full Scan</div>
                      <div className="text-sm text-gray-400">$2.50</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Payment Token
                  </label>
                  <select
                    value={paymentToken}
                    onChange={(e) => setPaymentToken(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    {chainId === 137 && Object.entries(TOKENS[137]).map(([key, token]) => (
                      <option key={key} value={token.address}>
                        {token.symbol}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!connected || loading}
                  className={`w-full py-3 rounded font-semibold ${
                    connected && !loading
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-600 cursor-not-allowed'
                  }`}
                >
                  {loading ? 'Processing...' : 'Start Scan'}
                </button>
              </form>
            </div>

            {/* Scan Result */}
            {scanResult && (
              <div className="bg-gray-800 rounded-lg p-6 mt-6">
                <h2 className="text-xl font-semibold mb-4">Scan Results</h2>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-700 rounded">
                    <span>Risk Level</span>
                    <span className={`font-bold text-xl ${getRiskColor(scanResult.report.risk_level)}`}>
                      {scanResult.report.risk_level}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-gray-700 rounded">
                    <span>Risk Score</span>
                    <span className="font-bold">{scanResult.report.risk_score}/100</span>
                  </div>

                  {scanResult.report.warnings && scanResult.report.warnings.length > 0 && (
                    <div className="p-4 bg-gray-700 rounded">
                      <h3 className="font-semibold mb-2">Warnings</h3>
                      <ul className="list-disc list-inside space-y-1">
                        {scanResult.report.warnings.map((warning, index) => (
                          <li key={index} className="text-yellow-400">{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {scanResult.report.scan_type === 'full' && (
                    <>
                      {scanResult.report.token_info && (
                        <div className="p-4 bg-gray-700 rounded">
                          <h3 className="font-semibold mb-2">Token Info</h3>
                          <div className="space-y-1 text-sm">
                            <div>Name: {scanResult.report.token_info.name}</div>
                            <div>Symbol: {scanResult.report.token_info.symbol}</div>
                            <div>Decimals: {scanResult.report.token_info.decimals}</div>
                          </div>
                        </div>
                      )}

                      {scanResult.report.liquidity && (
                        <div className="p-4 bg-gray-700 rounded">
                          <h3 className="font-semibold mb-2">Liquidity</h3>
                          <div className="space-y-1 text-sm">
                            <div>Total: ${scanResult.report.liquidity.total_liquidity_usd.toLocaleString()}</div>
                            <div>Locked: {scanResult.report.liquidity.liquidity_locked ? 'Yes' : 'No'}</div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Stats Sidebar */}
          <div>
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Platform Stats</h2>
              
              {stats ? (
                <div className="space-y-4">
                  <div className="text-center p-4 bg-gray-700 rounded">
                    <div className="text-3xl font-bold">{stats.total_scans}</div>
                    <div className="text-sm text-gray-400">Total Scans</div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Risk Distribution</h3>
                    <div className="space-y-2">
                      {Object.entries(stats.risk_distribution).map(([level, count]) => (
                        <div key={level} className="flex justify-between items-center">
                          <span className={getRiskColor(level)}>{level}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400">Loading stats...</div>
              )}
            </div>

            <div className="bg-gray-800 rounded-lg p-6 mt-6">
              <h3 className="font-semibold mb-3">How it works</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-400">
                <li>Connect your wallet</li>
                <li>Enter contract address</li>
                <li>Choose scan type</li>
                <li>Pay with MATIC, USDT or USDC</li>
                <li>Get instant security report</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scanner;
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, Shield, AlertTriangle, DollarSign, Users, Activity, Clock, ChevronRight, Zap, Target, ExternalLink, Copy, Check } from 'lucide-react';
import { ethers } from "ethers";

// Configuración desde variables de entorno
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
const API_KEY = import.meta.env.VITE_API_KEY || '';

// ABIs
const CONTRACT_ABI = [
  "function purchaseBasicScan(address,uint256,address,address) returns (uint256)",
  "function purchaseFullScan(address,uint256,address,address) returns (uint256)",
  "function BASIC_SCAN_PRICE_USD() view returns (uint256)",
  "function FULL_SCAN_PRICE_USD() view returns (uint256)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

// Configuración de redes y tokens
const NETWORKS = {
  1: { 
    name: 'Ethereum', 
    symbol: 'ETH', 
    rpc: import.meta.env.VITE_ETH_RPC || 'https://mainnet.infura.io/v3/YOUR_KEY',
    explorer: 'https://etherscan.io',
    tokens: {
      usdc: import.meta.env.VITE_ETH_USDC_ADDRESS || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      usdt: import.meta.env.VITE_ETH_USDT_ADDRESS || '0xdAC17F958D2ee523a2206206994597C13D831ec7'
    }
  },
  56: { 
    name: 'BNB Chain', 
    symbol: 'BNB', 
    rpc: import.meta.env.VITE_BSC_RPC || 'https://bsc-dataseed.binance.org',
    explorer: 'https://bscscan.com',
    tokens: {
      usdc: import.meta.env.VITE_BSC_USDC_ADDRESS || '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      usdt: import.meta.env.VITE_BSC_USDT_ADDRESS || '0x55d398326f99059fF775485246999027B3197955'
    }
  },
  137: { 
    name: 'Polygon', 
    symbol: 'MATIC', 
    rpc: import.meta.env.VITE_POLYGON_RPC || 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    tokens: {
      usdc: import.meta.env.VITE_POLYGON_USDC_ADDRESS || '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      usdt: import.meta.env.VITE_POLYGON_USDT_ADDRESS || '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
    }
  },
  42161: { 
    name: 'Arbitrum', 
    symbol: 'ETH', 
    rpc: import.meta.env.VITE_ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    tokens: {
      usdc: import.meta.env.VITE_ARBITRUM_USDC_ADDRESS || '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      usdt: import.meta.env.VITE_ARBITRUM_USDT_ADDRESS || '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    }
  }
};

// Headers con API Key
const getApiHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }
  
  return headers;
};

function App() {
  const [address, setAddress] = useState('');
  const [selectedChainId, setSelectedChainId] = useState('137');
  const [walletChainId, setWalletChainId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [trendingTokens, setTrendingTokens] = useState([]);
  const [activeTab, setActiveTab] = useState('scanner');
  const [scanHistory, setScanHistory] = useState([]);
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [contractPrices, setContractPrices] = useState({ basic: '1.00', full: '2.50' });
  const [networkError, setNetworkError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [selectedPaymentToken, setSelectedPaymentToken] = useState('usdc');

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
    const interval = setInterval(loadCryptoPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cargar balance cuando se conecta wallet
  useEffect(() => {
    if (wallet && walletChainId) {
      loadUserData();
    }
  }, [wallet, walletChainId]);

  const loadInitialData = async () => {
    await Promise.all([
      loadCryptoPrices(),
      loadTrendingTokens(),
      loadScanHistory()
    ]);
  };

  const loadCryptoPrices = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/crypto-prices`, {
        headers: getApiHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setCryptoPrices(data.data || data);
      }
    } catch (error) {
      console.error('Error loading crypto prices:', error);
    }
  };

  const loadTrendingTokens = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/trending`, {
        headers: getApiHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setTrendingTokens(data.data || data.trending || []);
      }
    } catch (error) {
      console.error('Error loading trending tokens:', error);
    }
  };

  const loadScanHistory = async () => {
    try {
      const saved = localStorage.getItem('scanHistory');
      if (saved) {
        setScanHistory(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading scan history:', error);
    }
  };

  const loadUserData = async () => {
    try {
      if (wallet && window.ethereum) {
        await loadTokenBalance();
        await loadContractPrices();
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadTokenBalance = async () => {
    try {
      if (!wallet || !window.ethereum || !walletChainId) return;

      const network = NETWORKS[walletChainId];
      if (!network) return;

      const tokenAddress = network.tokens[selectedPaymentToken];
      if (!tokenAddress) return;

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      
      const balance = await contract.balanceOf(wallet.address);
      const decimals = await contract.decimals();
      
      setUsdcBalance(ethers.utils.formatUnits(balance, decimals));
    } catch (error) {
      console.error('Error loading token balance:', error);
      setUsdcBalance('0');
    }
  };

  const loadContractPrices = async () => {
    try {
      if (!window.ethereum) return;

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      const basicPrice = await contract.BASIC_SCAN_PRICE_USD();
      const fullPrice = await contract.FULL_SCAN_PRICE_USD();
      
      setContractPrices({
        basic: (basicPrice / 100).toFixed(2),
        full: (fullPrice / 100).toFixed(2)
      });
    } catch (error) {
      console.error('Error loading contract prices:', error);
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Por favor instala MetaMask para usar esta aplicación');
        return;
      }

      setNetworkError(null);
      
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts.length > 0) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = accounts[0];
        
        const network = await provider.getNetwork();
        const currentChainId = network.chainId.toString();
        
        setWallet({ provider, signer, address });
        setWalletChainId(currentChainId);
        
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        
        console.log('Wallet conectada:', address);
        console.log('Red actual:', NETWORKS[currentChainId]?.name || 'Desconocida');
        
        // Verificar si es una red soportada
        if (!NETWORKS[currentChainId]) {
          setNetworkError('Por favor conecta a Polygon, Ethereum, BSC o Arbitrum');
        }
      }
    } catch (error) {
      console.error('Error conectando wallet:', error);
      alert("Error conectando wallet: " + error.message);
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      setWallet(null);
      setUsdcBalance('0');
      setWalletChainId(null);
    } else {
      connectWallet();
    }
  };

  const handleChainChanged = (chainId) => {
    window.location.reload();
  };

  const switchNetwork = async (targetChainId) => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${parseInt(targetChainId).toString(16)}` }],
      });
    } catch (error) {
      if (error.code === 4902) {
        const network = NETWORKS[targetChainId];
        if (network) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${parseInt(targetChainId).toString(16)}`,
                chainName: network.name,
                nativeCurrency: {
                  name: network.symbol,
                  symbol: network.symbol,
                  decimals: 18,
                },
                rpcUrls: [network.rpc],
                blockExplorerUrls: [network.explorer],
              }],
            });
          } catch (addError) {
            console.error('Error añadiendo red:', addError);
          }
        }
      }
      console.error('Error cambiando red:', error);
    }
  };

  const analyzeToken = async (scanType) => {
    if (!address) {
      alert("Por favor ingresa una dirección de token válida");
      return;
    }

    if (!wallet) {
      alert("Por favor conecta tu wallet primero");
      return;
    }

    if (!ethers.utils.isAddress(address)) {
      alert("La dirección del token no es válida");
      return;
    }

    // Verificar red
    if (walletChainId !== '137') {
      alert('Por favor cambia a la red Polygon para realizar el pago');
      await switchNetwork('137');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Obtener dirección del token de pago
      const network = NETWORKS[walletChainId];
      const paymentTokenAddress = network.tokens[selectedPaymentToken];
      
      // 1. Verificar y aprobar token
      const tokenContract = new ethers.Contract(paymentTokenAddress, ERC20_ABI, signer);
      const scanPrice = scanType === 'basic' ? 
        ethers.utils.parseUnits(contractPrices.basic, 6) : 
        ethers.utils.parseUnits(contractPrices.full, 6);
      
      // Verificar balance
      const balance = await tokenContract.balanceOf(wallet.address);
      if (balance.lt(scanPrice)) {
        alert(`Balance insuficiente. Necesitas ${scanType === 'basic' ? contractPrices.basic : contractPrices.full} ${selectedPaymentToken.toUpperCase()}`);
        setLoading(false);
        return;
      }

      // Verificar allowance
      const allowance = await tokenContract.allowance(wallet.address, CONTRACT_ADDRESS);
      if (allowance.lt(scanPrice)) {
        console.log(`Aprobando ${selectedPaymentToken.toUpperCase()}...`);
        const approveTx = await tokenContract.approve(CONTRACT_ADDRESS, ethers.constants.MaxUint256);
        await approveTx.wait();
        console.log(`✅ ${selectedPaymentToken.toUpperCase()} aprobado`);
      }

      // 2. Ejecutar scan en blockchain
      const scannerContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      console.log(`Comprando ${scanType} scan...`);
      let tx;
      
      if (scanType === 'basic') {
        tx = await scannerContract.purchaseBasicScan(
          address,
          parseInt(selectedChainId),
          paymentTokenAddress,
          ethers.constants.AddressZero
        );
      } else {
        tx = await scannerContract.purchaseFullScan(
          address,
          parseInt(selectedChainId),
          paymentTokenAddress,
          ethers.constants.AddressZero
        );
      }

      console.log('Esperando confirmación blockchain...');
      const receipt = await tx.wait();
      console.log('✅ Transacción confirmada:', receipt.transactionHash);

      // 3. Analizar con backend
      console.log('Iniciando análisis del token...');
      const response = await fetch(`${BACKEND_URL}/api/analyze`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          address,
          chain_id: parseInt(selectedChainId),
          scan_type: scanType,
          tx_hash: receipt.transactionHash,
          buyer_address: wallet.address
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en el análisis del backend');
      }

      const data = await response.json();
      setResult(data);
      setActiveTab('results');
      
      // Guardar en historial
      const scanRecord = {
        id: Date.now(),
        address,
        chainId: selectedChainId,
        scanType,
        timestamp: new Date().toISOString(),
        txHash: receipt.transactionHash,
        result: data
      };
      
      const newHistory = [scanRecord, ...scanHistory.slice(0, 49)];
      setScanHistory(newHistory);
      localStorage.setItem('scanHistory', JSON.stringify(newHistory));
      
      // Actualizar balance
      await loadTokenBalance();
      
      console.log('✅ Análisis completado:', data);
      
    } catch (error) {
      console.error("Error durante el análisis:", error);
      
      if (error.code === 4001) {
        alert("Transacción cancelada por el usuario");
      } else if (error.message.includes('insufficient funds')) {
        alert("Fondos insuficientes para la transacción");
      } else if (error.message.includes('User rejected')) {
        alert("Transacción rechazada por el usuario");
      } else {
        alert("Error durante el análisis: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRiskColor = (score) => {
    if (score >= 80) return '#ff4444';
    if (score >= 60) return '#ff8800';
    if (score >= 40) return '#ffcc00';
    if (score >= 20) return '#88ff00';
    return '#00ff88';
  };

  const formatPrice = (price) => {
    if (!price) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(price);
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Crypto Ticker */}
      <div className="bg-black/50 backdrop-blur-md border-b border-white/10 overflow-hidden">
        <div className="flex animate-scroll whitespace-nowrap py-3">
          {Object.entries(cryptoPrices).map(([coin, data]) => (
            <div key={coin} className="inline-flex items-center px-6 space-x-2">
              <span className="font-bold text-purple-400">{coin.toUpperCase()}</span>
              <span className="text-white">{formatPrice(data.usd)}</span>
              <span className={`font-semibold ${data.usd_24h_change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {data.usd_24h_change > 0 ? '+' : ''}{data.usd_24h_change?.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="text-center py-12 px-4">
        <h1 className="text-6xl font-black mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
          🔍 MemeScanner Pro
        </h1>
        <p className="text-xl text-gray-300">Análisis blockchain real para inversiones seguras</p>
      </header>

      {/* Wallet Section */}
      <div className="text-center mb-8">
        {!wallet ? (
          <button 
            onClick={connectWallet}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
            <DollarSign className="inline w-5 h-5 mr-2" />
            Conectar Wallet
          </button>
        ) : (
          <div className="inline-flex items-center bg-white/10 backdrop-blur-md rounded-full px-6 py-3 space-x-4">
            <span className="font-mono">{formatAddress(wallet.address)}</span>
            <span className="text-green-400 font-bold">{parseFloat(usdcBalance).toFixed(2)} {selectedPaymentToken.toUpperCase()}</span>
            <span className="text-purple-400">{NETWORKS[walletChainId]?.name}</span>
          </div>
        )}
      </div>

      {/* Network Error */}
      {networkError && (
        <div className="max-w-4xl mx-auto mb-6 px-4">
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
            <span>{networkError}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex justify-center space-x-4 mb-8 px-4 flex-wrap">
        {['scanner', 'trending', 'history', result && 'results'].filter(Boolean).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-full font-semibold transition-all ${
              activeTab === tab 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg' 
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {tab === 'scanner' && <Shield className="inline w-5 h-5 mr-2" />}
            {tab === 'trending' && <TrendingUp className="inline w-5 h-5 mr-2" />}
            {tab === 'history' && <Clock className="inline w-5 h-5 mr-2" />}
            {tab === 'results' && <Activity className="inline w-5 h-5 mr-2" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        {/* Scanner Tab */}
        {activeTab === 'scanner' && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8">
            <h2 className="text-3xl font-bold mb-6 flex items-center">
              <Shield className="w-8 h-8 mr-3 text-purple-400" />
              Analizar Token
            </h2>

            <div className="space-y-6">
              {/* Chain Selection */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-purple-300">
                  Blockchain del Token
                </label>
                <select 
                  value={selectedChainId}
                  onChange={(e) => setSelectedChainId(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:border-purple-400 transition-colors"
                >
                  {Object.entries(NETWORKS).map(([id, network]) => (
                    <option key={id} value={id} className="bg-gray-800">
                      {network.name} ({network.symbol})
                    </option>
                  ))}
                </select>
              </div>

              {/* Token Address */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-purple-300">
                  Dirección del Token
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="0x..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 focus:border-purple-400 transition-colors"
                  />
                  <button
                    onClick={() => navigator.clipboard.readText().then(setAddress)}
                    className="bg-white/10 hover:bg-white/20 px-4 py-3 rounded-lg transition-colors"
                  >
                    Pegar
                  </button>
                </div>
              </div>

              {/* Payment Token */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-purple-300">
                  Token de Pago
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      setSelectedPaymentToken('usdc');
                      loadTokenBalance();
                    }}
                    className={`p-4 rounded-lg border transition-all ${
                      selectedPaymentToken === 'usdc' 
                        ? 'border-purple-400 bg-purple-600/20' 
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <div className="font-bold">USDC</div>
                    <div className="text-sm opacity-70">USD Coin</div>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPaymentToken('usdt');
                      loadTokenBalance();
                    }}
                    className={`p-4 rounded-lg border transition-all ${
                      selectedPaymentToken === 'usdt' 
                        ? 'border-purple-400 bg-purple-600/20' 
                        : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    <div className="font-bold">USDT</div>
                    <div className="text-sm opacity-70">Tether USD</div>
                  </button>
                </div>
              </div>

              {/* Scan Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                <button
                  onClick={() => analyzeToken('basic')}
                  disabled={loading || !wallet || parseFloat(usdcBalance) < parseFloat(contractPrices.basic)}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed p-6 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                >
                  <Zap className="w-8 h-8 mb-2 mx-auto" />
                  <div className="text-xl">Scan Básico</div>
                  <div className="text-sm opacity-80 mt-1">Honeypot • Taxes • Seguridad</div>
                  <div className="text-2xl mt-2">${contractPrices.basic}</div>
                </button>

                <button
                  onClick={() => analyzeToken('full')}
                  disabled={loading || !wallet || parseFloat(usdcBalance) < parseFloat(contractPrices.full)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed p-6 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                >
                  <Target className="w-8 h-8 mb-2 mx-auto" />
                  <div className="text-xl">Scan Completo</div>
                  <div className="text-sm opacity-80 mt-1">Análisis Total • Holders • Liquidez</div>
                  <div className="text-2xl mt-2">${contractPrices.full}</div>
                </button>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xl">Procesando análisis blockchain...</p>
                <div className="mt-4 space-y-2">
                  <div className="text-sm opacity-70">✅ Conectando wallet</div>
                  <div className="text-sm opacity-70">✅ Aprobando tokens</div>
                  <div className="text-sm opacity-70">✅ Ejecutando en blockchain</div>
                  <div className="text-sm opacity-70">🔄 Analizando token...</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trending Tab */}
        {activeTab === 'trending' && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8">
            <h2 className="text-3xl font-bold mb-6 flex items-center">
              <TrendingUp className="w-8 h-8 mr-3 text-purple-400" />
              Tokens Trending
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingTokens.map((token, index) => (
                <div key={index} className="bg-white/5 rounded-xl p-6 hover:bg-white/10 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{token.name}</h3>
                      <p className="text-sm opacity-70">{token.symbol}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      token.risk_level === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                      token.risk_level === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {token.risk_level}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="opacity-70">Cambio 24h</span>
                      <span className={token.price_change_24h?.startsWith('+') ? 'text-green-400' : 'text-red-400'}>
                        {token.price_change_24h}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">Volumen</span>
                      <span>{token.volume_24h}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setAddress(token.address || '');
                      setActiveTab('scanner');
                    }}
                    className="w-full mt-4 bg-purple-600 hover:bg-purple-700 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Analizar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8">
            <h2 className="text-3xl font-bold mb-6 flex items-center">
              <Clock className="w-8 h-8 mr-3 text-purple-400" />
              Historial de Scans
            </h2>
            {scanHistory.length === 0 ? (
              <p className="text-center text-gray-400 py-12">No tienes scans anteriores</p>
            ) : (
              <div className="space-y-4">
                {scanHistory.map((scan) => (
                  <div key={scan.id} className="bg-white/5 rounded-xl p-6 hover:bg-white/10 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-mono text-sm mb-1">{formatAddress(scan.address)}</p>
                        <p className="text-sm opacity-70">
                          {NETWORKS[scan.chainId]?.name} • {scan.scanType} scan
                        </p>
                        <p className="text-xs opacity-50 mt-1">
                          {new Date(scan.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold mb-2 ${
                          scan.result.risk_level === 'CRITICAL' || scan.result.risk_level === 'HIGH' ? 'text-red-400' :
                          scan.result.risk_level === 'MEDIUM' ? 'text-yellow-400' :
                          'text-green-400'
                        }`}>
                          Risk: {scan.result.risk_score}/100
                        </div>
                        <a
                          href={`${NETWORKS[137]?.explorer}/tx/${scan.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 text-sm"
                        >
                          Ver TX →
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && result && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8">
            <h2 className="text-3xl font-bold mb-6 flex items-center">
              <Activity className="w-8 h-8 mr-3 text-purple-400" />
              Resultados del Análisis
            </h2>

            {/* Token Header */}
            <div className="bg-white/5 rounded-xl p-6 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">{result.token?.name || 'Token'}</h3>
                  <p className="text-gray-400">{result.token?.symbol || 'UNKNOWN'}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => copyToClipboard(address)}
                    className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                  <a
                    href={`${NETWORKS[selectedChainId]?.explorer}/token/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors inline-flex items-center"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Risk Score */}
            <div className="bg-white/5 rounded-xl p-8 mb-6 text-center">
              <div className="relative inline-flex items-center justify-center w-48 h-48 mb-4">
                <svg className="transform -rotate-90 w-48 h-48">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-white/10"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke={getRiskColor(result.risk_score)}
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${result.risk_score * 5.52} 552`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute">
                  <div className="text-5xl font-black">{result.risk_score}</div>
                  <div className="text-sm opacity-70">RISK SCORE</div>
                </div>
              </div>
              <div className={`text-3xl font-bold mb-2 ${
                result.risk_level === 'CRITICAL' || result.risk_level === 'HIGH' ? 'text-red-400' :
                result.risk_level === 'MEDIUM' ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {result.risk_level}
              </div>
              <p className="text-lg opacity-80">{result.verdict}</p>
            </div>

            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-bold mb-4 text-red-400">⚠️ Alertas de Seguridad</h3>
                <ul className="space-y-2">
                  {result.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start">
                      <AlertTriangle className="w-5 h-5 mr-2 text-red-400 flex-shrink-0 mt-0.5" />
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Security Details */}
            {result.security && (
              <div className="bg-white/5 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-bold mb-4">🛡️ Detalles de Seguridad</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <div className="text-2xl mb-1">
                      {result.security.is_honeypot ? '🚨' : '✅'}
                    </div>
                    <div className="text-sm opacity-70">Honeypot</div>
                    <div className="font-bold">
                      {result.security.is_honeypot ? 'DETECTADO' : 'SEGURO'}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <div className="text-2xl mb-1">💰</div>
                    <div className="text-sm opacity-70">Buy Tax</div>
                    <div className="font-bold">{result.security.buy_tax}%</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <div className="text-2xl mb-1">💸</div>
                    <div className="text-sm opacity-70">Sell Tax</div>
                    <div className="font-bold">{result.security.sell_tax}%</div>
                  </div>
                  {result.security.ownership_renounced !== undefined && (
                    <div className="text-center p-4 bg-white/5 rounded-lg">
                      <div className="text-2xl mb-1">
                        {result.security.ownership_renounced ? '✅' : '⚠️'}
                      </div>
                      <div className="text-sm opacity-70">Ownership</div>
                      <div className="font-bold">
                        {result.security.ownership_renounced ? 'Renunciado' : 'Activo'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
                <h3 className="text-xl font-bold mb-4 text-green-400">💡 Recomendaciones</h3>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <ChevronRight className="w-5 h-5 mr-2 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        .animate-scroll {
          animation: scroll 20s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default App;
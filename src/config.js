// config.js - Configuración centralizada para MemeScanner Pro

// Configuración de redes y contratos
export const NETWORK_CONFIG = {
  1: { 
    name: 'Ethereum', 
    symbol: 'ETH', 
    rpc: process.env.REACT_APP_ETH_RPC || 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
    explorer: 'https://etherscan.io',
    contracts: {
      scanner: process.env.REACT_APP_ETH_CONTRACT,
      usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
    }
  },
  56: { 
    name: 'BNB Chain', 
    symbol: 'BNB', 
    rpc: process.env.REACT_APP_BSC_RPC || 'https://bsc-dataseed.binance.org',
    explorer: 'https://bscscan.com',
    contracts: {
      scanner: process.env.REACT_APP_BSC_CONTRACT,
      usdc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      usdt: '0x55d398326f99059fF775485246999027B3197955'
    }
  },
  137: { 
    name: 'Polygon', 
    symbol: 'MATIC', 
    rpc: process.env.REACT_APP_POLYGON_RPC || 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    contracts: {
      scanner: process.env.REACT_APP_POLYGON_CONTRACT || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      usdt: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
    }
  },
  42161: { 
    name: 'Arbitrum', 
    symbol: 'ETH', 
    rpc: process.env.REACT_APP_ARBITRUM_RPC || 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    contracts: {
      scanner: process.env.REACT_APP_ARBITRUM_CONTRACT,
      usdc: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      usdt: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'
    }
  },
  31337: { 
    name: 'Hardhat Local', 
    symbol: 'ETH', 
    rpc: 'http://127.0.0.1:8545',
    explorer: '#',
    contracts: {
      scanner: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      usdc: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      usdt: '0x5FbDB2315678afecb367f032d93F642f64180aa3'
    }
  }
};

// Backend URL
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://memescanner-api.onrender.com' 
    : 'http://localhost:5001');

// Validar configuración requerida
export const validateConfig = (chainId) => {
  const network = NETWORK_CONFIG[chainId];
  if (!network) return false;
  if (!network.contracts.scanner) {
    console.error(`Scanner contract not configured for chain ${chainId}`);
    return false;
  }
  return true;
};

// Helper para obtener contrato actual
export const getContractAddress = (chainId, contractType = 'scanner') => {
  const network = NETWORK_CONFIG[chainId];
  if (!network) return null;
  return network.contracts[contractType];
};

// Helper para cambiar de red
export const switchToNetwork = async (targetChainId) => {
  if (!window.ethereum) throw new Error('No wallet found');
  
  const network = NETWORK_CONFIG[targetChainId];
  if (!network) throw new Error('Unsupported network');
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${parseInt(targetChainId).toString(16)}` }],
    });
  } catch (error) {
    // Si la red no está añadida, intentar añadirla
    if (error.code === 4902 && targetChainId !== 1) {
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
    } else {
      throw error;
    }
  }
};
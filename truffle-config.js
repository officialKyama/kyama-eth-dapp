const HDWalletProvider = require('truffle-hdwallet-provider');

const {
  MNEMONIC,
  INFURA_KEY,
} = require('./utils');

module.exports = {
  networks: {
    development: {
     host: "127.0.0.1",     
     port: 8545,            
     network_id: "*" 
    },

    rinkeby: {
      provider: () => new HDWalletProvider(MNEMONIC,  `https://rinkeby.infura.io/v3/${INFURA_KEY}`),
      network_id: 4,       
      gas: 10000000,        
      gasPrice: 10000000000,
      confirmations: 2,
      skipDryRun: true
    },

    main: {
      provider: () => new HDWalletProvider(MNEMONIC,  `https://mainnet.infura.io/v3/${INFURA_KEY}`),
      network_id: 1,       
      gas: 10000000,        
      gasPrice: 10000000000,
      confirmations: 2,
      skipDryRun: true
    }
  },

  mocha: {
    // Mocha settings
  },

  compilers: {
    solc: {
      // Solc settings
    }
  }
}

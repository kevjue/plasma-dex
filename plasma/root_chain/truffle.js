/*
 * NB: since truffle-hdwallet-provider 0.0.5 you must wrap HDWallet providers in a 
 * function when declaring them. Failure to do so will cause commands to hang. ex:
 * ```
 * mainnet: {
 *     provider: function() { 
 *       return new HDWalletProvider(mnemonic, 'https://mainnet.infura.io/<infura-key>') 
 *     },
 *     network_id: '1',
 *     gas: 4500000,
 *     gasPrice: 10000000000,
 *   },
 */

var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = 'lamp vote liberty critic movie elbow grunt hip come farm jump mammal'; // public address = 0x0af467F2f6c20e3543B8a2a453e70DF034714aEB

module.exports = {
    networks: {
	development: {
	    host: "localhost",
	    port: 8545,
	    gasPrice: 10000000000, // deploy with a gas price of 10 gwei
	    network_id: "5" // TestRPC network id
	},
	rinkby: {
	    provider: function() {
		return new HDWalletProvider(mnemonic, "https://rinkeby.infura.io/UyPimZFIcHX5wAuEIDey")
	    },
	    gasPrice: 40000000000, // deploy with a gas price of 10 gwei
	    gas: 2000000,
	    network_id: "3" // Ropsten network id
	},
	
	staging: {
	    host: "localhost",
	    port: 8545,
	    gasPrice: 10000000000, // deploy with a gas price of 10 gwei
	    network_id: "4" // Rinkeby network id
	}
    }
};

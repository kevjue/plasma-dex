var PDEXToken = artifacts.require("./PDEXToken.sol");
var RootChain = artifacts.require("./RootChain.sol");

contract('RootChain', async (accounts) => {
	// before each test, initialize the pdexToken and rootChain variables from the deployed contracts
	beforeEach(async () => {
		pdexToken = await PDEXToken.deployed()
		rootChain = await RootChain.deployed()
	    })

	it("test for eth deposit into root chain", async () => {
		await rootChain.depositEth({from: accounts[0], value: web3.toWei(1, 'ether')});
		let rootChainBalance = web3.eth.getBalance(rootChain);

		assert.equal(rootChainBalance, web3.toWei(1, 'ether'));
	    }
    }
    );

var PDEXToken = artifacts.require("PDEXToken");
var RootChain = artifacts.require("RootChain");
var leftPad = require('left-pad')


contract('RootChain', async (accounts) => {
    // before each test, initialize the pdexToken and rootChain variables from the deployed contracts
    beforeEach(async () => {
	pdexToken = await PDEXToken.deployed();
	rootChain = await RootChain.deployed();
    });

    function keccak256(...args) {
	args = args.map(arg => {
	    if (typeof arg === 'string') {
		if (arg.substring(0, 2) === '0x') {
		    return arg.slice(2)
		} else {
		    return web3.toHex(arg).slice(2)
		}
	    }
	    
	    if (typeof arg === 'number') {
		return leftPad((arg).toString(16), 64, 0)
	    } else {
		return ''
	    }
	})

	args = args.join('')

	return web3.sha3(args, { encoding: 'hex' })
    };

    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

    it("test for eth deposit into root chain", async () => {
	let txnInfo = await rootChain.depositEth({from: accounts[0], value: web3.toWei(1, 'ether')});
	let rootChainBalance = web3.eth.getBalance(rootChain.address);

	// Verify that the root chain smart contract balance is 1 Eth
	assert.equal(rootChainBalance, web3.toWei(1, 'ether'), "balance in root chain contract incorrect");

	// Verify that there is one event from the transaction
	assert.equal(txnInfo.logs.length, 1, "exactly 1 event should have been emitted");

	// Verify the emitted event is correct
	let eventType = txnInfo.logs[0].event;
	let depositor = txnInfo.logs[0].args.depositor;
	let depositBlockNum = txnInfo.logs[0].args.depositBlock;
	let token = txnInfo.logs[0].args.token;
	let amount = txnInfo.logs[0].args.amount;
	assert.isTrue((eventType == 'Deposit') &&
		      (depositor == accounts[0]) &&
		      (depositBlockNum == 1) && 
		      (token == ZERO_ADDRESS) &&
		      (amount == web3.toWei(1, 'ether')), 'emitted event incorrect')

	// Verify that the contents of the deposit block is correct
	let depositBlock = await rootChain.getChildChain(depositBlockNum);
	assert.equal(depositBlock[0], keccak256(accounts[0], ZERO_ADDRESS, parseInt(web3.toWei(1, 'ether'))),
		     'deposit block contents incorrect');

	
    });
});

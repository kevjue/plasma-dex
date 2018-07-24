var PDEXToken = artifacts.require("PDEXToken");
var RootChain = artifacts.require("RootChain");
var leftPad = require('left-pad');
var spawn = require('child_process').spawn;


contract('RootChain', async (accounts) => {
    // Javascript implementation of the solidity hash function
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

    function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
    }

    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    const OPERATOR_ADDRESS = accounts[0];
    const USER_ADDRESS = accounts[1];
    var ethDepositBlockNum;
    var tokenDepositBlockNum;
    var child;

    // initialize the pdexToken and rootChain variables from the deployed contracts.
    // Also, start the child chain server
    before(async () => {
	pdexToken = await PDEXToken.deployed();
	console.log("deployed pdex token is " + pdexToken.address);
	rootChain = await RootChain.deployed();
	console.log("deployed root chain is " + rootChain.address);

	child = spawn('python3', ['plasma/child_chain/server.py',
				  '--root_chain_address=' + rootChain.address,
				  '--eth_node_endpoint=' + 'http://0.0.0.0:8545'],
		      {'cwd': '/home/ubuntu/plasma-dex/',  // In the top level plasma_dex directory
		       'env': {'PYTHONPATH': './',
			       'LC_ALL': 'C.UTF-8',
			       'LANG': 'C.UTF-8'}});
	console.log(child.pid);

	child.stderr.on('data', (chunk) => { console.log(chunk.toString()); });
	child.stdout.on('data', (chunk) => { console.log(chunk.toString()); });

	// Sleep for 10 seconds to wait for the child server to get ready
	await sleep(10 * 1000);	
    });

    // Stop the root chain server
    after(async () => {
	child.kill('SIGTERM');
    });

    it("test for eth deposit into root chain", async () => {
	ethDepositBlockNum = await rootChain.getDepositBlock().then(function(num) {return num.toNumber()});
	let txnInfo = await rootChain.depositEth({from: USER_ADDRESS, value: web3.toWei(1, 'ether')});
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
		      (depositor == USER_ADDRESS) &&
		      (depositBlockNum == ethDepositBlockNum) && 
		      (token == ZERO_ADDRESS) &&
		      (amount == web3.toWei(1, 'ether')), 'emitted event incorrect')

	// Verify that the contents of the deposit block is correct
	let depositBlock = await rootChain.getChildChain(depositBlockNum);
	assert.equal(depositBlock[0], keccak256(USER_ADDRESS, ZERO_ADDRESS, parseInt(web3.toWei(1, 'ether'))),
		     'deposit block contents incorrect');

    });

    it("test for token deposit into root chain", async () => {
	// TODO:  Test for unapproved deposit
	await pdexToken.transfer(USER_ADDRESS, web3.toWei(1, 'ether'),    // Hack. This works since the number of decimals for
		  	                                                  // pdexToken is the same as ether.
				 {'from': OPERATOR_ADDRESS});
	await pdexToken.approve(rootChain.address,
				web3.toWei(1, 'ether'),
				{from: USER_ADDRESS});
	tokenDepositBlockNum = await rootChain.getDepositBlock().then(function(num) {return num.toNumber()});
	let txnInfo = await rootChain.depositToken(web3.toWei(1, 'ether'),
						   {from: USER_ADDRESS});

	let rootChainBalance = await pdexToken.balanceOf(rootChain.address);

	// Verify that the root chain smart contract balance is 1 Eth
	assert.equal(rootChainBalance, web3.toWei(1, 'ether'), "token balance in root chain contract incorrect");

	// Verify that there is one event from the transaction
	assert.equal(txnInfo.logs.length, 1, "exactly 1 event should have been emitted");

	// Verify the emitted event is correct
	let eventType = txnInfo.logs[0].event;
	let depositor = txnInfo.logs[0].args.depositor;
	let depositBlockNum = txnInfo.logs[0].args.depositBlock;
	let token = txnInfo.logs[0].args.token;
	let amount = txnInfo.logs[0].args.amount;
	assert.isTrue((eventType == 'Deposit') &&
		      (depositor == USER_ADDRESS) &&
		      (depositBlockNum == tokenDepositBlockNum) && 
		      (token == pdexToken.address) &&
		      (amount == web3.toWei(1, 'ether')), 'emitted event incorrect')

	// Verify that the contents of the deposit block is correct
	let depositBlock = await rootChain.getChildChain(depositBlockNum);
	assert.equal(depositBlock[0], keccak256(USER_ADDRESS, pdexToken.address, parseInt(web3.toWei(1, 'ether'))),
		     'token deposit block contents incorrect');
    });
    
    /*it("test for eth deposit exit from root chain", async () => {
	// TODO:  Test for incorrect exit amount
	let ethDepositPos = ethDepositBlockNum * 1000000000;
	let txnInfo = await rootChain.startDepositExit(ethDepositPos,
						       ZERO_ADDRESS,
						       web3.toWei(1, 'ether'),
						       {'from': USER_ADDRESS});

	// Verify that there is one event from the transaction
	assert.equal(txnInfo.logs.length, 1, "exactly 1 event should have been emitted");

	// Verify the emitted event is correct
	let eventType = txnInfo.logs[0].event;
	let exitor = txnInfo.logs[0].args.exitor;
	let utxoPos = txnInfo.logs[0].args.utxoPos;
	let token = txnInfo.logs[0].args.token;
	let amount = txnInfo.logs[0].args.amount;
	assert.isTrue((eventType == 'ExitStarted') &&
		      (exitor == USER_ADDRESS) &&
		      (utxoPos == ethDepositPos) && 
		      (token == ZERO_ADDRESS) &&
		      (amount == web3.toWei(1, 'ether')), 'emitted event incorrect')

	let exitInfo = await rootChain.getExit(ethDepositPos);

	// Verify that the exitInfo is correct
	assert.isTrue((exitInfo[0] == USER_ADDRESS) &&
		      (exitInfo[1] == ZERO_ADDRESS) &&
		      (exitInfo[2] == web3.toWei(1, 'ether')), "exit info is incorrect")

	// TODO:  Test for too early exit
	let minExitTime = await rootChain.minExitTime().then(function(time) {return time.toNumber()});
	await sleep(2 * minExitTime * 1000);

	let userBalance = web3.eth.getBalance(USER_ADDRESS);

	txnInfo = await rootChain.finalizeExits(ZERO_ADDRESS, {'from': OPERATOR_ADDRESS});
	// Verify that there is one event from the transaction
	assert.equal(txnInfo.logs.length, 1, "exactly 1 event should have been emitted for finalizeExits");

	// Verify the emitted event is correct
	eventType = txnInfo.logs[0].event;
	exitor = txnInfo.logs[0].args.exitor;
	utxoPos = txnInfo.logs[0].args.utxoPos;
	token = txnInfo.logs[0].args.token;
	amount = txnInfo.logs[0].args.amount;
	assert.isTrue((eventType == 'ExitFinalized') &&
		      (exitor == USER_ADDRESS) &&
		      (utxoPos == ethDepositPos) &&
		      (token == ZERO_ADDRESS) &&
		      (amount == web3.toWei(1, 'ether')), 'emitted event incorrect');

	let newUserBalance = web3.eth.getBalance(USER_ADDRESS);
	assert.equal(newUserBalance - userBalance, web3.toWei(1, 'ether'), "Exit amount incorrect");
    });

    it("test for token deposit exit from root chain", async () => {
	// TODO:  Test for incorrect exit amount
	let tokenDepositPos = tokenDepositBlockNum * 1000000000;
	let txnInfo = await rootChain.startDepositExit(tokenDepositPos,
						       pdexToken.address,
						       web3.toWei(1, 'ether'),
						       {'from': USER_ADDRESS});

	// Verify that there is one event from the transaction
	assert.equal(txnInfo.logs.length, 1, "exactly 1 event should have been emitted");

	// Verify the emitted event is correct
	let eventType = txnInfo.logs[0].event;
	let exitor = txnInfo.logs[0].args.exitor;
	let utxoPos = txnInfo.logs[0].args.utxoPos;
	let token = txnInfo.logs[0].args.token;
	let amount = txnInfo.logs[0].args.amount;
	assert.isTrue((eventType == 'ExitStarted') &&
		      (exitor == USER_ADDRESS) &&
		      (utxoPos == tokenDepositPos) && 
		      (token == pdexToken.address) &&
		      (amount == web3.toWei(1, 'ether')), 'emitted event incorrect')

	let exitInfo = await rootChain.getExit(tokenDepositPos);

	// Verify that the exitInfo is correct
	assert.isTrue((exitInfo[0] == USER_ADDRESS) &&
		      (exitInfo[1] == pdexToken.address) &&
		      (exitInfo[2] == web3.toWei(1, 'ether')), "exit info is incorrect")

	// TODO:  Test for too early exit
	let minExitTime = await rootChain.minExitTime().then(function(time) {return time.toNumber()});
	await sleep(2 * minExitTime * 1000);

	let userBalance = await pdexToken.balanceOf(USER_ADDRESS);

	txnInfo = await rootChain.finalizeExits(pdexToken.address, {'from': OPERATOR_ADDRESS});
	// Verify that there is one event from the transaction
	assert.equal(txnInfo.logs.length, 1, "exactly 1 event should have been emitted for finalizeExits");

	// Verify the emitted event is correct
	eventType = txnInfo.logs[0].event;
	exitor = txnInfo.logs[0].args.exitor;
	utxoPos = txnInfo.logs[0].args.utxoPos;
	token = txnInfo.logs[0].args.token;
	amount = txnInfo.logs[0].args.amount;
	assert.isTrue((eventType == 'ExitFinalized') &&
		      (exitor == USER_ADDRESS) &&
		      (utxoPos == tokenDepositPos) &&
		      (token == pdexToken.address) &&
		      (amount == web3.toWei(1, 'ether')), 'emitted event incorrect');

	let newUserBalance = await pdexToken.balanceOf(USER_ADDRESS);
	assert.equal(newUserBalance - userBalance, web3.toWei(1, 'ether'), "Exit amount incorrect");
    });*/
});

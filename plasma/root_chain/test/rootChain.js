var PDEXToken = artifacts.require("PDEXToken");
var RootChain = artifacts.require("RootChain");
var PriorityQueue = artifacts.require("PriorityQueue");
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
	let originalRootChainBalance = await pdexToken.balanceOf(rootChain.address);

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
	assert.equal(rootChainBalance - originalRootChainBalance, web3.toWei(1, 'ether'), "token balance in root chain contract incorrect");

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

    it("test for unapproved token deposit", async () => {
	let didThrow = false;
	try {
	    await rootChain.depositToken(web3.toWei(1, 'ether'), {from: USER_ADDRESS});        
	} catch (e) {
	    didThrow = (e.message == "VM Exception while processing transaction: revert")
	}

	assert.isTrue(didThrow, "failed to revert when depositing unapproved tokens");
    });
    
    it("test for eth deposit exit from root chain", async () => {
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

	let userBalance = await web3.eth.getBalance(USER_ADDRESS);

	txnInfo = await rootChain.withdrawal(ZERO_ADDRESS, {'from': USER_ADDRESS, 'gasPrice': web3.toWei(10, 'gwei')});
	// Verify that there is one event from the transaction
	assert.equal(txnInfo.logs.length, 1, "exactly 1 event should have been emitted for withdrawal");

	// Verify the emitted event is correct
	eventType = txnInfo.logs[0].event;
	withdrawer = txnInfo.logs[0].args.withdrawer;
	token = txnInfo.logs[0].args.token;
	amount = txnInfo.logs[0].args.amount;
	assert.isTrue((eventType == 'Withdrawal') &&
		      (exitor == USER_ADDRESS) &&
		      (token == ZERO_ADDRESS) &&
		      (amount == web3.toWei(1, 'ether')), 'emitted event incorrect');

	let newUserBalance = web3.eth.getBalance(USER_ADDRESS);
	let txnCost = txnInfo.receipt.gasUsed * web3.toWei(10, 'gwei');

	// for some reason, the txnCost is slightly more than expected.
	// Verify that the new balance is within 100,000 wei of expected value
	let balanceDifference = newUserBalance - userBalance;
	let expectedDifference = web3.toWei(1, 'ether') - txnCost;
	let error = Math.abs(balanceDifference - expectedDifference);
	assert.isBelow(error, 100000, "Withdrawal amount incorrect");

	// Verify that the withdrawal allowance is zero for the user.
	let withdrawalAllowance = await rootChain.approvedWithdrawals(ZERO_ADDRESS, USER_ADDRESS);
	assert.strictEqual(withdrawalAllowance.toNumber(), 0, "withdrawal allowance should be 0");
    });

    it("test for attempting to exit an already exitted eth deposit from root chain", async () => {
	let ethDepositPos = ethDepositBlockNum * 1000000000;

	try {
	    let txnInfo = await rootChain.startDepositExit(ethDepositPos,
							   ZERO_ADDRESS,
							   web3.toWei(1, 'ether'),
							   {'from': USER_ADDRESS});
	} catch (e) {
	    didThrow = (e.message == "VM Exception while processing transaction: revert")
	}

	assert.isTrue(didThrow, "failed to revert when exiting an already exitted eth deposit");
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

	let userBalance = await pdexToken.balanceOf(USER_ADDRESS);

	txnInfo = await rootChain.withdrawal(pdexToken.address, {'from': USER_ADDRESS, 'gasPrice': web3.toWei(10, 'gwei')});
	// Verify that there is one event from the transaction
	assert.equal(txnInfo.logs.length, 1, "exactly 1 event should have been emitted for withdrawal");

	// Verify the emitted event is correct
	eventType = txnInfo.logs[0].event;
	withdrawer = txnInfo.logs[0].args.withdrawer;
	token = txnInfo.logs[0].args.token;
	amount = txnInfo.logs[0].args.amount;
	assert.isTrue((eventType == 'Withdrawal') &&
		      (exitor == USER_ADDRESS) &&
		      (token == pdexToken.address) &&
		      (amount == web3.toWei(1, 'ether')), 'emitted event incorrect');

	let newUserBalance = await pdexToken.balanceOf(USER_ADDRESS);
	assert.equal(newUserBalance - userBalance, web3.toWei(1, 'ether'), "Exit amount incorrect");

	// Verify that the withdrawal allowance is zero for the user.
	let withdrawalAllowance = await rootChain.approvedWithdrawals(pdexToken.address, USER_ADDRESS);
	assert.strictEqual(withdrawalAllowance.toNumber(), 0, "withdrawal allowance should be 0");
    });

    it("test for attempting to exit an already exitted token deposit from root chain", async () => {
	let tokenDepositPos = tokenDepositBlockNum * 1000000000;

	try {
	    let txnInfo = await rootChain.startDepositExit(tokenDepositPos,
							   pdexToken.address,
							   web3.toWei(1, 'ether'),
							   {'from': USER_ADDRESS});
	} catch (e) {
	    didThrow = (e.message == "VM Exception while processing transaction: revert")
	}

	assert.isTrue(didThrow, "failed to revert when exiting an already exitted token deposit");
    });
});

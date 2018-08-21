var PDEXToken = artifacts.require("./PDEXToken.sol");
var RootChain = artifacts.require("./RootChain.sol");

contract('PDEXToken', function(accounts) {

    /*************/
    /* Utilities */
    /*************/

    // before each test, initialize the pdexToken variable from the deployed contract
    before(async () => {
	pdexToken = await PDEXToken.deployed();
	console.log("deployed pdex token is " + pdexToken.address);
	rootChain = await RootChain.deployed();
	console.log("deployed root chain is " + rootChain.address);
    })

    /******************/
    /* Creation Tests */
    /******************/

    it("initial supply should be allocated to first account", async () => {
	const firstAccountBalance = await pdexToken.balanceOf.call(accounts[0]);
        assert.isTrue(firstAccountBalance.equals(web3.toWei(web3.toBigNumber(900), 'ether')), "first account had incorrect balance");

	const rootChainBalance = await pdexToken.balanceOf.call(rootChain.address);
	assert.isTrue(rootChainBalance.equals(web3.toWei(web3.toBigNumber(100), 'ether')), "root chain account had incorrect balance");
    });

    it("no tokens should be allocated to other accounts", async () => {
        const secondAccountBalance = await pdexToken.balanceOf.call(accounts[1])
        assert.strictEqual(secondAccountBalance.toNumber(), 0, "second account had incorrect balance")
    });

    it("token should have the correct metadata", async () => {
        const name = await pdexToken.name.call()
        assert.strictEqual(name, 'PDEXCoin')

        const symbol = await pdexToken.symbol.call()
        assert.strictEqual(symbol, 'PDEX')

        const decimals = await pdexToken.decimals.call()
        assert.strictEqual(decimals.toNumber(), 18)

        const totalSupply = await pdexToken.totalSupply.call()
        assert.isTrue(totalSupply.equals(web3.toWei(web3.toBigNumber(1000), 'ether')));
    })

    it("token contract not accept ether without a function call", async () => {
        
        let didThrow = false;
        try {
            await web3.eth.sendTransaction({from: accounts[0], to: pdexToken.address, value: 1})
        } catch (e) {
            //didThrow = (e.message == "VM Exception while processing transaction: invalid opcode")
            didThrow = true; //(e.message == "VM Exception while processing transaction: invalid opcode")
        }

        assert.isTrue(didThrow, "failed to throw when sending ether to token contract");
    })

    /******************/
    /* Transfer Tests */
    /******************/

    it("first account should send 50 tokens to the second account", async () => {
	const transfer = await pdexToken.transfer(accounts[1], web3.toWei(50, 'ether'), {from: accounts[0]})

        const transferLog = transfer.logs.find(element => element.event.match('Transfer'))
        assert.strictEqual(transferLog.args.from, accounts[0], "Transfer event had incorrect _from")
        assert.strictEqual(transferLog.args.to, accounts[1], "Transfer event had incorrect _to")
        assert.isTrue(transferLog.args.value.equals(web3.toWei(50, 'ether')), "Transfer event had incorrect _value")

        const firstAccountBalance = await pdexToken.balanceOf.call(accounts[0])
        assert.isTrue(firstAccountBalance.equals(web3.toWei(850, 'ether')), "first account had incorrect balance")

        const secondAccountBalance = await pdexToken.balanceOf.call(accounts[1])
        assert.isTrue(secondAccountBalance.equals(web3.toWei(50, 'ether')), "second account had incorrect balance")
    })

    /******************/
    /* Approval Tests */
    /******************/

    it("first account should approve 100 tokens for the fourth account", async () => {
	const approval = await pdexToken.approve(accounts[3], web3.toWei(100, 'ether'), {from: accounts[0]})

        const approvalLog = approval.logs.find(element => element.event.match('Approval'))
        assert.strictEqual(approvalLog.args.owner, accounts[0], "Approval event had incorrect _owner")
        assert.strictEqual(approvalLog.args.spender, accounts[3], "Approval event had incorrect _spender")
        assert.isTrue(approvalLog.args.value.equals(web3.toWei(100, 'ether')), "Approval event had incorrect _value")

        const allowance = await pdexToken.allowance.call(accounts[0], accounts[3])
        assert.isTrue(allowance.equals(web3.toWei(100, 'ether')), "allowance for fourth account was incorrect")
    })

    it("fourth account should transfer 50 tokens to fifth account from first account", async () => {
	const transferFrom = await pdexToken.transferFrom(accounts[0], accounts[4], web3.toWei(50, 'ether'), {from: accounts[3]})

        const transferFromLog = transferFrom.logs.find(element => element.event.match('Transfer'))
        assert.strictEqual(transferFromLog.args.from, accounts[0], "Transfer event had incorrect _from")
        assert.strictEqual(transferFromLog.args.to, accounts[4], "Transfer event had incorrect _to")
        assert.isTrue(transferFromLog.args.value.equals(web3.toWei(50, 'ether')), "Transfer event had incorrect _value")

        const firstAccountBalance = await pdexToken.balanceOf.call(accounts[0])
        assert.isTrue(firstAccountBalance.equals(web3.toWei(800, 'ether')), "first account had incorrect balance")

        const fifthAccountBalance = await pdexToken.balanceOf.call(accounts[4])
        assert.isTrue(fifthAccountBalance.equals(web3.toWei(50, 'ether')), "fifth account had incorrect balance")

        const fourthAccountAllowance = await pdexToken.allowance.call(accounts[0], accounts[3])
        assert.isTrue(fourthAccountAllowance.equals(web3.toWei(50, 'ether')), "allowance for fourth account was incorrect")
    })
});

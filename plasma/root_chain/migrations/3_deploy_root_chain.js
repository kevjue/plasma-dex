// import the token contract
var pdex_token = artifacts.require("PDEXToken");
// import the root chain contract
var root_chain = artifacts.require("RootChain");

module.exports = function(deployer, network, accounts) {
    var deployed_pdex_token;
    var deployed_root_chain;

    deployer.then(function() {

	// load the deployed token
	return pdex_token.deployed();
    }).then(function(_deployed_pdex_token) {
        // deploy the root chain from account zero
	deployed_pdex_token = _deployed_pdex_token;
	return deployer.deploy(root_chain, deployed_pdex_token.address, {from: accounts[0], gasPrice: 10000000000});
    }).then(function() {
	return root_chain.deployed();
    }).then(function(_deployed_root_chain) {
	deployed_root_chain = _deployed_root_chain;
	deployed_pdex_token.approve(deployed_root_chain.address, web3.toWei(100, 'ether'), {from: accounts[0]});
    }).then(function() {
	deployed_root_chain.depositToken(web3.toWei(100, 'ether'), {from:accounts[0]});
    }).then(function() {
	console.log(accounts[0] + " deposited 100 PDEX tokens to root chain");
    });
};	   

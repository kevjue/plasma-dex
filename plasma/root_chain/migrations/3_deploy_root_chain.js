// import the token contract
var pdex_token = artifacts.require("PDEXToken");
// import the root chain contract
var root_chain = artifacts.require("RootChain");

module.exports = function(deployer, network, accounts) {

    deployer.then(function() {

	// load the deployed token
	return pdex_token.deployed();
    }).then(function(pdex_token) {
        // deploy the root chain from account zero
	return deployer.deploy(root_chain, pdex_token.address, {from: accounts[0], gasPrice: 10000000000});
    });
};	   

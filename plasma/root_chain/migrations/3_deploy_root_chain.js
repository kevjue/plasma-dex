// import the token contract
var pdex_token = artifacts.require("./PDEXToken.sol");
// import the root chain contract
var root_chain = artifacts.require("./RootChain.sol");

module.exports = function(deployer, network, accounts) {

    deployer.then(function() {

	// load the deployed token
	return pdex_token.deployed();
    }).then(function(instance) {
        // deploy the root chain from account zero
	deployer.deploy(root_chain, {from: accounts[0], gasPrice: 10000000000});
    });
};	   

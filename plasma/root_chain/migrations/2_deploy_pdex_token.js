// import the token contract
var token = artifacts.require("./PDEXToken.sol");

module.exports = function(deployer, network, accounts) {
    // deploy the token from account zero
    deployer.deploy(token, {from: accounts[0], gasPrice: 10000000000});
};

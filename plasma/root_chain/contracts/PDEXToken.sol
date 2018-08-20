pragma solidity ^0.4.11;

import 'zeppelin/contracts/token/StandardToken.sol';

/**
 * @title Plasma Decentralized Exchange Token
 * @dev This contract defines the tradable token parameters in the PDEX child chain
 */
contract PDEXToken is StandardToken {
    string public symbol = "PDEX";
    string public name = "PDEXCoin";
    uint8 public decimals = 18;
    

    /*
     * @dev Constructor for the PDEXToken contract.  It will assign the total supply to the creator of the token.
     */

    function PDEXToken() public {
        balances[msg.sender] = 1000 * (10 ** uint256(decimals));
        totalSupply = 1000 * (10 ** uint256(decimals));
    }
}
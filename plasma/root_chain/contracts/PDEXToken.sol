pragma solidity ^0.4.11;

import 'zeppelin/contracts/token/StandardToken.sol';

contract PDEXToken is StandardToken {
    string public symbol = "PDEX";
    string public name = "PDEXCoin";
    uint8 public decimals = 18;
    
    function PDEXCoin() public {
        balances[msg.sender] = 1000 * (10 ** uint256(decimals));
        totalSupply = 1000 * (10 ** uint256(decimals));
    }
}
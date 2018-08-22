# Avoiding common attacks

## Using checks-effects-interactions pattern

The withdraw function in RootChain.sol, uses a checks effects interactions pattern.  This will prevent an attacker from using a re-entrancy attack to take all of the ether and tokens stored in this smart contract.

Note that there are instances in RootChain.sol where an external function calls are invoked in the middle of functions (specifically function calls for the PriorityQueue contract), but the priorityqueue contract is a trusted contract, so we know there would not be a re-entrancy attack for those instances.

## Overflow and Underflow errors

The RootChain.sol smart contract uses a safemath library to prevent any underflow or overflow errors.

## Pull over push design

The RootChain.sol smart contract uses a pull over push design for the withdrawing of tokens and ether.  Specifically, the finalizeExists function doesn't send ether or tokens to the exitors.  Instead, it will approve withdrawals for the exitors.

This is to prevent DOS attacks, where an exitor would have a malicious fallback function and the ether transfer would always fail when sending to that exitor.

## Preventing hitting gas block limit

The finalizeExits function in RootChain.sol has a loop that potentially could run for many iterations.  So it could hit a gas block limit, if it runs for too many iterations.  To prevent that, the function contains a max number of iterations per function invokation.
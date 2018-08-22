# Design Pattern Desicions

## Modularity

I decided to make the root chain portion of the decentralized exchange modular.  The reason for this is that the root chain is very complex, and has many moving parts.  I could decide that later in the future, one of those modules should be modified.  E.g. the exit priority queue (implemented in the file PriorityQueue.sol) could have a different priority algorithm.  In that case, only that specific module will need to be modified, as opposed to the main RootChain.sol file.

Also, understanding the root chain code is much easier if it's split among different modules/files, as there are over 1000 total lines of code for the root chain smart contract logic.

## Pull over push design

I chose to do a pull over push design for withdrawing ether and tokens from the root chain.  This will prevent any malicious users from performing a DOS attack on the withdraw functionality.

## Circuit breaker

I implemented a circuit breaker, in the case something went wrong with the decentralized exchange (e.g. a critical bug was discovered).  The circuit breaker can be enabled by calling the function 'declareEmergency' in the RootChain.sol smart contract.  Once it's enabled, all deposits, exits, child block submission, and withdraws will be disable, with the exception of withdrawing of all the root chain's ether and tokens to the operator.  That will allow the operator to determine the correct assignment of ether and tokens based on historical transactions on the root and child chain.  This obviously assumes that the operator will be a trusted party.

Also, only the operator is allowed to enable the circuit breaker.
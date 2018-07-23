# Plasma MVP DEX

This is a plasma based implementation of a decentralized exchange.  In fact, this codebase is forked from Omisego's [Minimum Viable Plasma](https://ethresear.ch/t/minimal-viable-plasma/426) implementation.

## Overview

Plasma MVP DEX is split into four main parts: `root_chain`, `child_chain`, `client`, and `cli`. Below is an overview of each sub-project.

### root_chain

`root_chain` represents the Plasma contract to be deployed to the root blockchain. In our case, this contract is written in Solidity and is designed to be deployed to Ethereum. `root_chain` also includes a compilation/deployment script. 

`RootChain.sol` is based off of the Plasma design specified in [Minimum Viable Plasma](https://ethresear.ch/t/minimal-viable-plasma/426). Currently, this contract allows a single authority to publish child chain blocks to the root chain. This is *not* a permanent design and is intended to simplify development of more critical components in the short term. 

### child_chain

`child_chain` is a Python implementation of a Plasma MVP DEX child chain client. It's useful to think of `child_chain` as analogous to [Parity](https://www.parity.io) or [Geth](https://geth.ethereum.org). This component manages a store of `Blocks` and `Transactions` that are updated when events are fired in the root contract.

`child_chain` also contains an RPC server that enables client interactions. By default, this server runs on port `8546`. 

### client

`client` is a simple Python wrapper of the RPC API exposed by `child_chain`, similar to `Web3.py` for Ethereum. You can use this client to write Python applications that interact with this Plasma chain.

### cli

`cli` is a simple Python application that uses `client` to interact with `child_chain`, via the command line. A detailed documentation of `cli` is available [here](#cli-documentation).

## Getting Started

### Dependencies

This project has a few pre-installation dependencies.

#### [LevelDB](https://github.com/google/leveldb)

Mac:
```sh
brew install leveldb
```

Linux:

LevelDB should be installed along with `plyvel` once you make the project later on.

Windows:

First, install [vcpkg](https://github.com/Microsoft/vcpkg). Then,

```sh
vcpkg install leveldb
```


#### [Solidity](https://solidity.readthedocs.io/en/latest/installing-solidity.html)

Mac:
```sh
brew update
brew upgrade
brew tap ethereum/ethereum
brew install solidity
```

Linux:
```sh
sudo add-apt-repository ppa:ethereum/ethereum
sudo apt-get update
sudo apt-get install solc
```

Windows:

Follow [this guide](https://solidity.readthedocs.io/en/latest/installing-solidity.html#prerequisites-windows)


#### [Python 3.2+](https://www.python.org/downloads/)

Mac:
```sh
brew install python
```

Linux:
```sh
sudo apt-get install software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt-get update
sudo apt-get install python3
```

Windows:
```sh
choco install python
```

### Installation

Note: we optionally recommend using something like [`virtualenv`](https://pypi.python.org/pypi/virtualenv) in order to create an isolated Python environment:

```
$ virtualenv env -p python3
```

Fetch and install the project's dependencies with:

```
$ make
```

### Testing

Before you run tests, make sure you have an Ethereum client running and an JSON RPC API exposed on port `8545`. We recommend using `ganache-cli` to accomplish this when running tests.

Project tests can be found in the `tests/` folder. Run tests with:

```
$ make test
```

If you're contributing to this project, make sure you also install [`flake8`](https://pypi.org/project/flake8/) and lint your work:

```
$ make lint
```

### Starting Plasma

The fastest way to start playing with our Plasma MVP is by starting up `ganache-cli`, deploying everything locally, and running our CLI. Full documentation for the CLI is available [here](#cli-documentation).

```bash
$ ganache-cli -m=plasma_mvp # Start ganache-cli
$ make root-chain           # Deploy the root chain contract
$ make child-chain          # Run our child chain and server
```

## CLI Documentation

`omg` is a simple Plasma CLI that enables interactions with the child chain. Full documentation is provided below.

### `help`

#### Description

Shows a list of available commands.

#### Usage

```
help
```

### `deposit`

#### Description

Creates a deposit transaction and submits it to the child chain.

#### Usage

```
deposit <amount> <address>
```

#### Example

```
deposit 100 0xfd02ecee62797e75d86bcff1642eb0844afb28c7
```

### `sendtx`

#### Description

Creates a transaction and submits it to the child chain.

#### Usage

```
sendtx <blknum1> <txindex1> <oindex1> <blknum2> <txindex2> <oindex2> <newowner1> <amount1> <newowner2> <amount2> <fee> <key1> [<key2>]
```

#### Example

```
send_tx 1 0 0 0 0 0 0xfd02ecee62797e75d86bcff1642eb0844afb28c7 50 0x4b3ec6c9dc67079e82152d6d55d8dd96a8e6aa26 45 5 3bb369fecdc16b93b99514d8ed9c2e87c5824cf4a6a98d2e8e91b7dd0c063304
```

### `submitblock`

#### Description

Signs and submits the current block to the root contract.

#### Usage

```
submitblock <key>
```

#### Example

```
submitblock 3bb369fecdc16b93b99514d8ed9c2e87c5824cf4a6a98d2e8e91b7dd0c063304
```

### `withdraw`

#### Description

Creates an exit transaction for the given UTXO.

#### Usage

```
withdraw <blknum> <txindex> <oindex> <key1> [<key2>]
```

#### Example

```
withdraw 1000 0 0 3bb369fecdc16b93b99514d8ed9c2e87c5824cf4a6a98d2e8e91b7dd0c063304
```

### `withdrawdeposit`

#### Description

Withdraws from a deposit.

#### Usage

```
withdrawdeposit 0xfd02ecee62797e75d86bcff1642eb0844afb28c7 1 100
```

## CLI Example

Let's play around a bit:

1. Deploy the root chain contract and start the child chain as per [Starting Plasma](#starting-plasma).

2. Start by depositing:
```
omg deposit 100 0xfd02ecee62797e75d86bcff1642eb0844afb28c7
```

3. Send a transaction:
```
omg sendtx 1 0 0 0 0 0 0xfd02ecee62797e75d86bcff1642eb0844afb28c7 50 0x4b3ec6c9dc67079e82152d6d55d8dd96a8e6aa26 45 5 3bb369fecdc16b93b99514d8ed9c2e87c5824cf4a6a98d2e8e91b7dd0c063304
```

4.  Submit the block:
```
omg submitblock 3bb369fecdc16b93b99514d8ed9c2e87c5824cf4a6a98d2e8e91b7dd0c063304
```

5. Withdraw the original deposit (this is a double spend!):

```
omg withdrawdeposit 0xfd02ecee62797e75d86bcff1642eb0844afb28c7 1 100
```

Note: The functionality to challenge double spends from the cli is still being worked on.

## Internals

### Child Chain transaction formats
There are three types of child chain transactions:  1)  transfer eth or tokens from one address to another,  2)  creating of a token sell order,  3)  taking of an outstanding token sell order.

Each UTXO has the following fields:

1)  utxo type - The type of utxo.  Possible values are 'transfer' or 'make order'.  'Transfer' types are the standard transferring of eth or tokens to another address.
2)  address of new owner - The address of the new owner.
3)  amount - The amount of eth/tokens to transfer.
4)  tokenprice - This field is only used for 'make order' utxos.  It will be ignored for 'transfer' utxos.  The price (in wei) of each token put up for sale.
5)  currency - The address of the token.  Is the zero address if the currency is ether.  This field should NEVER be set to ether for 'make order' utxos.

Right now, all transactions have a hard coded number of max inputs and max outputs.

There can be up to two inputs and up to four outputs.  Details of each transaction type is described below.

### Transfer transactions

For transfer transactions, the following conditions must be true:

1)  All input and output utxos are type 'transfer'.
2)  All input and output utxos have the same 'currency'.
3)  The sum of the input amounts must be greater or equal than the sum of the output amounts.

Here's a sample transfer transaction where 2 eth UTXOs owned by 0x1 is transferred to 0x2:

inputs:  ['transfer', 0x1,  5,  0,  0x0],   ['transfer', 0x1,   10,  0,  0x0]

outputs:   ['transfer', 0x2,  15, 0, 0x0]


### Make order transactions

For the make order transactions, the following conditions must be true:

1)  All input utxos are type 'transfer'.
2)  At least one of the output utxos is the type 'make order'
3)  All the input and output utxos have the same currency.
4)  The sum of the input amounts must be greater or equal than the sum of the output amounts.

Here's a sample make order transaction where 1 token UTXO owned by 0x1 is transformed into one make order UTXO and one change utxo.

inputs:  ['transfer', 0x1, 10, 0, 0x10]

outputs:  ['make order', 0x1, 5,  100,  0x10],   ['transfer',  0x1, 5, 0, 0x10]


### Take order transactions

For the take order transactions, the following conditions must be true:

1)  There must be exactly 1 'make order' utxo and 1 'transfer' utxo for the inputs.
2)  The input 'transfer' utxo must be ETH currency.
3)  There must be 1 output token transfer to the taker such that the amount is less than or equal to the input 'make order's amount. This utxo specifies how many tokens the taker wants to purchase.
4)  There must be 1 output eth transfer to the maker where the amount of eth transferred is equal to the amount in 3) and the token price in the input make order.
5)  If the input 'make order' is not fully taken, then there must be a remainder 'make order' for the unsold tokens.  The owner of the remainder make order must equal to the owner of the input 'make order'.
6)  There may be a remainder eth order where the amount is no greater than the amount in 2) minus the amount in 4).

Here's a sample take order transaction where the maker is 0x1 and the taker is 0x2.  The taker is planning to purchase 2 tokens.

inputs:  ['make order', 0x1,  5, 100,  0x10],  ['transfer',  0x2,  200, 0,  0x0]

outputs:  ['transfer', 0x2, 2, 0, 0x10]   ['transfer', 0x1, 200, 0, 0x0],   ['make order', 0x1, 3, 100, 0x10]

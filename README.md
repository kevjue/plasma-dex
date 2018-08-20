# Plasma MVP DEX

This is a plasma based implementation of a decentralized exchange.  In fact, this codebase is forked from Omisego's [Minimum Viable Plasma](https://ethresear.ch/t/minimal-viable-plasma/426) implementation.

## Overview

Plasma MVP DEX is split into four main parts: `root_chain`, `root_chain`, `child_chain`, and `webapp`. Below is an overview of each sub-project.

### root_chain

`root_chain` represents the Plasma contract to be deployed to the root blockchain. In our case, this contract is written in Solidity and is designed to be deployed to Ethereum.  This component also contains a standard ERC-20 token with a name of 'PDEX Token', which will be the only supported token to be traded on the demo plasma DEX.

`root_chain` is built using a truffle project, and has deployment and test scripts within the project folder.

`RootChain.sol` is based off of the Plasma design specified in [Minimum Viable Plasma](https://ethresear.ch/t/minimal-viable-plasma/426). Currently, this contract allows a single authority to publish child chain blocks to the root chain. This is *not* a permanent design and is intended to simplify development of more critical components in the short term. 

`PDEXToken.sol` is the ERC20 token.  It uses Zeppelin's StandardToken implementation.

### child_chain

`child_chain` is a Python implementation of a Plasma MVP DEX child chain client. It's useful to think of `child_chain` as analogous to [Parity](https://www.parity.io) or [Geth](https://geth.ethereum.org). This component manages a store of `Blocks` and `Transactions` that are updated when events are fired in the root contract.

`child_chain` also contains an RPC server that enables client interactions. By default, this server runs on port `8546`. 

### webapp

`webapp` is a simple React web app that interacts with the root chain for deposits of eth or pdex token.  It interacts with the child_chain for take_order and make_order requests.

## Getting Started

### Machine

This code has only been tested on an ubuntu 16.04 distrubution running within a VirtualBox Linux machine.  Here are instructions to setup that type of machine:

1)  install virtual box
2)  create a 64-bit linux virtual machine  (memory set to 4GB and hard disk set to 10 GB)
3)  set the virtual machine's network adapter to be attached to a bridged adaptor (this is to enable the host machine to be able to navigate to my dapp that will be running within the virtual machine)
4)  start the virtual machine with the ubuntu iso:  ubuntu-16.04.5-desktop-amd64.iso (can be retrieved here:  http://releases.ubuntu.com/16.04/)

### Dependencies

This repository has scripts that will install nearly all of the linux, npm, and python packages.  However, the user will need to install a few packages manually before being able to use those scripts.  Here are the manual steps the user must first run after the ubuntu machine is created:

1)  update apt-get 'sudo apt-get update'
2)  run the command 'sudo apt-get install -y git' to install git
3)  **within your home directory**, run 'git clone https://github.com/kevjue/plasma-dex' to clone this repo.
4)  run the command 'sudo sh ~/plasma-dex/scripts/install_packages.sh' to install all remaining dependencies.

### Installing and starting root chain

The root chain can be run using ganache-cli.  Once ganache-cli is started, then the smart contracts can be deployed to it using the root_chain's truffle migration scripts.  Here are the commands to install and start the root chain:

1)  Start ganache by running the command 'sh ~/plasma-dex/scripts/startGanache.sh'
2)  Deploy the smart contracts onto ganache by running the command 'sh ~/plasma-dex/scripts/deploy_root_chain.sh' in a new window.
3)  Make sure to note address for the deployed PDEXToken and RootChain smart contracts.  You will need to use them for later steps.

### Installing and starting child chain

The child chain can be installed and started with the following command:

1)  start the child chain by running the command 'sh ~/plasma-dex/scripts/run_child_chain.sh <pdex token address> <root chain address>' (e.g. 'sh ~/plasma-dex/scripts/run_child_chain.sh 0x0c561ff0432605518f3f289d7c236c58e01158ef 0x511c8d42b25955dc5cf7e14c2413aa73a54711a8')
  
### Installing and starting the web app

The web app can be installed and started with the following command:

1)  in a new terminal, start the dapp web app with the command 'sudo sh ~/plasma-dex/scripts/run_web_server.sh <pdex token address> <root chain address>' (e.g. 'sudo sh ~/plasma-dex/scripts/run_web_server.sh 0x0c561ff0432605518f3f289d7c236c58e01158ef 0x511c8d42b25955dc5cf7e14c2413aa73a54711a8')

### Accessing the DEX via a browser

The DEX can be accessed via a chrome brower with the metamask extension installed.  To load the DEX, execute the following commands:

1)  Load chrome with metamask installed.  In metamask, set the network to the ganache instance running in your virtual machine (e.g. with the endpoint as http://<ip address of virtual machine>:8545
2)  Navigate to http://<ip address of virtual machine>
  
## Web App Example

Let's play around a bit:

1)  The above installation scripts already pre-seeded the account with private key (816ac2ffeb67d3ad96883329601848101795574bf8a47f140519666e7004919a) with some eth and some pdex tokens.  You should import this private key into your metamask.  Once you imported the private key, you should see some eth within your wallet. 
2)  You can deposit some eth into the exchange to purchase some tokens.  Start by depositing 50 Eth.  Once the eth is deposited, then you should see your account eth balance set to 50 and your wallet balance slightly below 50 (for the gas used the deposit transaction).
3)  You can purchase tokens from the order book, and subsequently sell any purchased tokens. Note that any submitted orders to the exchange will need to be "mined" before that order shows up in the order book and your exchange balance is updated accordingly.  It takes about 1 minute for the order to be "mined".
4)  You could try loading another account with metamask, and then interact with the exchange using that account.  Note that you will have to transfer some ether and/or tokens to that new account, if you want to make or take any orders with the new account.

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

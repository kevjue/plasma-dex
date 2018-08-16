import React, { Component } from 'react';
import Web3 from 'web3';
import { ERC20ABI, ROOTCHAINABI } from './ABI';

import './App.css';

const ONE_SECOND = 1000;


class WalletInfo extends Component {
    constructor(props) {
	super(props);
	this.state = {ethBalance: null,
		      pdexBalance: null};
	if (this.props.web3 != null && this.props.address != null) {
	    this.props.web3.eth.getBalance(this.props.address,
					   (error, balance) => this.setState({ethBalance: balance.toString(10)}));
	}
	this.interval = null;
    }

    componentDidMount() {
	this.initWalletBalancePoll();
    }
    

    initWalletBalancePoll() {
	if (!this.interval) {
	    this.interval = setInterval(() => {
		if (this.props.address != null) {
		    this.props.web3.eth.getBalance(this.props.address, 
						   (error, balance) => this.setState({ethBalance: this.props.web3.fromWei(balance, 'ether').toString(10)}));
		    this.props.pdexToken.balanceOf(this.props.address,
						   (error, balance) => this.setState({pdexBalance: this.props.web3.fromWei(balance, 'ether').toString(10)}));
		}
	    }, ONE_SECOND)
	}
    }
    

    componentDidUpdate(prevProps) {
	if (prevProps.address !== this.props.address) {
	    if (this.props.address != null) {
		this.props.web3.eth.getBalance(this.props.address, 
					       (error, balance) => this.setState({ethBalance: this.props.web3.fromWei(balance, 'ether').toString(10)}));
		this.props.pdexToken.balanceOf(this.props.address,
					       (error, balance) => this.setState({pdexBalance: this.props.web3.fromWei(balance, 'ether').toString(10)}));
	    }
	}
    }

    render() {
	return (
		<div id='wallet_info'>
		    <h1>Your wallet address</h1>
    		        <p>{this.props.address}</p>
		    <h1>Your wallet balance</h1>
		<p>Eth Balance: {this.state.ethBalance}</p>
 		<p>PDEX Balance: {this.state.pdexBalance}</p>
		</div>
		);
    }
}



class UserExchange extends Component {
    constructor(props) {
	super(props);

	this.state = {ethBalance: null,
		      pdexBalance: null,
		      ethDeposit: null,
		      pdexDeposit: null};
	if (this.props.web3 != null && this.props.address != null) {
	    this.getExchangeBalance(this.props.address,
				    (balances) => this.setState({ethBalance: this.props.web3.fromWei(balances[0], 'ether').toString(10),
								 pdexBalance: this.props.web3.fromWei(balances[1], 'ether').toString(10)}));
	}
	this.handleInputChange = this.handleInputChange.bind(this);
	this.interval = null;
    }


    componentDidMount() {
	this.initExchangeBalancePoll();
    }
    

    initExchangeBalancePoll() {
	if (!this.interval) {
	    this.interval = setInterval(() => {
		if (this.props.web3 != null && this.props.address != null) {
		    this.getExchangeBalance(this.props.address,
					    (balances) => this.setState({ethBalance: this.props.web3.fromWei(balances[0], 'ether').toString(10),
									 pdexBalance: this.props.web3.fromWei(balances[1], 'ether').toString(10)}));
		}
	    }, ONE_SECOND)
	}
    }


    getExchangeBalance(address, callback) {
	if (address == null) {
	    alert("please log into metamask");
	}
	fetch('/jsonrpc/', {
	    method: 'POST',
	    headers: {'Content-Type': 'application/json',
		      'Accept': 'application/json'},
	    body: JSON.stringify({
		'method': 'get_balances',
		'params': [address],
		'jsonrpc': '2.0',
		'id': 0})
	}).then(response => response.json())
	    .then(json => callback(JSON.parse(json["result"])));
    }

    componentDidUpdate(prevProps) {
	if (prevProps.address !== this.props.address) {
	    if (this.props.web3 != null && this.props.address != null) {
		this.getExchangeBalance(this.props.address,
					(balances) => this.setState({ethBalance: this.props.web3.fromWei(balances[0], 'ether').toString(10),
								     pdexBalance: this.props.web3.fromWei(balances[1], 'ether').toString(10)}));
	    }
	}
    }

    handleSubmit(formType, event) {	
	if (formType === 'eth') {
	    this.props.rootChain.depositEth({from: this.props.address,
					     value: this.props.web3.toWei(this.state.ethDeposit, 'ether'),
					     gasPrice: this.props.web3.toWei(10, 'gwei')},
					    function(err, result){})
	}

	if (formType === 'pdex') {
	    this.props.pdexToken.approve(this.props.rootChain.address, this.props.web3.toWei(this.state.pdexDeposit, 'ether'), {from: this.props.address,
																gasPrice: this.props.web3.toWei(10, 'gwei')},
					 (function(err, result) {
					     this.props.rootChain.depositToken(this.props.web3.toWei(this.state.pdexDeposit, 'ether'), {from: this.props.address,
																	gasPrice: this.props.web3.toWei(10, 'gwei')},
									       function(err, result) {})
					 }).bind(this))
	}
	
	event.preventDefault();
    }

    handleInputChange(event) {
	const target = event.target;
	const value = target.value;
	const name = target.name;

	this.setState({
	    [name]: value
	});
    }

    render() {
	return (
		<div id='user_exchange'>
		    <h1>Your exchange balance</h1>
		        <p>Eth Balance: {this.state.ethBalance}</p>
 		        <p>PDEX Balance: {this.state.pdexBalance}</p>
		    <h1>Deposit</h1>
		        <form onSubmit={(e) => this.handleSubmit('eth', e)}>
                            <label>ETH: <input name="ethDeposit" type="text" onChange={this.handleInputChange} /><input type="submit" value="Submit" /></label>
		        </form>
		        <br/>
		        <form onSubmit={(e) => this.handleSubmit('pdex', e)}>
                            <label>PDEX: <input name="pdexDeposit" type="text" onChange={this.handleInputChange} /><input type="submit" value="Submit" /></label>
		        </form>
	        </div>
		);
    }
}


class OrderBook extends Component {
    constructor(props) {
	super(props);

	this.state = {openOrders: []};
	this.interval = null;

	this.handleSubmit = this.handleSubmit.bind(this);	
    }

    componentDidMount() {
	this.initOpenOrdersPoll();
    }

    initOpenOrdersPoll() {
	if (!this.interval) {
	    this.interval = setInterval(() => {
		this.getOpenOrders((result) => this.setState({openOrders: result}));
	    }, ONE_SECOND)
	}
    }

    getOpenOrders(callback) {
	fetch('/jsonrpc/', {
	    method: 'POST',
	    headers: {'Content-Type': 'application/json',
		      'Accept': 'application/json'},
	    body: JSON.stringify({
		'method': 'get_open_orders',
		'params': [],
		'jsonrpc': '2.0',
		'id': 0})
	}).then(response => response.json())
	    .then(json => callback(JSON.parse(json["result"])));
    }

    getTakeOrderTxn(address, utxopos, amount, callback) {
	if (address == null) {
	    alert("please log into metamask");
	}		
	fetch('/jsonrpc/', {
	    method: 'POST',
	    headers: {'Content-Type': 'application/json',
		      'Accept': 'application/json'},
	    body: JSON.stringify({
		'method': 'get_takeorder_txn',
		'params': [address, utxopos, this.props.web3.toWei(amount, 'ether')],
		'jsonrpc': '2.0',
		'id': 0})
	}).then(response => response.json())
	    .then(json => callback(json["result"]));
    }

    submitSignedTakeorderTxn(address, utxopos, amount, takeorder_hex, signature, callback) {
	if (address == null) {
	    alert("please log into metamask");
	}
	fetch('/jsonrpc/', {
	    method: 'POST',
	    headers: {'Content-Type': 'application/json',
		      'Accept': 'application/json'},
	    body: JSON.stringify({
		'method': 'submit_signed_takeorder_txn',
		'params': [address, utxopos, this.props.web3.toWei(amount, 'ether'), takeorder_hex, signature],
		'jsonrpc': '2.0',
		'id': 0})
	}).then(response => response.json())
	    .then(json => callback(json["result"]));
    }
    
    handleSubmit(event) {
	event.preventDefault();
	var maxOrderSize = parseFloat(event.target.attributes['max_num'].value);
	var orderSize = parseFloat(event.target.firstChild.value);
	var utxoPos = parseInt(event.target.attributes['utxo_pos'].value, 10);
	
	if ((orderSize > maxOrderSize) || (orderSize < 0)) {
	    alert("invalid order size");
	    return;
	}

	this.getTakeOrderTxn(this.props.address, utxoPos, orderSize,
			     (response) => {
				 if (response === null) {
				     alert("No valid token UTXOs");
				 } else {
				     var params = [response, this.props.address];
				     var method = 'personal_sign';
				 
				     this.props.web3.currentProvider.sendAsync(
					 {
					     'method': method,
					     'params': params,
					     'signingAddr': this.props.address
					 },
					 (err, result) => this.submitSignedTakeorderTxn(this.props.address, utxoPos, orderSize, response, result.result,
											(submit_status) => (submit_status === true) ? alert("order submitted") : alert("submission failed. please try again")));
				 }
			     });
    }
    
    render () {
	return (
		<div className="CreateOrder">
		    <h1>Order Book</h1>
		    <div className="scrollit">
		       <table>
		           <tbody className="scrollit">
		               <tr>
		                   <th>Price</th>
		                   <th>Number of PDEX tokens for Sale</th>
		                   <th>Seller</th>
		                   <th>Purchase</th>
		               </tr>
		               {this.state.openOrders.map((openOrder) =>
							  <tr key={openOrder[3]}>
							      <th>{this.props.web3.fromWei(openOrder[1], 'ether')}</th>
							      <th>{this.props.web3.fromWei(openOrder[0], 'ether')}</th>
							      <th>{openOrder[2]}</th>
							      <th>
							          <form utxo_pos={openOrder[3]} max_num={this.props.web3.fromWei(openOrder[0], 'ether')} onSubmit={this.handleSubmit}>
							              <input name="numToBuy" type="text" />
					                              <input type="submit" value="Buy" />
					                          </form>
							      </th>
							  </tr>)}

		           </tbody>
	                </table>
		    </div>
		</div>
	);
    }
}


class CreateOrder extends Component {
    constructor(props) {
	super(props);

	this.state = {ethBalance: null,
		      pdexBalance: null,
		      ethDeposit: null,
		      pdexDeposit: null};

	this.handleSubmit = this.handleSubmit.bind(this);
	this.handleInputChange = this.handleInputChange.bind(this);
    }
    
    getMakeorderTxn(address, amount, tokenprice, callback) {
	if (address == null) {
	    alert("please log into metamask");
	}			
	fetch('/jsonrpc/', {
	    method: 'POST',
	    headers: {'Content-Type': 'application/json',
		      'Accept': 'application/json'},
	    body: JSON.stringify({
		'method': 'get_makeorder_txn',
		'params': [address, window.TOKEN_ADDRESS,
			   this.props.web3.toWei(amount, 'ether'),
			   this.props.web3.toWei(tokenprice, 'ether')],
		'jsonrpc': '2.0',
		'id': 0})
	}).then(response => response.json())
	    .then(json => callback(json["result"]));
    }

    submitSignedMakeorderTxn(address, amount, tokenprice, makeorder_hex, signature, callback) {
	if (address == null) {
	    alert("please log into metamask");
	}
	fetch('/jsonrpc/', {
	    method: 'POST',
	    headers: {'Content-Type': 'application/json',
		      'Accept': 'application/json'},
	    body: JSON.stringify({
		'method': 'submit_signed_makeorder_txn',
		'params': [address, window.TOKEN_ADDRESS, this.props.web3.toWei(amount, 'ether'), this.props.web3.toWei(tokenprice, 'ether'), makeorder_hex, signature],
		'jsonrpc': '2.0',
		'id': 0})
	}).then(response => response.json())
	    .then(json => callback(json["result"]));
    }

    handleSubmit(event) {
	event.preventDefault();		
	this.getMakeorderTxn(this.props.address, this.state.numToSell, this.state.pricePerToken,
			     (response) => {
				 if (response === null) {
				     alert("No valid token UTXOs");
				 } else {
				     var params = [response, this.props.address];
				     var method = 'personal_sign';

				     this.props.web3.currentProvider.sendAsync(
					 {
					     'method': method,
					     'params': params,
					     'signingAddr': this.props.address
					 }, (err, result) => this.submitSignedMakeorderTxn(this.props.address, this.state.numToSell, this.state.pricePerToken, response, result.result,
											   (submit_status) => (submit_status === true) ? alert("order submitted") : alert("submission failed. please try again")));
				 }
			     });
	
	event.preventDefault();	
    }

    handleInputChange(event) {
	const target = event.target;
	const value = target.value;
	const name = target.name;

	this.setState({
	    [name]: value
	});
    }
    
    render () {
	return (
		<div className="CreateOrder">
		    <h1>Create Order</h1>
		        <form onSubmit={this.handleSubmit}>
		            <label>Number to PDEX tokens to sell: <input name="numToSell" type="text" onChange={this.handleInputChange} /></label>
		            <br/>
		            <br/>		
		            <label>Sale price per PDEX token (in Eth): <input name="pricePerToken" type="text" onChange={this.handleInputChange} /></label>
		            <br/>
		            <br/>
		            <input type="submit" value="Submit" />
		        </form>
		</div>
	);
    }
}


class Orders extends Component {
    render() {
	return (
		<div id="orders">
		    <OrderBook web3={this.props.web3} address={this.props.address} />
	    	    <CreateOrder web3={this.props.web3} address={this.props.address} />
		</div>
	);
    }
}


class App extends Component {
    constructor(props) {
	super(props);
	
	this.state = {web3: null,
		      account: null,
		      pdexToken: null}
	this.interval = null;
    }

    componentDidMount() {
	this.initWeb3Poll();
    }

    initWeb3Poll() {
	if (!this.interval) {
	    this.interval = setInterval(() => {
		    var web3 = window.web3;
		    
		    if (typeof web3 !== 'undefined') {
			web3 = new Web3(web3.currentProvider);
			
			this.setState({web3: web3});
			console.log('Injected web3 detected.');

			this.state.web3.eth.getAccounts((error, accounts) => {
			    this.setState({address: accounts[0]})});

			this.setState({pdexToken: web3.eth.contract(ERC20ABI).at(window.TOKEN_ADDRESS)});
			this.setState({rootChain: web3.eth.contract(ROOTCHAINABI).at(window.ROOT_CHAIN_ADDRESS)});
		    };
	        },
		ONE_SECOND);
	}
    }

    render() {
	return (
		<div className="App">
		<WalletInfo web3={this.state.web3} address={this.state.address} pdexToken={this.state.pdexToken}/>
		<UserExchange web3={this.state.web3} address={this.state.address} rootChain={this.state.rootChain} pdexToken={this.state.pdexToken}/>
		<Orders web3={this.state.web3} address={this.state.address} />
		</div>
		);
    }
}

export default App;

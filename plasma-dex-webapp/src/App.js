import React, { Component } from 'react';
import Web3 from 'web3';
import { ERC20ABI } from './ABI';

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
    }

    componentDidUpdate(prevProps) {
	if (prevProps.address !== this.props.address) {
	    if (this.props.address != null) {
		this.props.web3.eth.getBalance(this.props.address, 
					       (error, balance) => this.setState({ethBalance: balance.toString(10)}));
		this.props.pdexToken.balanceOf(this.props.address,
					      (error, balance) => this.setState({pdexBalance: balance.toString(10)}));
	    }
	}
    }

    render() {
	return (
		<div>
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
		      pdexBalance: null};
	if (this.props.web3 != null && this.props.address != null) {
	    this.getExchangeBalance(this.props.address,
				    (balances) => this.setState({ethBalance: balances[0],
								 pdexBalance: balances[1]}));
	}		
    }

    getExchangeBalance(address, callback) {
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
	    this.getExchangeBalance(this.props.address,
				    (balances) => this.setState({ethBalance: balances[0],
								 pdexBalance: balances[1]}));
	}
    }    

    render() {
	return (
		<div>
		    <h1>Your exchange balance</h1>
		        <p>Eth Balance: {this.state.ethBalance}</p>
 		        <p>PEX Balance: {this.state.pdexBalance}</p>
		    <h1>Deposit</h1>
		<p><label>ETH: <input type="text" onChange={this.handleChange} /><input type="submit" value="Submit" />
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

			this.setState({pdexToken: web3.eth.contract(ERC20ABI).at('0x0c561ff0432605518f3f289d7c236c58e01158ef')});
		    };		
	        },
		ONE_SECOND);
	}
    }

    render() {
	return (
		<div className="App">
		<WalletInfo web3={this.state.web3} address={this.state.address} pdexToken={this.state.pdexToken}/>
		<UserExchange web3={this.state.web3} address={this.state.address}/>
		</div>
		);
    }
}

export default App;

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
	event.preventDefault();
	
	if (formType === 'eth') {
	    this.props.rootChain.depositEth({from: this.props.address,
					     value: this.props.web3.toWei(this.state.ethDeposit, 'ether')},
					    function(err, result){})
	}

	if (formType === 'pdex') {
	    alert(this.state.pdexDeposit);
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
 		        <p>PEX Balance: {this.state.pdexBalance}</p>
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
			this.setState({rootChain: web3.eth.contract(ROOTCHAINABI).at('0x511c8d42b25955dc5cf7e14c2413aa73a54711a8')});
		    };
	        },
		ONE_SECOND);
	}
    }

    render() {
	return (
		<div className="App">
		<WalletInfo web3={this.state.web3} address={this.state.address} pdexToken={this.state.pdexToken}/>
		<UserExchange web3={this.state.web3} address={this.state.address} rootChain={this.state.rootChain}/>
		</div>
		);
    }
}

export default App;

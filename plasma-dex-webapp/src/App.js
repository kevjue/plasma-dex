import React, { Component } from 'react';
import Web3 from 'web3'
import PDEXContract from 'PDEXContract.json'

import './App.css';


class WalletInfo extends Component {
    constructor(props) {
	super(props);
	this.state = {ethBalance: null,
		      pexBalance: null};
	if (this.props.web3 != null && this.props.address != null) {
	    this.props.web3.eth.getBalance(this.props.address,
					   (error, balance) => this.setState({ethBalance: balance.toString(10)}));
	}
    }

    componentDidUpdate(prevProps) {
	if (prevProps.address != this.props.address) {
	    if (this.props.address != null) {
		this.props.web3.eth.getBalance(this.props.address, 
					       (error, balance) => this.setState({ethBalance: balance.toString(10)}))
		    }
	}
    }

    render() {
	return (
		<div>
		    <p>Your wallet address: {this.props.address}</p>
		    <p>Eth Balance: {this.state.ethBalance}</p>
 		    <p>PEX Balance: {this.state.pexBalance}</p>
		</div>
		);
    }
}





const ONE_SECOND = 1000;

class App extends Component {
    constructor(props) {
	super(props);
	this.state = {web3: null,
		      account: null};
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
		    }; 
		},
		ONE_SECOND);
	}
    }

    render() {
	return (
		<div className="App">
		    <WalletInfo web3={this.state.web3} address={this.state.address}/>
		</div>
		);
    }
}

export default App;

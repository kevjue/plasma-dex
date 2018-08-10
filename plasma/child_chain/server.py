import click

from werkzeug.wrappers import Request, Response
from werkzeug.serving import run_simple
from jsonrpc import JSONRPCResponseManager, dispatcher
from plasma.child_chain.child_chain import ChildChain
from plasma.config import plasma_config
from plasma.root_chain.deployer import Deployer
from web3 import Web3, WebsocketProvider

root_chain = None
token = None
child_chain = None


@Request.application
def application(request):
    # Dispatcher is dictionary {<method_name>: callable}
    dispatcher["submit_block"] = lambda block: child_chain.submit_block(block)
    dispatcher["apply_transaction"] = lambda transaction: child_chain.apply_transaction(transaction)
    dispatcher["get_transaction"] = lambda blknum, txindex: child_chain.get_transaction(blknum, txindex)
    dispatcher["get_current_block"] = lambda: child_chain.get_current_block()
    dispatcher["get_current_block_num"] = lambda: child_chain.get_current_block_num()
    dispatcher["get_block"] = lambda blknum: child_chain.get_block(blknum)
    dispatcher["get_balances"] = lambda address: child_chain.get_balances(Web3.toChecksumAddress(address))
    dispatcher["get_utxos"] = lambda address, currency: child_chain.get_utxos(Web3.toChecksumAddress(address), currency)
    dispatcher["get_open_orders"] = lambda: child_chain.get_open_orders()
    dispatcher["get_makeorder_txn"] = lambda address, currency, amount, tokenprice: child_chain.get_makeorder_txn(address, currency, int(amount), int(tokenprice))[1]
    dispatcher["submit_signed_makeorder_txn"] = lambda address, currency, amount, tokenprice, makeorder_txn_hex, signature: child_chain.submit_signed_makeorder_txn(address, currency, int(amount), int(tokenprice), makeorder_txn_hex, signature)
    dispatcher["get_takeorder_txn"] = lambda address, utxopos, amount: child_chain.get_takeorder_txn(address, int(utxopos), int(amount))[1]
    dispatcher["submit_signed_takeorder_txn"] = lambda address, utxopos, amount, takeorder_txn_hex, signature: child_chain.submit_signed_takeorder_txn(address, int(utxopos), int(amount), takeorder_txn_hex, signature)
    response = JSONRPCResponseManager.handle(
        request.data, dispatcher)
    return Response(response.json, mimetype='application/json')


@click.command()
@click.option('--root_chain_address', help="The ethereum address of the root chain smart contract", required=True)
@click.option('--eth_node_endpoint', help="The endpoint of the eth node", required=True)
def main(root_chain_address, eth_node_endpoint):
    global child_chain
    root_chain_address = Web3.toChecksumAddress(root_chain_address)
    
    root_chain = Deployer(eth_node_endpoint).get_contract_at_address("RootChain", root_chain_address, concise=False)
    print("root_chain is %s" % root_chain)
    child_chain = ChildChain(root_chain, eth_node_endpoint)

    run_simple('0.0.0.0', 8546, application)
    

if __name__ == '__main__':
    main()

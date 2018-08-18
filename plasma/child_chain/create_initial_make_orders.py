import click
import sys
from web3 import Web3
from plasma.client.client import Client
from plasma.utils import utils


@click.command()
@click.option('--token_address', help="The ethereum address of the pdex token smart contract", required=True)
@click.option('--root_chain_address', help="The ethereum address of the root chain smart contract", required=True)
def main(token_address, root_chain_address):
    client = Client(root_chain_address)
    
    maker_address = '0x0af467F2f6c20e3543B8a2a453e70DF034714aEB'
    make_order_hex = client.get_makeorder_txn(maker_address, token_address, Web3.toWei(10, 'ether'), Web3.toWei(1, 'ether'))
    if make_order_hex == None:
        print("No valid utxos to create make order txn")
        sys.exit(0)
        
    make_order_hash = utils.hashPersonalMessage(make_order_hex)
    signature = utils.sign(make_order_hash, bytes(bytearray.fromhex('46155f862a2249f0ee6d69122ead4ec56cf12a71049a3105a90b9708d7103f77')))
    client.submit_signed_makeorder_txn(maker_address, token_address, Web3.toWei(10, 'ether'), Web3.toWei(1, 'ether'), make_order_hex, signature.hex())

    
if __name__ == '__main__':
    main()

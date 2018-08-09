import click
import os
import datetime
from ethereum import utils
from plasma.utils.utils import confirm_tx
from plasma.client.client import Client
from plasma.child_chain.transaction import Transaction
from plasma.client.exceptions import ChildChainServiceError


CONTEXT_SETTINGS = dict(
    help_option_names=['-h', '--help']
)
NULL_ADDRESS = b'\x00' * 20


@click.group(context_settings=CONTEXT_SETTINGS)
@click.pass_context
def cli(ctx):
    ctx.obj = Client(os.environ['ROOT_CHAIN_ADDRESS'])


def client_call(fn, argz=(), successmessage=""):
    try:
        output = fn(*argz)
        if successmessage:
            print(successmessage)
        return output
    except ChildChainServiceError as err:
        print("Error:", err)
        print("additional details can be found from the child chain's server output")


@cli.command()
@click.argument('amount', required=True, type=int)
@click.argument('address', required=True)
@click.pass_obj
def deposit(client, amount, address):
    client.deposit(amount, address)
    print("Deposited {0} to {1}".format(amount, address))


@cli.command()
@click.argument('address', required=True)
@click.argument('currency', required=True)
@click.argument('amount', required=True, type=float)
@click.argument('tokenprice', required=True, type=int)
@click.argument('key', required=True)
@click.pass_obj
def makeorder(client, address, currency, amount, tokenprice, key):
    utxos = client_call(client.get_utxos, [address, currency])

    amount = int(amount * 1e18)
    # Find a utxos with enough tokens
    for utxo in utxos:
        if utxo[3] >= amount:
            # generate the transaction object

            change_amount = utxo[3] - amount

            if change_amount:
                tx = Transaction(Transaction.TxnType.make_order,
                                 utxo[0], utxo[1], utxo[2],
                                 0, 0, 0,
                                 Transaction.UTXOType.make_order, utils.normalize_address(address), amount, tokenprice, utils.normalize_address(currency),
                                 Transaction.UTXOType.transfer, utils.normalize_address(address), change_amount, 0, utils.normalize_address(currency),
                                 0, NULL_ADDRESS, 0, 0, NULL_ADDRESS,
                                 0, NULL_ADDRESS, 0, 0, NULL_ADDRESS)
            else:
                tx = Transaction(Transaction.TxnType.make_order,
                                 utxo[0], utxo[1], utxo[2],
                                 0, 0, 0,
                                 Transaction.UTXOType.make_order, utils.normalize_address(address), amount, tokenprice, utils.normalize_address(currency),
                                 0, NULL_ADDRESS, 0, 0, NULL_ADDRESS,
                                 0, NULL_ADDRESS, 0, 0, NULL_ADDRESS,
                                 0, NULL_ADDRESS, 0, 0, NULL_ADDRESS)                

            tx.sign1(utils.normalize_key(key))

            client_call(client.apply_transaction, [tx], "Sent transaction")
            break

    
@cli.command()
@click.argument('key', required=True)
@click.pass_obj
def submitblock(client, key):
    print("submitblock called at %s" % str(datetime.datetime.now()))
    # Get the current block, already decoded by client
    block = client_call(client.get_current_block)
    print("current block has %d txns" % len(block.transaction_set))

    # If there are no transactions in the current block, then don't submit it
    if len(block.transaction_set) == 0:
        return

    # Sign the block
    block.make_mutable()
    normalized_key = utils.normalize_key(key)
    block.sign(normalized_key)

    client_call(client.submit_block, [block], "Submitted current block")


@cli.command()
@click.argument('blknum', required=True, type=int)
@click.argument('txindex', required=True, type=int)
@click.argument('oindex', required=True, type=int)
@click.argument('key1')
@click.argument('key2', required=False)
@click.pass_obj
def withdraw(client,
             blknum, txindex, oindex,
             key1, key2):

    # Get the transaction's block, already decoded by client
    block = client_call(client.get_block, [blknum])

    # Create a Merkle proof
    tx = block.transaction_set[txindex]
    block.merklize_transaction_set()
    proof = block.merkle.create_membership_proof(tx.merkle_hash)

    # Create the confirmation signatures
    confirmSig1, confirmSig2 = b'', b''
    if key1:
        confirmSig1 = confirm_tx(tx, block.merkle.root, utils.normalize_key(key1))
    if key2:
        confirmSig2 = confirm_tx(tx, block.merkle.root, utils.normalize_key(key2))
    sigs = tx.sig1 + tx.sig2 + confirmSig1 + confirmSig2

    client.withdraw(blknum, txindex, oindex, tx, proof, sigs)
    print("Submitted withdrawal")


@cli.command()
@click.argument('owner', required=True)
@click.argument('blknum', required=True, type=int)
@click.argument('amount', required=True, type=int)
@click.pass_obj
def withdrawdeposit(client, owner, blknum, amount):
    deposit_pos = blknum * 1000000000
    client.withdraw_deposit(owner, deposit_pos, amount)
    print("Submitted withdrawal")

    
@cli.command()
@click.argument('blknum', required=True, type=int)
@click.pass_obj
def getblock(client, blknum):
    block = client_call(client.get_block, [blknum])
    print(block)


@cli.command()
@click.argument('address', required=True)
@click.pass_obj
def getbalances(client, address):
    balances = client_call(client.get_balances, [address])
    print(balances)


@cli.command()
@click.pass_obj
def getopenorders(client):
    open_orders = client_call(client.get_open_orders)
    print([("%f tokens" % (int(e[0])/1e18), str(e[1]) + " Wei", "0x" + e[2].hex()) for e in open_orders])

    
@cli.command()
@click.pass_obj
def takeorder():
    pass
    
    
if __name__ == '__main__':
    cli()

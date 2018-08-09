import rlp
from ethereum import utils
from web3 import Web3
import json

from plasma.utils.utils import unpack_utxo_pos, get_sender, recoverPersonalSignature
from .block import Block
from .exceptions import (InvalidBlockMerkleException,
                         InvalidBlockSignatureException,
                         InvalidTxSignatureException, TxAlreadySpentException,
                         TxAmountMismatchException, InvalidOutputIndexNumberException,
                         InvalidTxCurrencyMismatch)
from .transaction import Transaction
from .root_event_listener import RootEventListener

ZERO_ADDRESS = b'\x00' * 20
ZERO_SIGNATURE = b'0x00' * 65

class ChildChain(object):

    def __init__(self, root_chain, eth_node_endpoint):
        self.root_chain = root_chain
        self.blocks = {}
        self.child_block_interval = 1000
        self.current_block_number = self.child_block_interval
        self.current_block = Block()

        self.root_chain_event_listener = RootEventListener(root_chain, ['Deposit', 'ExitStarted'], eth_node_endpoint, confirmations=0)

        # Register event listeners
        self.root_chain_event_listener.on('Deposit', self.apply_deposit)
        self.root_chain_event_listener.on('ExitStarted', self.apply_exit)

        self.unspent_utxos = {}
        self.open_orders = {}
        

    def apply_exit(self, event):
        event_args = event['args']
        utxo_pos = event_args['utxoPos']
        self.mark_utxo_spent(*unpack_utxo_pos(utxo_pos))

    def apply_deposit(self, event):
        event_args = event['args']

        depositor = event_args['depositor']
        blknum = event_args['depositBlock']
        token = event_args['token']
        amount = event_args['amount']

        deposit_tx = Transaction(Transaction.TxnType.transfer,
                                 0, 0, 0,
                                 0, 0, 0,
                                 Transaction.UTXOType.transfer, depositor, amount, 0, token,
                                 0, ZERO_ADDRESS, 0, 0, ZERO_ADDRESS,
                                 0, ZERO_ADDRESS, 0, 0, ZERO_ADDRESS,
                                 0, ZERO_ADDRESS, 0, 0, ZERO_ADDRESS)
        deposit_block = Block([deposit_tx])

        self.blocks[blknum] = deposit_block

        print("Child Chain:  Applied Deposit on blknum %d\n %s" % (blknum, deposit_tx))
        
        if depositor not in self.unspent_utxos:
            self.unspent_utxos[Web3.toChecksumAddress(depositor)] = {}
        self.unspent_utxos[Web3.toChecksumAddress(depositor)][(blknum, 0, 0)] = True

    def apply_transaction(self, transaction):
        tx = rlp.decode(utils.decode_hex(transaction), Transaction)

        # Validate the transaction
        self.validate_tx(tx)

        # Mark the inputs as spent
        self.mark_utxo_spent(tx.blknum1, tx.txindex1, tx.oindex1)
        self.mark_utxo_spent(tx.blknum2, tx.txindex2, tx.oindex2)

        self.current_block.transaction_set.append(tx)
        print("Child Chain:  Applied Transaction\n %s" % tx)

        if tx.blknum1 != 0:
            utxo1 = self._get_input_info(tx.blknum1, tx.txindex1, tx.oindex1, tx, 1)
            if utxo1['utxotype'] == Transaction.UTXOType.make_order:
                self.open_orders.pop((tx.blknum1, tx.txindex1, tx.oindex1))
            else:
                self.unspent_utxos[Web3.toChecksumAddress(utxo1['owner'])].pop((tx.blknum1, tx.txindex1, tx.oindex1))

        if tx.blknum2 != 0:
            utxo2 = self._get_input_info(tx.blknum2, tx.txindex2, tx.oindex2, tx, 2)
            if utxo2['utxotype'] == Transaction.UTXOType.make_order:
                self.open_orders.pop((tx.blknum2, tx.txindex2, tx.oindex2))
            else:
                self.unspent_utxos[Web3.toChecksumAddress(utxo2['owner'])].pop((tx.blknum2, tx.txindex2, tx.oindex2))

    def _get_input_info(self, blknum, txidx, oindex, spending_tx, spending_utxo_num):

        transaction = self.blocks[blknum].transaction_set[txidx]
        if oindex == 0:
            utxotype = transaction.utxotype1
            owner = transaction.newowner1
            amount = transaction.amount1
            tokenprice = transaction.tokenprice1
            spent = transaction.spent1
            cur = transaction.cur1
        elif oindex == 1:
            utxotype = transaction.utxotype2
            owner = transaction.newowner2
            amount = transaction.amount2
            tokenprice = transaction.tokenprice2
            spent = transaction.spent2
            cur = transaction.cur2
        elif oindex == 2:
            utxotype = transaction.utxotype3
            owner = transaction.newowner3
            amount = transaction.amount3
            tokenprice = transaction.tokenprice3
            spent = transaction.spent3
            cur = transaction.cur3
        elif oindex == 3:
            utxotype = transaction.utxotype4
            owner = transaction.newowner4
            amount = transaction.amount4
            tokenprice = transaction.tokenprice4
            spent = transaction.spent4
            cur = transaction.cur4
        else:
            raise InvalidOutputIndexNumberException("invalid utxo oindex number: %d" % oindex)

        spending_tx_hash = None
        spending_sig = None
        if spending_tx and spending_utxo_num:
            spending_tx_hash = spending_tx.hash

            if spending_utxo_num == 1:
                spending_sig = spending_tx.sig1
            elif spending_utxo_num == 2:
                spending_sig = spending_tx.sig2

        return {'utxotype': utxotype,
                'owner': owner,
                'amount': amount,
                'currency': cur,
                'tokenprice': tokenprice,
                'spent': spent,
                'spending_tx_hash': spending_tx_hash,
                'spending_sig': spending_sig}


    def _verify_signature(self, inputs, tx):
        if (tx.sigtype  == Transaction.SigType.utxo):
            for input_utxo in inputs:
                if (input_utxo['spending_sig'] == ZERO_SIGNATURE or get_sender(input_utxo['spending_tx_hash'], input_utxo['spending_sig']) != input_utxo['owner']):
                    raise InvalidTxSignatureException()
        elif (tx.sigtype == Transaction.SigType.txn):
            if (tx.txnsig == ZERO_SIGNATURE):
                raise InvalidTxSignatureException()                
            
            signature_address = recoverPersonalSignature(tx.readable_str, tx.txnsig)

            for input_utxo in inputs:
                if input_utxo['owner'] != signature_address:
                    raise InvalidTxSignatureException()                
            
 
    def _validate_transfer_tx(self, tx, inputs, outputs):
        input_amount = 0
        tx_cur = None
        self._verify_signature(inputs, tx)
        for input in inputs:
            if input['utxotype'] != Transaction.UTXOType.transfer:
                raise InvalidUTXOType("invalid utxo input type (%s) for tx type (%s)" % (input['utxotype'].name, tx.txntype.name))

            if input['spent']:
                raise TxAlreadySpentException('failed to validate tx')

            if tx_cur == None:
                tx_cur = input['currency']

            if input['currency'] != tx_cur:
                raise InvalidTxCurrencyMismatch("currency mismatch in txn.  txn currency (%s); utxo currency (%s)" % (tx_cur, input['currency']))

            input_amount += input['amount']

        output_amount = 0
        for output in outputs:
            if output['utxotype'] != Transaction.UTXOType.transfer:
                raise InvalidUTXOType("invalid utxo output type (%s) for tx type (%s)" % (output['utxotype'].name, tx.txntype.name))

            output_amount += output['amount']

            if output['currency'] != tx_cur:
                raise InvalidTxCurrencyMismatch("currency mismatch in txn.  txn currency (%s); utxo currency (%s)" % (tx_cur, output['currency']))                
            
        if input_amount < output_amount:
            raise TxAmountMismatchException('failed to validate tx')


    def _validate_make_order_tx(self, tx, inputs, outputs):
        input_amount = 0
        tx_cur = None
        self._verify_signature(inputs, tx)        
        for input in inputs:
            if input['utxotype'] != Transaction.UTXOType.transfer:
                raise InvalidUTXOType("invalid utxo input type (%s) for tx type (%s)" % (input['utxotype'].name, tx.txntype.name))

            if input['spent']:
                raise TxAlreadySpentException('failed to validate tx')

            if tx_cur == None:
                tx_cur = input['currency']
                if tx_cur == ZERO_ADDRESS:
                    raise InvalidUTXOInputType("currency for input UTXO to make_order tx must NOT be Eth")

            if input['currency'] != tx_cur:
                raise InvalidTxCurrencyMismatch("currency mismatch in txn.  txn currency (%s); utxo currency (%s)" % (tx_cur, input['currency']))

            input_amount += input['amount']

        # At least one of the outputs must be a make_order utxo.
        output_amount = 0
        has_make_order_utxo = False
        for output in outputs:
            if output['utxotype'] == Transaction.UTXOType.make_order:
                has_make_order_utxo = True
                
            if output['currency'] != tx_cur:
                raise InvalidTxCurrencyMismatch("currency mismatch in txn.  txn currency (%s); utxo currency (%s)" % (tx_cur, output['currency']))

            output_amount += output['amount']

        if not has_make_order_utxo:
            raise InvalidTx()
            
        if input_amount < output_amount:
            raise TxAmountMismatchException('failed to validate tx')


    def _validate_take_order_tx(self, tx, inputs, outputs):
        make_order_utxo_input = None
        transfer_eth_utxo_input = None
        
        self._verify_signature(inputs, tx)        
        for input in inputs:
            # This transaction type requires the following inputs
            # 1) one of the inputs is a make_order utxo.
            # 2) one of the inputs is a transfer utxo with currency eth.
            if input['utxotype'] == Transaction.UTXOType.make_order:
                make_order_utxo_input = input
            
            if input['utxotype'] == Transaction.UTXOType.transfer:
                transfer_eth_utxo_input = None
                if input['currency'] != ZERO_ADDRESS:
                    raise InvalidTxCurrencyMismatch("in take_order tx, utxo transfer input must have Eth currency")

            if input['spent']:
                raise TxAlreadySpentException('failed to validate tx')

        if make_order_utxo_input == None or \
                transfer_eth_utxo_input == None:
            raise InvalidUTXOType("invalid utxo input types for take_order tx")

        # Find out if the taker is going to take the full order or just a fraction of it.
        total_tokens_to_purchase = min(transfer_eth_utxo_input.amount / make_order_utxo_input.token_price, make_order_utxo_input.amount)

        # Find out how much the taker should pay for the order
        eth_payment_amount = total_token_to_purchase * make_order.token_price

        # Find out how much leftover eth for the taker (in the case the taker is purchasing the full order)
        remainder_eth = transfer_eth_utxo_input.amount - eth_payment_amount

        # Find out how much leftover make order (in the case the taker is purchasing a fraction of the order)
        remainder_make_order = make_order_utxo_input.amount - total_tokens_to_purchase

        token_transfer_utxo_output = None
        eth_payment_utxo_output = None
        remainder_eth_utxo_output = None
        remainder_make_order_output = None
        for output in outputs:
            if output['utxotype'] == Transaction.UTXOType.transfer:
                if output['currency'] != ZERO_ADDRESS:
                    # Is the the token_transfer_utxo_output
                    if output['currency'] != make_order_utxo_input['currency']:
                        raise InvalidTxCurrencyMismatch("currency mismatch in txn.  txn currency (%s); utxo currency (%s)" % (tx_cur, output['currency']))

                    if output['amount'] != total_tokens_to_purchase:
                        raise InvalidUTXOOutput("amount of tokens transfer is incorrect. UTXO value - %d;  correct value - %d" % (output['amount'], total_tokens_to_purchase))

                    token_transfer_utxo_output = output
                elif output['currency'] == ZERO_ADDRESS:
                    if output['newowner'] == make_order_utxo_input['owner'] and \
                            output['amount'] == eth_payment_amount:
                        # Is the eth payment utxo to the maker
                        eth_payment_utxo_output = output
                    elif output['amount'] == remainder_eth:
                        # Is the eth remainder utxo
                        remainder_eth_utxo_output = output
                    else:
                        raise InvalidUTXOOutput("invalid eth transfer UTXO: %s" % (str(output)))
            elif output['utxotype'] == Transaction.UTXOType.make_order and \
                    output['amount'] == remainder_make_order_output and \
                    output['tokenprice'] == make_order_utxo_input['tokenprice'] and \
                    output['newowner'] == make_order_utxo_input['owner'] and \
                    output['currency'] == make_order_utxo_input['currency']:
                # Is the remainder make order
                remainder_make_order_output = output
            else:
                raise InvalidUTXOOutput("invalid eth transfer UTXO: %s" % (str(output)))
                
        if total_tokens_to_purchase > 0 and token_transfer_utxo_output == None:
            raise InvalidUTXOOutput("must have a token transfer utxo for token purchase")
        
        if eth_payment_amount > 0 and eth_payment_utxo_output == None:
            raise InvalidUTXOOutput("must have a eth transfer utxo for token purchase payment")

        if remainder_eth > 0 and remainder_eth_utxo_output == None:
            raise InvalidUTXOOutput("must have a eth transfer utxo for remainder eth from token purchase payment")

        if remainder_make_order > 0 and remainder_make_order_output == None:
            raise InvalidUTXOOutput("must have a make order utxo for remainder token from token purchase")
        

    def validate_tx(self, tx):
        inputs = []  # dict with keys of (utxotype, owner, amount, currency, tokenprice, spent, spender, signature)
        outputs = [] # dict with keys of (utxotype, newowner, amount, tokenprice, currency)

        for i_blknum, i_txidx, i_oidx, idx in [(tx.blknum1, tx.txindex1, tx.oindex1, 0), (tx.blknum2, tx.txindex2, tx.oindex2, 1)]:
            if i_blknum != 0:
                inputs.append(self._get_input_info(i_blknum, i_txidx, i_oidx, tx, idx+1))

        for o_utxotype, o_newowner, o_amount, o_tokenprice, o_currency in [(tx.utxotype1, tx.newowner1, tx.amount1, tx.tokenprice1, tx.cur1),
                                                                           (tx.utxotype2, tx.newowner2, tx.amount2, tx.tokenprice2, tx.cur2),
                                                                           (tx.utxotype3, tx.newowner3, tx.amount3, tx.tokenprice3, tx.cur3),
                                                                           (tx.utxotype4, tx.newowner4, tx.amount4, tx.tokenprice4, tx.cur4)]:
            if o_utxotype != 0:
                outputs.append({'utxotype': o_utxotype,
                                'newowner': o_newowner,
                                'amount': o_amount,
                                'tokenprice': o_tokenprice,
                                'currency': o_currency})

        if tx.txntype == Transaction.TxnType.transfer:
            self._validate_transfer_tx(tx, inputs, outputs)
        elif tx.txntype == Transaction.TxnType.make_order:
            self._validate_make_order_tx(tx, inputs, outputs)
        elif tx.txntype == Transaction.TxnType.take_order:
            self._validate_take_order_tx(tx, inputs, outputs)
        
        
    def mark_utxo_spent(self, blknum, txindex, oindex):
        if blknum == 0:
            return

        if oindex == 0:
            self.blocks[blknum].transaction_set[txindex].spent1 = True
        elif oindex == 1:
            self.blocks[blknum].transaction_set[txindex].spent2 = True
        elif oindex == 2:
            self.blocks[blknum].transaction_set[txindex].spent3 = True
        elif oindex == 3:
            self.blocks[blknum].transaction_set[txindex].spent3 = True
            

    def submit_block(self, block):
        block = rlp.decode(utils.decode_hex(block), Block)
        if block.merklize_transaction_set() != self.current_block.merklize_transaction_set():
            raise InvalidBlockMerkleException('input block merkle mismatch with the current block')

        # self.root_chain.transact({'from': self.authority}).submitBlock(block.merkle.root)
        self.blocks[self.current_block_number] = self.current_block

        print("Child Chain:  Submitted block\n %s" % self.current_block)

        blkid = self.current_block_number
        for txid in range(len(block.transaction_set)):
            tx = block.transaction_set[txid]
            for utxotype, new_address, oindex in [(tx.utxotype1, tx.newowner1, 0),
                                                  (tx.utxotype2, tx.newowner2, 1),
                                                  (tx.utxotype3, tx.newowner3, 2),
                                                  (tx.utxotype4, tx.newowner4, 3)]:
                if utxotype == Transaction.UTXOType.make_order:
                    self.open_orders[(blkid, txid, oindex)] = True
                elif utxotype == Transaction.UTXOType.transfer:
                    self.unspent_utxos[Web3.toChecksumAddress(new_address)][(blkid, txid, oindex)] = True
                    
        self.current_block_number += self.child_block_interval
        print("going to set current_block to new block")
        self.current_block = Block(transaction_set = [])
        print("new block has %d transactions" % len(self.current_block.transaction_set))

    def get_transaction(self, blknum, txindex):
        return rlp.encode(self.blocks[blknum].transaction_set[txindex]).hex()

    def get_tx_pos(self, transaction):
        decoded_tx = rlp.decode(utils.decode_hex(transaction), Transaction)

        for blknum in self.blocks:
            block = self.blocks[blknum]
            for txindex in range(0, len(block.transaction_set)):
                tx = block.transaction_set[txindex]
                if (decoded_tx.hash == tx.hash):
                    return blknum, txindex

        return None, None

    def get_block(self, blknum):
        return rlp.encode(self.blocks[blknum]).hex()

    def get_current_block(self):
        return rlp.encode(self.current_block).hex()

    def get_current_block_num(self):
        return self.current_block_number

    def get_balances(self, address):
        eth_balance = 0
        pdex_balance = 0

        for (blknum, txid, oindex) in self.unspent_utxos.get(address, {}).keys():
            tx_info = self._get_input_info(blknum, txid, oindex, None, None)

            if tx_info['currency'] == ZERO_ADDRESS:
                eth_balance += tx_info['amount']
            else:
                pdex_balance += tx_info['amount']

        return json.dumps([eth_balance, pdex_balance])
    

    
    def get_utxos(self, address, currency):
        utxos = []
        for (blknum, txid, oindex) in self.unspent_utxos.get(Web3.toChecksumAddress(address), {}).keys():
            tx_info = self._get_input_info(blknum, txid, oindex, None, None)

            if tx_info['currency'] == utils.normalize_address(currency):
                utxos.append([blknum, txid, oindex, tx_info['amount']])

        print("get_utxos: returned utxos - %s" % str(utxos))

        return rlp.encode(utxos).hex()
        
                
    def get_open_orders(self):
        open_orders = []
        for (blknum, txid, oindex) in self.open_orders.keys():
            tx_info = self._get_input_info(blknum, txid, oindex, None, None)
            open_orders.append([tx_info['amount'], tx_info['tokenprice'], tx_info['owner']])

        return rlp.encode(open_orders).hex()

            
    def get_makeorder_txn(self, address, currency, amount, tokenprice):
        print("called get_makeorder_txn with params [%s, %s, %d, %d]" % (address, currency, amount, tokenprice))
        encoded_utxos = self.get_utxos(address, currency)
        
        utxos = rlp.decode(utils.decode_hex(encoded_utxos),
                           rlp.sedes.CountableList(rlp.sedes.List([rlp.sedes.big_endian_int,
                                                                   rlp.sedes.big_endian_int,
                                                                   rlp.sedes.big_endian_int,
                                                                   rlp.sedes.big_endian_int])))

        tx = None
        
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
                                     0, ZERO_ADDRESS, 0, 0, ZERO_ADDRESS,
                                     0, ZERO_ADDRESS, 0, 0, ZERO_ADDRESS)
                else:
                    tx = Transaction(Transaction.TxnType.make_order,
                                     utxo[0], utxo[1], utxo[2],
                                     0, 0, 0,
                                     Transaction.UTXOType.make_order, utils.normalize_address(address), amount, tokenprice, utils.normalize_address(currency),
                                     0, ZERO_ADDRESS, 0, 0, ZERO_ADDRESS,
                                     0, ZERO_ADDRESS, 0, 0, ZERO_ADDRESS,
                                     0, ZERO_ADDRESS, 0, 0, ZERO_ADDRESS)

                break

        return (tx, tx.readable_str if tx else None)

    def submit_signed_makeorder_txn(self, address, currency, amount, tokenprice, orig_makeorder_txn_hex, signature):
        makeorder_txn, makeorder_txn_hex = self.get_makeorder_txn(address, currency, amount, tokenprice)
        
        if (makeorder_txn_hex != orig_makeorder_txn_hex):
            return False
        else:
            makeorder_txn.sigtype = Transaction.SigType.txn
            makeorder_txn.txnsig = utils.decode_hex(utils.remove_0x_head(signature))
            
            self.apply_transaction(rlp.encode(makeorder_txn, Transaction).hex())
            return True

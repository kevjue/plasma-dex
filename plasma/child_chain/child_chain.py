import rlp
from ethereum import utils

from plasma.utils.utils import unpack_utxo_pos
from .block import Block
from .exceptions import (InvalidBlockMerkleException,
                         InvalidBlockSignatureException,
                         InvalidTxSignatureException, TxAlreadySpentException,
                         TxAmountMismatchException, InvalidOutputIndexNumberException,
                         InvalidTxInputType, InvalidTxOutput,
                         InvalidTxCurrencyMismatch)
from .transaction import Transaction
from .root_event_listener import RootEventListener

ZERO_ADDRESS = b'\x00' * 20


class ChildChain(object):

    def __init__(self, authority, root_chain, token):
        self.root_chain = root_chain
        self.token = token
        self.authority = authority
        self.blocks = {}
        self.child_block_interval = 1000
        self.current_block_number = self.child_block_interval
        self.current_block = Block()
        self.pending_transactions = []

        self.root_chain_event_listener = RootEventListener(root_chain, confirmations=0)
        self.token_event_listener = RootEventListener(token, confirmations=0)

        # Register event listeners
        self.root_chain_event_listener.on('Deposit', self.apply_eth_deposit)
        self.root_chain_event_listener.on('ExitStarted', self.apply_exit)
        self.token_event_listener.on('Transfer', self.apply_token_deposit)
        

    def apply_exit(self, event):
        event_args = event['args']
        utxo_pos = event_args['utxoPos']
        self.mark_utxo_spent(*unpack_utxo_pos(utxo_pos))

    def apply_eth_deposit(self, event):
        event_args = event['args']

        depositor = event_args['depositor']
        amount = event_args['amount']
        blknum = event_args['depositBlock']

        deposit_tx = Transaction(Transaction.TxnType.utxo,
                                 0, 0, 0,
                                 0, 0, 0,
                                 Transaction.UTXOType.transfer, depositor, amount, 0, ZERO_ADDRESS,
                                 0, ZERO_ADDRESS, 0, 0, ZERO_ADDRESS,
                                 0, ZERO_ADDRESS, 0, 0, ZERO_ADDRESS,
                                 0, ZERO_ADDRESS, 0, 0, ZERO_ADDRESS,
                                 0, ZERO_ADDRESS, 0, 0, ZERO_ADDRESS)
        deposit_block = Block([deposit_tx])

        self.blocks[blknum] = deposit_block

    def apply_token_deposit(self, event):
        event_args = event['args']

        if event_args['to'] != self.root_chain.address:
            #TODO:  Modify the event listener to do this filtering
            return

        depositor = event_args['from']
        amount = event_args['tokens']
        
        deposit_tx = Transaction(Transaction.TxnType.utxo,
                                 0, 0, 0,
                                 0, 0, 0,
                                 Transaction.UTXOType.transfer, depositor, amount, 0, self.token.address,
                                 0, ZERO_ADDRESS, 0, 0, ZERO_ADDRESS,
                                 0, ZERO_ADDRESS, 0, 0, ZERO_ADDRESS,
                                 0, ZERO_ADDRESS, 0, 0, ZERO_ADDRESS,
                                 0, ZERO_ADDRESS, 0, 0, ZERO_ADDRESS)
        deposit_block = Block([deposit_tx])

        self.blocks[blknum] = deposit_block

    def apply_transaction(self, transaction):
        tx = rlp.decode(utils.decode_hex(transaction), Transaction)

        # Validate the transaction
        self.validate_tx(tx)

        # Mark the inputs as spent
        self.mark_utxo_spent(tx.blknum1, tx.txindex1, tx.oindex1)
        self.mark_utxo_spent(tx.blknum2, tx.txindex2, tx.oindex2)

        self.current_block.transaction_set.append(tx)

    def _get_input_info(blknum, txidx, oidx, iidx, tx):
        transaction = self.blocks[blknum].transaction_set[txindex]
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

        if iidx == 0:
            spender = tx.sender1
            signature = tx.sig1
        elif iidx == 1:
            spender = tx.sender2
            signature = tx.sig2
            
        return {'utxotype': utxotype,
                'owner': owner,
                'amount': amount,
                'currency': cur,
                'tokenprice': tokenprice,
                'spent': spent,
                'spender': spender,
                'signature': signature}


    def _validate_transfer_tx(tx, inputs, outputs):
        input_amount = 0
        tx_cur = None
        for input in inputs:
            if input['utxotype'] != Transaction.utxotype.transfer:
                raise InvalidUTXOType("invalid utxo input type (%s) for tx type (%s)" % (input['utxotype'].name, tx.txntype.name))

            if input['spent']:
                raise TxAlreadySpentException('failed to validate tx')

            if tx_cur == None:
                tx_cur = input['currency']

            if input['currency'] != tx_cur:
                raise InvalidTxCurrencyMismatch("currency mismatch in txn.  txn currency (%s); utxo currency (%s)" % (tx_cur, input['currency']))

            verifySignature(input)                
            input_amount += input['amount']

        output_amount = 0
        for output in outputs:
            if output['utxotype'] != Transaction.utxotype.transfer:
                raise InvalidUTXOType("invalid utxo output type (%s) for tx type (%s)" % (output['utxotype'].name, tx.txntype.name))

            output_amount += output['amount']

            if output['currency'] != tx_cur:
                raise InvalidTxCurrencyMismatch("currency mismatch in txn.  txn currency (%s); utxo currency (%s)" % (tx_cur, output['currency']))                
            
        if input_amount < output_amount:
            raise TxAmountMismatchException('failed to validate tx')


    def _validate_make_order_tx(tx, inputs, outputs):
        input_amount = 0
        tx_cur = None
        for input in inputs:
            if input['utxotype'] != Transaction.utxotype.transfer:
                raise InvalidUTXOType("invalid utxo input type (%s) for tx type (%s)" % (input['utxotype'].name, tx.txntype.name))

            if input['spent']:
                raise TxAlreadySpentException('failed to validate tx')

            if tx_cur == None:
                tx_cur = input['currency']
                if tx_cur == ZERO_ADDRSS:
                    raise InvalidUTXOInputType("currency for input UTXO to make_order tx must NOT be Eth")

            if input['currency'] != tx_cur:
                raise InvalidTxCurrencyMismatch("currency mismatch in txn.  txn currency (%s); utxo currency (%s)" % (tx_cur, input['currency']))

            verifySignature(input)
            input_amount += input['amount']

        # At least one of the outputs must be a make_order utxo.
        output_amount = 0
        has_make_order_utxo = False
        for output in outputs:
            if output['utxotype'] == Transaction.UTXOtype.make_order:
                has_make_order_utxo = True
                if output['currency'] != tx_cur:
                    raise InvalidTxCurrencyMismatch("currency mismatch in txn.  txn currency (%s); utxo currency (%s)" % (tx_cur, output['currency']))

            output_amount += output['amount']

        if not has_make_order_utxo:
            raise InvalidTx()
            
        if input_amount < output_amount:
            raise TxAmountMismatchException('failed to validate tx')


    def _validate_take_order_tx(tx, inputs, outputs):
        make_order_utxo_input = None
        transfer_eth_utxo_input = None
        for input in inputs:
            # This transaction type requires the following inputs
            # 1) one of the inputs is a make_order utxo.
            # 2) one of the inputs is a transfer utxo with currency eth.
            if input['utxotype'] == Transaction.utxotype.make_order:
                make_order_utxo_input = input
            
            if input['utxotype'] == Transaction.utxotype.transfer:
                transfer_eth_utxo_input = None
                if input['currency'] != ZERO_ADDRESS:
                    raise InvalidTxCurrencyMismatch("in take_order tx, utxo transfer input must have Eth currency")
                verifySignature(input)

            if input['spent']:
                raise TxAlreadySpentException('failed to validate tx')

        if make_order_utxo_input == None or \
                transfer_eth_utxo_input == None:
            raise InvalidUTXOType("invalid utxo input types for take_order tx")

        total_tokens_to_purchase = min(transfer_eth_utxo_input.amount / make_order_utxo_input.token_price, make_order_utxo_input.amount)
        eth_payment_amount = total_token_to_purchase * make_order.token_price
        remainder_eth = transfer_eth_utxo_input.amount - eth_payment_amount
        remainder_make_order = make_order_utxo_input.amount - total_tokens_to_purchase

        token_transfer_utxo_output = None
        eth_payment_utxo_output = None
        remainder_eth_utxo_output = None
        remainder_make_order_output = None
        for output in outputs:
            if output['utxotype'] == Transaction.UTXOtype.transfer:
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
            elif output['utxotype'] == Transaction.UTXOtype.make_order and \
                    output['amount'] == remainder_make_order_output and \
                    output['tokenprice'] == make_order_utxo_input['tokenprice']:
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
                inputs.append(get_input_info(i_blknum, i_txidx, i_oidx, idx, tx))

        for o_utxotype, o_newowner, o_amount, o_tokenprice, o_currency in [(tx.utxotype1, tx.newowner1, tx.amount1, tx.tokenprice1, tx.cur1),
                                                                           (tx.utxotype2, tx.newowner2, tx.amount2, tx.tokenprice2, tx.cur2),
                                                                           (tx.utxotype3, tx.newowner3, tx.amount3, tx.tokenprice3, tx.cur3),
                                                                           (tx.utxotype4, tx.newowner4, tx.amount4, tx.tokenprice4, tx.cur4)]:
            if o_utxotype != 0:
                ouputs.append([{'utxotype': o_utxotype,
                                'newowner': o_newowner,
                                'amount': o_amount,
                                'tokenprice': o_tokenprice,
                                'currency': o_currency}])

        if tx.txntype == Transaction.TxnType.transfer:
            self._validate_transfer_tx(tx, inputs, outputs)
        elif tx.txntype == Transaction.TxnType.make_order:
            self._validate_make_order_tx(tx, inputs, output)
        elif tx.txntype == Transaction.TxnType.take_order:
            self._validate_take_order_tx(tx, inputs, output)
        
        
    def mark_utxo_spent(self, blknum, txindex, oindex):
        if blknum == 0:
            return

        if oindex == 0:
            self.blocks[blknum].transaction_set[txindex].spent1 = True
        else:
            self.blocks[blknum].transaction_set[txindex].spent2 = True

    def submit_block(self, block):
        block = rlp.decode(utils.decode_hex(block), Block)
        if block.merklize_transaction_set() != self.current_block.merklize_transaction_set():
            raise InvalidBlockMerkleException('input block merkle mismatch with the current block')

        valid_signature = block.sig != b'\x00' * 65 and block.sender == bytes.fromhex(self.authority[2:])
        if not valid_signature:
            raise InvalidBlockSignatureException('failed to submit block')

        self.root_chain.transact({'from': self.authority}).submitBlock(block.merkle.root)
        # TODO: iterate through block and validate transactions
        self.blocks[self.current_block_number] = self.current_block
        self.current_block_number += self.child_block_interval
        self.current_block = Block()

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

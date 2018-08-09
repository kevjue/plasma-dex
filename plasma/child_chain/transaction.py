import rlp
from rlp.sedes import big_endian_int, binary
from ethereum import utils
from plasma.utils.utils import get_sender, sign
from enum import IntEnum
from web3 import Web3

class Transaction(rlp.Serializable):
    TxnType = IntEnum('TxnType', 'transfer make_order take_order')
    UTXOType = IntEnum('UTXOType', 'transfer make_order')
    SigType = IntEnum('SigType', 'txn utxo')

    fields = [
        ('txntype', big_endian_int),
        ('sigtype', big_endian_int),
        ('blknum1', big_endian_int),
        ('txindex1', big_endian_int),
        ('oindex1', big_endian_int),
        ('blknum2', big_endian_int),
        ('txindex2', big_endian_int),
        ('oindex2', big_endian_int),
        ('utxotype1', big_endian_int),
        ('newowner1', utils.address),
        ('amount1', big_endian_int),
        ('tokenprice1', big_endian_int),
        ('cur1', utils.address),
        ('utxotype2', big_endian_int),
        ('newowner2', utils.address),
        ('amount2', big_endian_int),
        ('tokenprice2', big_endian_int),
        ('cur2', utils.address),
        ('utxotype3', big_endian_int),
        ('newowner3', utils.address),
        ('amount3', big_endian_int),
        ('tokenprice3', big_endian_int),
        ('cur3', utils.address),
        ('utxotype4', big_endian_int),
        ('newowner4', utils.address),
        ('amount4', big_endian_int),
        ('tokenprice4', big_endian_int),
        ('cur4', utils.address),
        ('sig1', binary),
        ('sig2', binary),
        ('txnsig', binary)
    ]

    def __init__(self,
                 txntype,
                 blknum1, txindex1, oindex1,
                 blknum2, txindex2, oindex2,
                 utxotype1, newowner1, amount1, tokenprice1, cur1,
                 utxotype2, newowner2, amount2, tokenprice2, cur2,
                 utxotype3, newowner3, amount3, tokenprice3, cur3,
                 utxotype4, newowner4, amount4, tokenprice4, cur4,
                 sigtype=SigType.utxo,
                 sig1=b'\x00' * 65,
                 sig2=b'\x00' * 65,
                 txnsig=b'\x00' * 65):
        # Transaction Type
        self.txntype = txntype

        # Signature Type
        self.sigtype = sigtype
        self.txnsig = txnsig

        # Input 1
        self.blknum1 = blknum1
        self.txindex1 = txindex1
        self.oindex1 = oindex1
        self.sig1 = sig1

        # Input 2
        self.blknum2 = blknum2
        self.txindex2 = txindex2
        self.oindex2 = oindex2
        self.sig2 = sig2

        # Outputs
        self.utxotype1 = utxotype1
        self.newowner1 = utils.normalize_address(newowner1)
        self.amount1 = amount1
        self.tokenprice1 = tokenprice1  # This field is only used if utxotype1 == make_order
        self.cur1 = utils.normalize_address(cur1)

        self.utxotype2 = utxotype2
        self.newowner2 = utils.normalize_address(newowner2)
        self.amount2 = amount2
        self.tokenprice2 = tokenprice2  # This field is only used if utxotype2 == make_order
        self.cur2 = utils.normalize_address(cur2)

        self.utxotype3 = utxotype3
        self.newowner3 = utils.normalize_address(newowner3)
        self.amount3 = amount3
        self.tokenprice3 = tokenprice3  # This field is only used if utxotype3 == make_order
        self.cur3 = utils.normalize_address(cur3)

        self.utxotype4 = utxotype4
        self.newowner4 = utils.normalize_address(newowner4)
        self.amount4 = amount4
        self.tokenprice4 = tokenprice4  # This field is only used if utxotype3 == make_order
        self.cur4 = utils.normalize_address(cur4)

        self.confirmation1 = None
        self.confirmation2 = None

        self.spent1 = False
        self.spent2 = False
        self.spent3 = False
        self.spend4 = False

    @property
    def hash(self):
        return utils.sha3(rlp.encode(self, UnsignedTransaction))

        self.utxotype1 = utxotype1
        self.newowner1 = utils.normalize_address(newowner1)
        self.amount1 = amount1
        self.tokenprice1 = tokenprice1  # This field is only used if utxotype1 == make_order
        self.cur1 = utils.normalize_address(cur1)

    
    @property
    def readable_str(self):
        output_str =  ""
        output_str += "input_utxos:\n"
        output_str += "\tutxo1 - blknum: %d\ttxindex: %d\toindex: %d\n" % (self.blknum1, self.txindex1, self.oindex1) if self.blknum1 else ""
        output_str += "\tutxo2 - blknum: %d\ttxindex: %d\toindex: %d\n" % (self.blknum2, self.txindex2, self.oindex2) if self.blknum2 else ""
        output_str += "output_utxos:\n"
        output_str += "\tutxo1 - utxotype: %s\tnewowner: %s\tamount: %d\ttokenprice: %d, token address: %s\n" % (self.UTXOType(self.utxotype1).name,
                                                                                                                 self.newowner1.hex(),
                                                                                                                 Web3.fromWei(self.amount1, 'ether'),
                                                                                                                 Web3.fromWei(self.tokenprice1, 'ether'),
                                                                                                                 self.cur1.hex()) if self.utxotype1 else ""
        output_str += "\tutxo2 - utxotype: %s\tnewowner: %s\tamount: %d\ttokenprice: %d, token address: %s\n" % (self.UTXOType(self.utxotype2).name,
                                                                                                                 self.newowner2.hex(),
                                                                                                                 Web3.fromWei(self.amount2, 'ether'),
                                                                                                                 Web3.fromWei(self.tokenprice2, 'ether'),
                                                                                                                 self.cur2.hex()) if self.utxotype2 else ""
        output_str += "\tutxo3 - utxotype: %s\tnewowner: %s\tamount: %d\ttokenprice: %d, token address: %s\n" % (self.UTXOType(self.utxotype3).name,
                                                                                                                 self.newowner3.hex(),
                                                                                                                 Web3.fromWei(self.amount3, 'ether'),
                                                                                                                 Web3.fromWei(self.tokenprice3, 'ether'),
                                                                                                                 self.cur3.hex()) if self.utxotype3 else ""
        output_str += "\tutxo4 - utxotype: %s\tnewowner: %s\tamount: %d\ttokenprice: %d, token address: %s\n" % (self.UTXOType(self.utxotype4).name,
                                                                                                                 self.newowner4.hex(),
                                                                                                                 Web3.fromWei(self.amount4, 'ether'),
                                                                                                                 Web3.fromWei(self.tokenprice4, 'ether'),
                                                                                                                 self.cur4.hex()) if self.utxotype4 else ""
        return Web3.toHex(text=output_str)
    
    @property
    def merkle_hash(self):
        return utils.sha3(self.hash + self.sig1 + self.sig2)

    def sign1(self, key):
        self.sig1 = sign(self.hash, key)

    def sign2(self, key):
        self.sig2 = sign(self.hash, key)

    @property
    def is_single_utxo(self):
        if self.blknum2 == 0:
            return True
        return False

    @property
    def sender1(self):
        return get_sender(self.hash, self.sig1)

    @property
    def sender2(self):
        return get_sender(self.hash, self.sig2)

    def __repr__(self):
        inputs = "inputs: [blknum1: %d; txindex1: %d; oindex1: %d\n\t   blknum2: %d; txindex2: %d; oindex2: %d]" % \
                 (self.blknum1,
                  self.txindex1,
                  self.oindex1,
                  self.blknum2,
                  self.txindex2,
                  self.oindex2)

        outputs = "ouputs: [utxotype1: %s, newowner1: 0x%s..., amount1: %d, tokenprice1: %d, cur1: 0x%s...]\n" % \
                  (None if self.utxotype1 == 0 else self.UTXOType(self.utxotype1).name,
                   self.newowner1.hex()[0:5],
                   self.amount1,
                   self.tokenprice1,
                   self.cur1.hex()[0:5]) + \
                   "\t  [utxotype2: %s, newowner2: 0x%s..., amount2: %d, tokenprice2: %d, cur2: 0x%s...]\n" % \
                   (None if self.utxotype2 == 0 else self.UTXOType(self.utxotype2).name,
                    self.newowner2.hex()[0:5],
                    self.amount2,
                    self.tokenprice2,
                    self.cur2.hex()[0:5]) + \
                    "\t  [utxotype3: %s, newowner3: 0x%s..., amount3: %d, tokenprice3: %d, cur3: 0x%s...]\n" % \
                   (None if self.utxotype3 == 0 else self.UTXOType(self.utxotype3).name,
                    self.newowner3.hex()[0:5],
                    self.amount3,
                    self.tokenprice3,
                    self.cur3.hex()[0:5]) + \
                    "\t  [utxotype3: %s, newowner3: 0x%s..., amount3: %d, tokenprice3: %d, cur3: 0x%s...]\n" % \
                   (None if self.utxotype4 == 0 else self.UTXOType(self.utxotype4).name,
                    self.newowner4.hex()[0:5],
                    self.amount4,
                    self.tokenprice4,
                    self.cur4.hex()[0:5])

        return "[%s\n  %s]" % (inputs, outputs)


UnsignedTransaction = Transaction.exclude(['sig1', 'sig2'])

class TxAlreadySpentException(Exception):
    """the transaction is already spent"""


class InvalidTxSignatureException(Exception):
    """the signature of a tx is invalid"""


class InvalidBlockSignatureException(Exception):
    """the signature of a block is invalid"""


class TxAmountMismatchException(Exception):
    """tx input total amount is not equal to output total amount"""


class InvalidBlockMerkleException(Exception):
    """merkle tree of a block is invalid"""


class InvalidOutputIndexNumberException(Exception):
    """invalid utxo output index number"""


class InvalidUTXOInputType(Exception):
    """invalid input utxo type"""


class InvalidTxCurrencyMismatch(Exception):
    """currency mismatch in transaction"""


class InvalidUTXOOutput(Exception):
    """invalid output utxo type"""

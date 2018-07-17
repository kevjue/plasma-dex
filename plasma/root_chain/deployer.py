import json
import os
from solc import compile_standard
from web3.contract import ConciseContract
from web3 import Web3, HTTPProvider

OUTPUT_DIR = '/home/ubuntu/plasma-dex/plasma/root_chain/build/contracts'


class Deployer(object):

    def __init__(self, provider=HTTPProvider('http://localhost:8545')):
        self.w3 = Web3(provider)

    @staticmethod
    def get_contract_data(contract_name):
        """Returns the contract data for a given contract

        Args:
            contract_name (str): Name of the contract to return.

        Returns:
            str, str: ABI and bytecode of the contract
        """

        contract_data_path = OUTPUT_DIR + '/{0}.json'.format(contract_name)
        with open(contract_data_path, 'r') as contract_data_file:
            contract_data = json.load(contract_data_file)

        abi = contract_data['abi']
        return abi

    def get_contract_at_address(self, contract_name, address, concise=True):
        """Returns a Web3 instance of the given contract at the given address

        Args:
            contract_name (str): Name of the contract. Must already be compiled.
            address (str): Address of the contract.
            concise (bool): Whether to return a Contract or ConciseContract instance.

        Returns:
            Contract: A Web3 contract instance.
        """

        abi = self.get_contract_data(contract_name)

        contract_instance = self.w3.eth.contract(abi=abi, address=address)

        return ConciseContract(contract_instance) if concise else contract_instance

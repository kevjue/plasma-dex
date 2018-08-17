#!/bin/bash

cd ~/plasma-dex/plasma/;
pip3 install --user pipenv;
pipenv install;
python3 ~/plasma-dex/plasma/child_chain/install_chain_operator.py --root_chain_address=$1;
env PYTHONPATH=~/plasma-dex pipenv run python3 child_chain/server.py --root_chain_address=$1 --eth_node_endpoint=http://localhost:8545;


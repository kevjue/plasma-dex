#!/bin/bash

cd ~/plasma-dex/plasma/;
pip3 install --user pipenv;
pipenv install;
env PYTHONPATH=$HOME/plasma-dex pipenv run python3 child_chain/install_chain_operator.py --root_chain_address=$1;
env PYTHONPATH=$HOME/plasma-dex pipenv run python3 child_chain/server.py --root_chain_address=$1 --eth_node_endpoint=http://localhost:8545;


#!/bin/bash

# install root chain npm dependencies
( cd ~/plasma-dex/plasma/root_chain; npm install )

# deploy the root chain smart contracts
( cd ~/plasma-dex/plasma/root_chain/; node_modules/.bin/truffle deploy --network development )

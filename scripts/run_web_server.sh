#!/bin/bash

echo 'var TOKEN_ADDRESS = "$1";' > $HOME/plasma-dex/plasma-dex-webapp/build/configuration.js;
echo 'var ROOT_CHAIN_ADDRESS = "$2"' >> $HOME/plasma-dex/plasma-dex-webapp/build/configuration.js;
serve -s ~/plasma-dex/plasma-dex-webapp/build -l 80;
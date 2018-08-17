#!/bin/bash

cd $HOME/plasma-dex/plasma-dex-webapp;
sudo --user=$USER npm install;
printf 'var TOKEN_ADDRESS = "%s";\n' $1 > $HOME/plasma-dex/plasma-dex-webapp/public/configuration.js;
printf 'var ROOT_CHAIN_ADDRESS = "%s"' $2 >> $HOME/plasma-dex/plasma-dex-webapp/public/configuration.js;
env PORT=80 HOST='0.0.0.0' npm start;

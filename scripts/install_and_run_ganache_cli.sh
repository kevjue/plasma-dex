#!/bin/bash

# install npm
apt-get install -y npm

# install node (>= v9)
apt-get install -y curl
curl -sL https://deb.nodesource.com/setup_9.x | bash -
apt-get install -y nodejs

# install ganache-cli
npm install -g ganache-cli

# run ganache-cli
sh ~/plasma-dex/plasma/scripts/startGanache.sh

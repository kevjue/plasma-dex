#!/bin/bash

# install npm
apt-get install -y npm

# install node (>= v9)
apt-get install -y curl
curl -sL https://deb.nodesource.com/setup_9.x | bash -
apt-get install -y nodejs

# install pip3
apt-get install -y python3-pip

# install serve
npm install -g serve

# install ganache-cli
npm install -g ganache-cli

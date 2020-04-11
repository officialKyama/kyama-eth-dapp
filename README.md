# Kyama


## Overview

This repository contains the build tools required to build the Kyama Ethereum dapp. It also makes public the third party libraries that
are currently needed to successfuly build the project. As defined in `package.json`, these libraries currently include:
  - openzeppelin-solidity
  - truffle-assertions
  - truffle-hdwallet-provider
  
## Build instructions

- Install [Node.js](https://nodejs.org) version 10
- Install [Truffle](https://trufflesuite.com) version 5: `npm install -g truffle`
- Install dependencies: `npm install`
- Run `truffle develop`
  - To compile, run `truffle compile`
  - To migrate, run `truffle migrate`
  - To test, run `truffle test`
- Once compiled and migrated, build can be found at `/build`

## Production

You can [visit our website](https://www.kyama.co/) to use the current production build of Kyama.\
**NOTE:** The current production build is in beta test on the Rinkeby test network.

## Contributing

Join our [beta test](https://www.kyama.co/) free of charge.

Run tests with `truffle test`.

Pull requests can be issued via the `development` branch.


## Community

If you'd like to be more involved with Kyama, [join the community.](https://discordapp.com/invite/Z32MeJM) 
We'd love to work together so as to continue improving Kyama.

Follow [@officialKyama](https://twitter.com/officialkyama) on Twitter for important news and announcements.

const {loadEnv} = require('ldenv');
loadEnv();
require('@nomicfoundation/hardhat-network-helpers');
require('@nomicfoundation/hardhat-chai-matchers');
const {addForkConfiguration, addNetworksFromEnv} = require('hardhat-rocketh');
require('vitest-solidity-coverage/hardhat');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
	solidity: '0.8.20',
	networks: addForkConfiguration(
		addNetworksFromEnv({
			hardhat: {
				initialBaseFeePerGas: 0,
			},
		}),
	),
};

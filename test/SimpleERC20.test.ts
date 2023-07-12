import {describe, it} from 'vitest';
import {erc20} from '../src';
import {runtests} from '../src/testsuite';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {getConnection, fetchContract} from '../utils/connection';
import {network} from 'hardhat';
import {EIP1193ProviderWithoutEvents} from 'eip-1193';
import {Deployment, loadAndExecuteDeployments} from 'rocketh';
import artifacts from '../generated/artifacts';

async function deploySimpleERC20() {
	const {accounts} = await getConnection();
	const [deployer, tokensBeneficiary, ...otherAccounts] = accounts;

	const provider = network.provider as EIP1193ProviderWithoutEvents;
	const {deployments} = await loadAndExecuteDeployments({
		provider,
	});

	const SimpleERC20 = await fetchContract(deployments['SimpleERC20'] as Deployment<typeof artifacts.SimpleERC20.abi>);
	return {
		SimpleERC20,
		tokensBeneficiary,
		deployer,
		otherAccounts,
		provider,
	};
}

async function setupSimpleERC20() {
	const setup = await loadFixture(deploySimpleERC20);
	return {
		ethereum: setup.provider,
		contractAddress: setup.SimpleERC20.address,
		users: setup.otherAccounts,
		userWithToken: setup.tokensBeneficiary,
	};
}

const tests = erc20.generateTests({burn: true, EIP717: true}, setupSimpleERC20);

describe('SimpleERC20', function () {
	runtests(tests, {describe, it});
});

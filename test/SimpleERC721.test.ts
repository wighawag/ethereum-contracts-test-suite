import {describe, it} from 'vitest';
import {erc721} from '../src';
import {runtests} from '../src/testsuite';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {getConnection, fetchContract} from '../utils/connection';
import {network} from 'hardhat';
import {EIP1193ProviderWithoutEvents} from 'eip-1193';
import {Deployment, loadAndExecuteDeployments} from 'rocketh';
import artifacts from '../generated/artifacts';

async function deploySimpleERC721() {
	const {accounts, publicClient, walletClient} = await getConnection();
	const [deployer, tokensBeneficiary, ...otherAccounts] = accounts;

	const provider = network.provider as EIP1193ProviderWithoutEvents;
	const {deployments} = await loadAndExecuteDeployments({
		provider,
	});

	const SimpleERC721 = await fetchContract(
		deployments['SimpleERC721'] as Deployment<typeof artifacts.SimpleERC721.abi>,
	);
	return {
		publicClient,
		walletClient,
		SimpleERC721,
		tokensBeneficiary,
		deployer,
		otherAccounts,
		provider,
	};
}

async function setupSimpleERC721() {
	const setup = await loadFixture(deploySimpleERC721);
	let tokenCounter = 0;
	return {
		ethereum: setup.provider,
		contractAddress: setup.SimpleERC721.address,
		users: setup.otherAccounts,
		deployer: setup.deployer,
		async mint(to: `0x${string}`) {
			tokenCounter++;
			const tokenId = '' + tokenCounter;
			const tx = await setup.SimpleERC721.write.mint([to, BigInt(tokenId)], {account: setup.deployer, value: 0n});
			await setup.publicClient.waitForTransactionReceipt({hash: tx});
			return {
				tokenId,
				hash: tx,
			};
		},
	};
}

const tests = erc721.generateTests(setupSimpleERC721);

describe('SimpleERC721', function () {
	runtests(tests, {describe, it});
});

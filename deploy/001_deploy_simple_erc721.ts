
import {execute} from 'rocketh';
import 'rocketh-deploy';
import {context} from './_context';
import {parseEther} from 'ethers';

export default execute(
	context,
	async ({deploy, accounts, artifacts}) => {
		const contract = await deploy(
			'SimpleERC721',
			{
				account: accounts.deployer,
				artifact: artifacts.SimpleERC721
			}
		);
	},
	{tags: ['SimpleERC721', 'SimpleERC721_deploy']}
);



import {execute} from 'rocketh';
import 'rocketh-deploy';
import {context} from './_context';
import {parseEther} from 'ethers';

export default execute(
	context,
	async ({deploy, accounts, artifacts}) => {
		const contract = await deploy(
			'SimpleERC20',
			{
				account: accounts.deployer,
				artifact: artifacts.SimpleERC20,
				args: [accounts.tokensBeneficiary, parseEther('1000000000')],
			}
		);
	},
	{tags: ['SimpleERC20', 'SimpleERC20_deploy']}
);


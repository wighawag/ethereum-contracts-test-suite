import {
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
  network,
} from 'hardhat';

import {erc20} from '../src';

erc20.runMochaTests('SimpleERC20', {burn: true, EIP717: true}, async () => {
  await deployments.fixture(['SimpleERC20']);
  const SimpleERC20 = await deployments.get('SimpleERC20');
  const {simpleERC20Beneficiary} = await getNamedAccounts();
  const users = await getUnnamedAccounts();
  return {
    ethereum: network.provider,
    contractAddress: SimpleERC20.address,
    users,
    userWithToken: simpleERC20Beneficiary,
  };
});

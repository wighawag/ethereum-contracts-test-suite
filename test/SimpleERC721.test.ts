import {
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
  network,
  ethers,
} from 'hardhat';

import {erc721} from '../src';

erc721.runMochaTests('SimpleERC721', {burn: true}, async () => {
  await deployments.fixture(['SimpleERC721']);
  const {deployer} = await getNamedAccounts();
  const SimpleERC721 = await deployments.get('SimpleERC721');
  const users = await getUnnamedAccounts();
  let tokenCounter = 0;
  async function mint(to: string): Promise<{hash: string; tokenId: string}> {
    const SimpleERC721Contract = await ethers.getContract('SimpleERC721', to);
    tokenCounter++;
    const tokenId = '' + tokenCounter;
    const tx = await SimpleERC721Contract.mint(to, tokenId);
    await tx.wait();
    return {
      tokenId,
      hash: tx.hash,
    };
  }
  return {
    ethereum: network.provider,
    contractAddress: SimpleERC721.address,
    users,
    mint,
    deployer,
  };
});

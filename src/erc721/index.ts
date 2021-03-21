import {TestSuite} from '../testsuite';
import {assert, expect} from '../chai-setup';
import {waitFor} from '../utils';
import {BigNumber} from '@ethersproject/bignumber';
import {AddressZero} from '@ethersproject/constants';
import {Web3Provider, JsonRpcProvider} from '@ethersproject/providers';
import {Contract, ContractFactory} from '@ethersproject/contracts';
import erc721ABI from './erc721_abi.json';
import {receiver, nonReceiving} from './helpers';

type ERC721Fixture = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ethereum: any; // TODO
  contractAddress: string;
  users: string[];
  deployer: string;
  mint(to: string): Promise<{hash: string; tokenId: string}>;
};

export type ERC721User = {
  address: string;
  contract: Contract;
};

export type ERC721FinalFixture = {
  contract: Contract;
  users: ERC721User[];
  mint(to: string): Promise<{hash: string; tokenId: string}>;
  ethersProvider: JsonRpcProvider;
  deployERC721TokenReceiver(
    address: string,
    allowTokensReceived: boolean,
    returnCorrectBytes: boolean
  ): Promise<Contract>;
  deployNonReceivingContract(contractAddress: string): Promise<Contract>;
};

export type ERC721Options = {
  burn?: boolean;
};

export const erc721 = new TestSuite<
  ERC721Fixture,
  ERC721Options,
  ERC721FinalFixture
>(
  async ({ethereum, contractAddress, users, mint, deployer}) => {
    const ethersProvider = new Web3Provider(ethereum);

    const contract = new Contract(contractAddress, erc721ABI, ethersProvider);

    const usersWithContracts = [];
    for (const user of users) {
      usersWithContracts.push({
        address: user,
        contract: contract.connect(ethersProvider.getSigner(user)),
        initialBalance: BigNumber.from(0),
      });
    }

    // const mandatoryReceiverFactory = new ContractFactory(
    //   mandatoryReceiver.abi,
    //   mandatoryReceiver.bytecode,
    //   ethers.provider.getSigner(deployer)
    // );
    const receiverFactory = new ContractFactory(
      receiver.abi,
      receiver.bytecode,
      ethersProvider.getSigner(deployer)
    );
    const nonReceivingFactory = new ContractFactory(
      nonReceiving.abi,
      nonReceiving.bytecode,
      ethersProvider.getSigner(deployer)
    );

    // function deployMandatoryERC721TokenReceiver() {
    //   return mandatoryReceiverFactory.deploy(...args);
    // }
    function deployNonReceivingContract(contractAddress: string) {
      return nonReceivingFactory.deploy(contractAddress);
    }
    function deployERC721TokenReceiver(
      address: string,
      allowTokensReceived: boolean,
      returnCorrectBytes: boolean
    ) {
      return receiverFactory.deploy(
        address,
        allowTokensReceived,
        returnCorrectBytes
      );
    }

    return {
      contract,
      users: usersWithContracts,
      mint,
      ethersProvider,
      deployERC721TokenReceiver,
      deployNonReceivingContract,
    };
  },
  ({describe, options}) => {
    describe('non existing NFT', function (it) {
      it('transfering a non existing NFT fails', async function ({users}) {
        await expect(
          users[0].contract.transferFrom(
            users[0].address,
            users[1].address,
            10000000
          )
        ).to.be.reverted;
      });

      it('tx balanceOf a zero owner fails', async function ({users}) {
        await expect(users[0].contract.balanceOf(AddressZero)).to.be.reverted;
      });

      it('call balanceOf a zero owner fails', async function ({contract}) {
        await expect(contract.callStatic.balanceOf(AddressZero)).to.be.reverted;
      });

      it('tx ownerOf a non existing NFT fails', async function ({users}) {
        await expect(users[0].contract.ownerOf(1000000000)).to.be.reverted;
      });

      it('call ownerOf a non existing NFT fails', async function ({contract}) {
        await expect(contract.callStatic.ownerOf(1000000000)).to.be.reverted;
      });

      it('tx getApproved a non existing NFT fails', async function ({users}) {
        await expect(users[0].contract.getApproved(1000000000)).to.be.reverted;
      });

      it('call getApproved a non existing NFT fails', async function ({
        contract,
      }) {
        await expect(contract.callStatic.getApproved(1000000000)).to.be
          .reverted;
      });

      // not technically required by erc721 standard //////////////////////////////////////////////
      // it('call isApprovedForAll for a zero address as owner fails', async () => {
      //     await expectRevert(call(contract, 'isApprovedForAll', {from: user0, gas}, zeroAddress, user1));
      // });

      // it('tx isApprovedForAll for a zero address as owner fails', async () => {
      //     await expectRevert(tx(contract, 'isApprovedForAll', {from: user0, gas}, zeroAddress, user1));
      // });

      // it('call isApprovedForAll for a zero address as operator fails', async () => {
      //     await expectRevert(call(contract, 'isApprovedForAll', {from: user0, gas}, user1, zeroAddress));
      // });

      // it('tx isApprovedForAll for the zero address as operator fails', async () => {
      //     await expectRevert(tx(contract, 'isApprovedForAll', {from: user0, gas}, user1, zeroAddress));
      // });

      // it('call isApprovedForAll on zero addresses for both owner and operator fails', async () => {
      //     await expectRevert(call(contract, 'isApprovedForAll', {from: user0, gas}, zeroAddress, zeroAddress));
      // });

      // it('tx isApprovedForAll on zero addresses for both owner and operator fails', async () => {
      //     await expectRevert(tx(contract, 'isApprovedForAll', {from: user0, gas}, zeroAddress, zeroAddress));
      // });
      // ///////////////////////////////////////////////////////////////////////////////////////////////
    });
    describe('balance', function (it) {
      it('balance is zero for new user', async function ({contract, users}) {
        const balance = await contract.callStatic.balanceOf(users[0].address);
        assert.equal(balance.toNumber(), 0);
      });

      it('balance return correct value', async function ({
        contract,
        users,
        mint,
      }) {
        const balance = await contract.callStatic.balanceOf(users[0].address);
        assert.equal(balance.toNumber(), 0);

        const {tokenId: tokenId1} = await mint(users[1].address);
        const {tokenId: tokenId2} = await mint(users[1].address);
        await waitFor(
          users[1].contract.transferFrom(
            users[1].address,
            users[0].address,
            tokenId1
          )
        );
        let newBalance = await contract.callStatic.balanceOf(users[0].address);
        assert.equal(newBalance.toNumber(), 1);
        await waitFor(
          users[1].contract.transferFrom(
            users[1].address,
            users[0].address,
            tokenId2
          )
        );
        newBalance = await contract.callStatic.balanceOf(users[0].address);
        assert.equal(newBalance.toNumber(), 2);

        await waitFor(
          users[0].contract.transferFrom(
            users[0].address,
            users[2].address,
            tokenId1
          )
        );
        newBalance = await contract.callStatic.balanceOf(users[0].address);
        assert.equal(newBalance.toNumber(), 1);
      });
    });

    describe('mint', function (it) {
      it('mint result in a transfer from 0 event', async function ({
        contract,
        mint,
        users,
        ethersProvider,
      }) {
        const {hash, tokenId} = await mint(users[0].address);
        const receipt = await ethersProvider.getTransactionReceipt(hash);
        const eventsMatching = await contract.queryFilter(
          contract.filters.Transfer(),
          receipt.blockNumber
        );
        assert.equal(eventsMatching.length, 1);
        const transferEvent = eventsMatching[0];
        assert.equal(transferEvent.args && transferEvent.args[0], AddressZero);
        assert.equal(
          transferEvent.args && transferEvent.args[1],
          users[0].address
        );
        assert(transferEvent.args && transferEvent.args[2].eq(tokenId));
      });

      it('mint for gives correct owner', async function ({
        contract,
        mint,
        users,
      }) {
        const {tokenId} = await mint(users[0].address);
        const newOwner = await contract.callStatic.ownerOf(tokenId);
        assert.equal(newOwner, users[0].address);
      });
    });

    if (options.burn) {
      describe('burn', function (it) {
        it('burn result in a transfer to 0 event', async function ({
          contract,
          users,
          mint,
        }) {
          const {tokenId} = await mint(users[0].address);
          const receipt = await waitFor(users[0].contract.burn(tokenId));
          const eventsMatching = await contract.queryFilter(
            contract.filters.Transfer(),
            receipt.blockNumber
          );
          assert.equal(eventsMatching.length, 1);
          const transferEvent = eventsMatching[0];
          assert.equal(
            transferEvent.args && transferEvent.args[0],
            users[0].address
          );
          assert.equal(
            transferEvent.args && transferEvent.args[1],
            AddressZero
          );
          expect(transferEvent.args && transferEvent.args[2]).to.deep.equal(
            tokenId
          );
        });
        it('burn result in ownerOf throwing', async function ({
          contract,
          mint,
          users,
        }) {
          const {tokenId} = await mint(users[0].address);
          await contract.callStatic.ownerOf(tokenId);
          await waitFor(users[0].contract.burn(tokenId));
          await expect(contract.callStatic.ownerOf(tokenId)).to.be.reverted;
        });

        it('cannot burn twice', async function ({mint, users}) {
          const {tokenId} = await mint(users[0].address);
          await waitFor(users[0].contract.burn(tokenId));
          await expect(users[0].contract.burn(tokenId)).to.be.reverted;
        });

        it('cannot burn innexisting token', async function ({mint, users}) {
          const {tokenId} = await mint(users[0].address);
          await expect(users[0].contract.burn(BigNumber.from(0))).to.be
            .reverted;
        });
      });
    }

    // if (extensions.batchTransfer) {
    //   describe('batchTransfer', function (it) {
    //     it('batch transfer of same NFT ids should fails', async function ({
    //       contractAsOwner,
    //       owner,
    //       user0,
    //       tokenIds,
    //     }) {
    //       await expect(
    //         contractAsOwner.batchTransferFrom(
    //           owner,
    //           user0,
    //           [tokenIds[1], tokenIds[1], tokenIds[0]],
    //           '0x'
    //         )
    //       ).to.be.reverted;
    //     });
    //     // it('batch transfer of same NFT ids should fails even if from == to', async () => {
    //     //     let reverted = false;
    //     //     try {
    //     //         await tx(contract, 'batchTransferFrom', {from: user0, gas}, user0, user0, [tokenIds[1], tokenIds[1], tokenIds[0]], '0x');
    //     //     } catch (e) {
    //     //         reverted = true;
    //     //         console.log('ERROR', e);
    //     //     }
    //     //     assert.equal(reverted, true);
    //     //     // await expectRevert(tx(contract, 'batchTransferFrom', {from: user0, gas}, user0, user0, [tokenIds[1], tokenIds[1], tokenIds[0]], '0x'));
    //     // });
    //     it('batch transfer works', async function ({
    //       contractAsOwner,
    //       owner,
    //       user0,
    //       tokenIds,
    //     }) {
    //       await contractAsOwner
    //         .batchTransferFrom(owner, user0, tokenIds, '0x')
    //         .then((tx) => tx.wait());
    //     });
    //   });
    // }

    // if (extensions.mandatoryERC721Receiver) {
    //   if (extensions.batchTransfer) {
    //     describe('mandatory batchTransfer', function (it) {
    //       it('batch transfering to a contract that do not implements mandatory erc721 receiver but implement classic ERC721 receiver and reject should not fails', async function ({
    //         deployERC721TokenReceiver,
    //         contract,
    //         contractAsOwner,
    //         owner,
    //         tokenIds,
    //       }) {
    //         const receiverContract = await deployERC721TokenReceiver(
    //           contract.address,
    //           false,
    //           true
    //         );
    //         const receiverAddress = receiverContract.address;
    //         await contractAsOwner
    //           .batchTransferFrom(owner, receiverAddress, [tokenIds[0]], '0x')
    //           .then((tx) => tx.wait());
    //         const newOwner = await contract.callStatic.ownerOf(tokenIds[0]);
    //         assert.equal(newOwner, receiverAddress);
    //       });
    //       it('batch transfering to a contract that implements mandatory erc721 receiver (and signal it properly via 165) should fails if it reject it', async function ({
    //         deployMandatoryERC721TokenReceiver,
    //         contract,
    //         contractAsOwner,
    //         owner,
    //         tokenIds,
    //       }) {
    //         const receiverContract = await deployMandatoryERC721TokenReceiver(
    //           contract.address,
    //           false,
    //           true
    //         );
    //         const receiverAddress = receiverContract.address;
    //         await expect(
    //           contractAsOwner.batchTransferFrom(
    //             owner,
    //             receiverAddress,
    //             [tokenIds[0]],
    //             '0x'
    //           )
    //         ).to.be.reverted;
    //       });
    //       it('batch transfering to a contract that do not accept erc721 token should fail', async function ({
    //         deployMandatoryERC721TokenReceiver,
    //         contract,
    //         contractAsOwner,
    //         owner,
    //         tokenIds,
    //       }) {
    //         const receiverContract = await deployMandatoryERC721TokenReceiver(
    //           contract.address,
    //           false,
    //           true
    //         );
    //         const receiverAddress = receiverContract.address;
    //         await expect(
    //           contractAsOwner.batchTransferFrom(
    //             owner,
    //             receiverAddress,
    //             [tokenIds[0]],
    //             '0x'
    //           )
    //         ).to.be.reverted;
    //       });

    //       it('batch transfering to a contract that do not return the correct onERC721Received bytes shoudl fail', async function ({
    //         deployMandatoryERC721TokenReceiver,
    //         contract,
    //         contractAsOwner,
    //         owner,
    //         tokenIds,
    //       }) {
    //         const receiverContract = await deployMandatoryERC721TokenReceiver(
    //           contract.address,
    //           true,
    //           false
    //         );
    //         const receiverAddress = receiverContract.address;
    //         await expect(
    //           contractAsOwner.batchTransferFrom(
    //             owner,
    //             receiverAddress,
    //             [tokenIds[0]],
    //             '0x'
    //           )
    //         ).to.be.reverted;
    //       });

    //       it('batch transfering to a contract that do not implemented mandatory receiver should not fail', async function ({
    //         deployNonReceivingContract,
    //         contract,
    //         contractAsOwner,
    //         owner,
    //         tokenIds,
    //       }) {
    //         const receiverContract = await deployNonReceivingContract(
    //           contract.address
    //         );
    //         const receiverAddress = receiverContract.address;
    //         await contractAsOwner
    //           .batchTransferFrom(owner, receiverAddress, [tokenIds[0]], '0x')
    //           .then((tx) => tx.wait());
    //       });

    //       it('batch transfering to a contract that return the correct onERC721Received bytes shoudl succeed', async function ({
    //         deployMandatoryERC721TokenReceiver,
    //         contract,
    //         contractAsOwner,
    //         owner,
    //         tokenIds,
    //       }) {
    //         const receiverContract = await deployMandatoryERC721TokenReceiver(
    //           contract.address,
    //           true,
    //           true
    //         );
    //         const receiverAddress = receiverContract.address;
    //         await contractAsOwner
    //           .batchTransferFrom(owner, receiverAddress, [tokenIds[0]], '0x')
    //           .then((tx) => tx.wait());
    //         const newOwner = await contract.callStatic.ownerOf(tokenIds[0]);
    //         assert.equal(newOwner, receiverAddress);
    //       });
    //     });
    //   }
    //   describe('mandatory transfer', function (it) {
    //     it('transfering to a contract that do not implements mandatory erc721 receiver but implement classic ERC721 receiver and reject should not fails', async function ({
    //       deployERC721TokenReceiver,
    //       contract,
    //       contractAsOwner,
    //       owner,
    //       tokenIds,
    //     }) {
    //       const receiverContract = await deployERC721TokenReceiver(
    //         contract.address,
    //         false,
    //         true
    //       );
    //       const receiverAddress = receiverContract.address;
    //       await contractAsOwner
    //         .transferFrom(owner, receiverAddress, tokenIds[0])
    //         .then((tx) => tx.wait());
    //       const newOwner = await contract.callStatic.ownerOf(tokenIds[0]);
    //       assert.equal(newOwner, receiverAddress);
    //     });
    //     it('transfering to a contract that implements mandatory erc721 receiver (and signal it properly via 165) should fails if it reject it', async function ({
    //       deployMandatoryERC721TokenReceiver,
    //       contract,
    //       contractAsOwner,
    //       owner,
    //       tokenIds,
    //     }) {
    //       const receiverContract = await deployMandatoryERC721TokenReceiver(
    //         contract.address,
    //         false,
    //         true
    //       );
    //       const receiverAddress = receiverContract.address;
    //       await expect(
    //         contractAsOwner.transferFrom(owner, receiverAddress, tokenIds[0])
    //       ).to.be.reverted;
    //     });
    //     it('transfering to a contract that do not accept erc721 token should fail', async function ({
    //       deployMandatoryERC721TokenReceiver,
    //       contract,
    //       contractAsOwner,
    //       owner,
    //       tokenIds,
    //     }) {
    //       const receiverContract = await deployMandatoryERC721TokenReceiver(
    //         contract.address,
    //         false,
    //         true
    //       );
    //       const receiverAddress = receiverContract.address;
    //       await expect(
    //         contractAsOwner.transferFrom(owner, receiverAddress, tokenIds[0])
    //       ).to.be.reverted;
    //     });

    //     it('transfering to a contract that do not return the correct onERC721Received bytes shoudl fail', async function ({
    //       deployMandatoryERC721TokenReceiver,
    //       contract,
    //       contractAsOwner,
    //       owner,
    //       tokenIds,
    //     }) {
    //       const receiverContract = await deployMandatoryERC721TokenReceiver(
    //         contract.address,
    //         true,
    //         false
    //       );
    //       const receiverAddress = receiverContract.address;
    //       await expect(
    //         contractAsOwner.transferFrom(owner, receiverAddress, tokenIds[0])
    //       ).to.be.reverted;
    //     });

    //     it('transfering to a contract that do not implemented mandatory receiver should not fail', async function ({
    //       deployNonReceivingContract,
    //       contract,
    //       contractAsOwner,
    //       owner,
    //       tokenIds,
    //     }) {
    //       const receiverContract = await deployNonReceivingContract(
    //         contract.address
    //       );
    //       const receiverAddress = receiverContract.address;
    //       await contractAsOwner
    //         .transferFrom(owner, receiverAddress, tokenIds[0])
    //         .then((tx) => tx.wait());
    //     });

    //     it('transfering to a contract that return the correct onERC721Received bytes shoudl succeed', async function ({
    //       deployMandatoryERC721TokenReceiver,
    //       contract,
    //       contractAsOwner,
    //       owner,
    //       tokenIds,
    //     }) {
    //       const receiverContract = await deployMandatoryERC721TokenReceiver(
    //         contract.address,
    //         true,
    //         true
    //       );
    //       const receiverAddress = receiverContract.address;
    //       await contractAsOwner
    //         .transferFrom(owner, receiverAddress, tokenIds[0])
    //         .then((tx) => tx.wait());
    //       const newOwner = await contract.callStatic.ownerOf(tokenIds[0]);
    //       assert.equal(newOwner, receiverAddress);
    //     });

    //     // it('transfering to a contract that return the correct onERC721Received bytes shoudl succeed', async () => {
    //     //     const receiverContract = await deployContract(user0, 'TestMandatoryERC721TokenReceiver', contract.address, true, true);
    //     //     const receiverAddress = receiverContract.address;
    //     //     await ransferFrom(user0, user0, receiverAddress, tokenIds[0]);
    //     //     const newOwner = await call(contract, 'ownerOf', null, tokenIds[0]);
    //     //     assert.equal(newOwner, receiverAddress);
    //     // });
    //   });
    // }

    // if (extensions.batchTransfer) {
    //   describe('safe batch transfer', function (it) {
    //     it('safe batch transfer of same NFT ids should fails', async function ({
    //       contractAsOwner,
    //       tokenIds,
    //       owner,
    //       user0,
    //     }) {
    //       await expect(
    //         contractAsOwner.safeBatchTransferFrom(
    //           owner,
    //           user0,
    //           [tokenIds[0], tokenIds[1], tokenIds[0]],
    //           '0x'
    //         )
    //       ).to.be.reverted;
    //     });
    //     // it('safe batch transfer of same NFT ids should fails even if from == to', async () => {
    //     //     let reverted = false;
    //     //     try {
    //     //         await tx(contract, 'safeBatchTransferFrom', {from: user0, gas}, user0, user0, [tokenIds[0], tokenIds[1], tokenIds[0]], '0x');
    //     //     } catch (e) {
    //     //         reverted = true;
    //     //         console.log('ERROR', e);
    //     //     }
    //     //     assert.equal(reverted, true);
    //     //     // await expectRevert(tx(contract, 'safeBatchTransferFrom', {from: user0, gas}, user0, user0, [tokenIds[0], tokenIds[1], tokenIds[0]], '0x'));
    //     // });
    //     it('safe batch transfer works', async function ({
    //       contractAsOwner,
    //       tokenIds,
    //       owner,
    //       user0,
    //     }) {
    //       await contractAsOwner
    //         .safeBatchTransferFrom(owner, user0, tokenIds, '0x')
    //         .then((tx) => tx.wait());
    //       // console.log('gas used for safe batch transfer = ' + receipt.gasUsed);
    //     });
    //   });
    // }

    describe('transfer', function (it) {
      it('transfering one NFT results in one erc721 transfer event', async function ({
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        const receipt = await waitFor(
          users[1].contract.transferFrom(
            users[1].address,
            users[0].address,
            tokenId
          )
        );
        const transferEvents = receipt.events?.filter(
          (v) => v.event === 'Transfer'
        );
        assert.equal(transferEvents && transferEvents.length, 1);
        const transferEvent = transferEvents && transferEvents[0];
        assert.equal(
          transferEvent?.args && transferEvent?.args[0],
          users[1].address
        );
        assert.equal(
          transferEvent?.args && transferEvent?.args[1],
          users[0].address
        );
        assert(transferEvent?.args && transferEvent?.args[2].eq(tokenId));
      });
      it('transfering one NFT change to correct owner', async function ({
        contract,
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        await waitFor(
          users[1].contract.transferFrom(
            users[1].address,
            users[0].address,
            tokenId
          )
        );
        const newOwner = await contract.callStatic.ownerOf(tokenId);
        assert.equal(newOwner, users[0].address);
      });

      it('transfering one NFT increase new owner balance', async function ({
        contract,
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        const balanceBefore = await contract.callStatic.balanceOf(
          users[0].address
        );
        await waitFor(
          users[1].contract.transferFrom(
            users[1].address,
            users[0].address,
            tokenId
          )
        );
        const balanceAfter = await contract.callStatic.balanceOf(
          users[0].address
        );
        assert(balanceBefore.add(1).eq(balanceAfter));
      });

      it('transfering one NFT decrease past owner balance', async function ({
        contract,
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        const balanceBefore = await contract.callStatic.balanceOf(
          users[1].address
        );
        await waitFor(
          users[1].contract.transferFrom(
            users[1].address,
            users[0].address,
            tokenId
          )
        );
        const balanceAfter = await contract.callStatic.balanceOf(
          users[1].address
        );
        assert(balanceBefore.sub(1).eq(balanceAfter));
      });

      it('transfering from without approval should fails', async function ({
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        await expect(
          users[0].contract.transferFrom(
            users[1].address,
            users[0].address,
            tokenId
          )
        ).to.be.reverted;
      });

      it('transfering a token you do not own should fails', async function ({
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        await expect(
          users[0].contract.transferFrom(
            users[0].address,
            users[2].address,
            tokenId
          )
        ).to.be.reverted;
      });

      it('transfering to zero address should fails', async function ({
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        await expect(
          users[1].contract.transferFrom(users[1].address, AddressZero, tokenId)
        ).to.be.reverted;
      });

      it('transfering to a contract that do not accept erc721 token should not fail', async function ({
        deployERC721TokenReceiver,
        contract,
        users,
        mint,
      }) {
        const receiverContract = await deployERC721TokenReceiver(
          contract.address,
          false,
          true
        );
        const receiverAddress = receiverContract.address;
        const {tokenId} = await mint(users[1].address);
        await waitFor(
          users[1].contract.transferFrom(
            users[1].address,
            receiverAddress,
            tokenId
          )
        );
        const newOwner = await contract.callStatic.ownerOf(tokenId);
        assert.equal(newOwner, receiverAddress);
      });
    });

    function testSafeTransfers(
      it: (
        title: string,
        test: (fixture: ERC721FinalFixture) => Promise<void>
      ) => void,
      data?: string
    ) {
      const prefix = data ? 'data:' + data + ' : ' : '';
      let safeTransferFrom = (
        contract: Contract,
        from: string,
        to: string,
        tokenId: string
      ) => {
        return waitFor(
          contract['safeTransferFrom(address,address,uint256)'](
            from,
            to,
            tokenId
          )
        );
      };

      if (data) {
        safeTransferFrom = (
          contract: Contract,
          from: string,
          to: string,
          tokenId: string
        ) => {
          return waitFor(
            contract['safeTransferFrom(address,address,uint256,bytes)'](
              from,
              to,
              tokenId,
              data
            )
          );
        };
      }

      it(
        prefix +
          'safe transfering one NFT results in one erc721 transfer event',
        async function ({users, mint}) {
          const {tokenId} = await mint(users[1].address);
          const receipt = await safeTransferFrom(
            users[1].contract,
            users[1].address,
            users[0].address,
            tokenId
          );
          const eventsMatching = receipt.events?.filter(
            (v) => v.event === 'Transfer'
          );
          assert.equal(eventsMatching && eventsMatching.length, 1);
          const transferEvent = eventsMatching && eventsMatching[0];
          assert.equal(
            transferEvent?.args && transferEvent.args[0],
            users[1].address
          );
          assert.equal(
            transferEvent?.args && transferEvent.args[1],
            users[0].address
          );
          assert(transferEvent?.args && transferEvent.args[2].eq(tokenId));
        }
      );

      it(
        prefix + 'safe transfering to zero address should fails',
        async function ({users, mint}) {
          const {tokenId} = await mint(users[1].address);
          await expect(
            safeTransferFrom(
              users[1].contract,
              users[1].address,
              AddressZero,
              tokenId
            )
          ).to.be.reverted;
        }
      );

      it(
        prefix + 'safe transfering one NFT change to correct owner',
        async function ({contract, users, mint}) {
          const {tokenId} = await mint(users[1].address);
          await safeTransferFrom(
            users[1].contract,
            users[1].address,
            users[0].address,
            tokenId
          );
          const newOwner = await contract.callStatic.ownerOf(tokenId);
          assert.equal(newOwner, users[0].address);
        }
      );

      it(
        prefix + 'safe transfering from without approval should fails',
        async function ({users, mint}) {
          const {tokenId} = await mint(users[1].address);
          await expect(
            safeTransferFrom(
              users[0].contract,
              users[1].address,
              users[0].address,
              tokenId
            )
          ).to.be.reverted;
        }
      );

      it(
        prefix +
          'safe transfering to a contract that do not accept erc721 token should fail',
        async function ({deployERC721TokenReceiver, contract, users, mint}) {
          const receiverContract = await deployERC721TokenReceiver(
            contract.address,
            false,
            true
          );
          const receiverAddress = receiverContract.address;
          const {tokenId} = await mint(users[1].address);
          await expect(
            safeTransferFrom(
              users[1].contract,
              users[1].address,
              receiverAddress,
              tokenId
            )
          ).to.be.reverted;
        }
      );

      it(
        prefix +
          'safe transfering to a contract that do not return the correct onERC721Received bytes shoudl fail',
        async function ({deployERC721TokenReceiver, contract, users, mint}) {
          const receiverContract = await deployERC721TokenReceiver(
            contract.address,
            true,
            false
          );
          const receiverAddress = receiverContract.address;
          const {tokenId} = await mint(users[1].address);
          await expect(
            safeTransferFrom(
              users[1].contract,
              users[1].address,
              receiverAddress,
              tokenId
            )
          ).to.be.reverted;
        }
      );

      it(
        prefix +
          'safe transfering to a contract that do not implemented onERC721Received should fail',
        async function ({deployNonReceivingContract, contract, users, mint}) {
          const receiverContract = await deployNonReceivingContract(
            contract.address
          );
          const receiverAddress = receiverContract.address;
          const {tokenId} = await mint(users[1].address);
          await expect(
            safeTransferFrom(
              users[1].contract,
              users[1].address,
              receiverAddress,
              tokenId
            )
          ).to.be.reverted;
        }
      );

      it(
        prefix +
          'safe transfering to a contract that return the correct onERC721Received bytes shoudl succeed',
        async function ({deployERC721TokenReceiver, contract, users, mint}) {
          const receiverContract = await deployERC721TokenReceiver(
            contract.address,
            true,
            true
          );
          const receiverAddress = receiverContract.address;
          const {tokenId} = await mint(users[1].address);
          await safeTransferFrom(
            users[1].contract,
            users[1].address,
            receiverAddress,
            tokenId
          );
          const newOwner = await contract.callStatic.ownerOf(tokenId);
          assert.equal(newOwner, receiverAddress);
        }
      );
    }

    describe('safeTransfer', function (it) {
      testSafeTransfers(it);
    });
    describe('safeTransfer with empty bytes', function (it) {
      testSafeTransfers(it, '0x');
    });
    describe('safeTransfer with data', function (it) {
      testSafeTransfers(it, '0xff56fe3422');
    });

    describe('ERC165', function (it) {
      it('claim to support erc165', async function ({contract}) {
        const result = await contract.callStatic.supportsInterface(
          '0x01ffc9a7'
        );
        assert.equal(result, true);
      });

      it('claim to support base erc721 interface', async function ({contract}) {
        const result = await contract.callStatic.supportsInterface(
          '0x80ac58cd'
        );
        assert.equal(result, true);
      });

      it('claim to support erc721 metadata interface', async function ({
        contract,
      }) {
        const result = await contract.callStatic.supportsInterface(
          '0x5b5e139f'
        );
        assert.equal(result, true);
      });

      it('does not claim to support random interface', async function ({
        contract,
      }) {
        const result = await contract.callStatic.supportsInterface(
          '0x88888888'
        );
        assert.equal(result, false);
      });

      it('does not claim to support the invalid interface', async function ({
        contract,
      }) {
        const result = await contract.callStatic.supportsInterface(
          '0xFFFFFFFF'
        );
        assert.equal(result, false);
      });
    });

    describe('Approval', function (it) {
      it('approving emit Approval event', async function ({users, mint}) {
        const {tokenId} = await mint(users[1].address);
        const receipt = await waitFor(
          users[1].contract.approve(users[0].address, tokenId)
        );
        const eventsMatching = receipt.events?.filter(
          (v) => v.event === 'Approval'
        );
        assert.equal(eventsMatching && eventsMatching.length, 1);
        const eventValues = eventsMatching && eventsMatching[0].args;
        assert.equal(eventValues && eventValues[0], users[1].address);
        assert.equal(eventValues && eventValues[1], users[0].address);
        assert(eventValues && eventValues[2].eq(tokenId));
      });

      it('removing approval emit Approval event', async function ({
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        await waitFor(users[1].contract.approve(users[0].address, tokenId));
        const receipt = await waitFor(
          users[1].contract.approve(AddressZero, tokenId)
        );
        const eventsMatching = receipt.events?.filter(
          (v) => v.event === 'Approval'
        );
        assert.equal(eventsMatching && eventsMatching.length, 1);
        const eventValues = eventsMatching && eventsMatching[0].args;
        assert.equal(eventValues && eventValues[0], users[1].address);
        assert.equal(eventValues && eventValues[1], AddressZero);
        assert(eventValues && eventValues[2].eq(tokenId));
      });

      it('approving update the approval status', async function ({
        contract,
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        await waitFor(users[1].contract.approve(users[2].address, tokenId));
        const approvedAddress = await contract.callStatic.getApproved(tokenId);
        assert.equal(approvedAddress, users[2].address);
      });

      it('cant approve if not owner or operator ', async function ({
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        await waitFor(
          users[1].contract.transferFrom(
            users[1].address,
            users[0].address,
            tokenId
          )
        );
        await expect(users[1].contract.approve(users[0].address, tokenId)).to.be
          .reverted;
      });

      it('approving allows transfer from the approved party', async function ({
        contract,
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        await waitFor(users[1].contract.approve(users[0].address, tokenId));
        await waitFor(
          users[0].contract.transferFrom(
            users[1].address,
            users[2].address,
            tokenId
          )
        );
        const newOwner = await contract.callStatic.ownerOf(tokenId);
        assert.equal(newOwner, users[2].address);
      });

      it('approving allows safe transfer from the approved party', async function ({
        contract,
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        await waitFor(users[1].contract.approve(users[0].address, tokenId));
        await waitFor(
          users[0].contract['safeTransferFrom(address,address,uint256)'](
            users[1].address,
            users[2].address,
            tokenId
          )
        );
        const newOwner = await contract.callStatic.ownerOf(tokenId);
        assert.equal(newOwner, users[2].address);
      });

      it('transfering the approved NFT results in aproval reset for it', async function ({
        contract,
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        await waitFor(users[1].contract.approve(users[2].address, tokenId));
        await waitFor(
          users[2].contract.transferFrom(
            users[1].address,
            users[0].address,
            tokenId
          )
        );
        const approvedAddress = await contract.callStatic.getApproved(tokenId);
        assert.equal(approvedAddress, AddressZero);
      });

      it('safe transfering the approved NFT results in aproval reset for it', async function ({
        contract,
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        await waitFor(users[1].contract.approve(users[2].address, tokenId));
        await waitFor(
          users[2].contract['safeTransferFrom(address,address,uint256)'](
            users[1].address,
            users[0].address,
            tokenId
          )
        );
        const approvedAddress = await contract.callStatic.getApproved(tokenId);
        assert.equal(approvedAddress, AddressZero);
      });

      it('transfering the approved NFT results in aproval reset for it but no approval event', async function ({
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        await waitFor(users[1].contract.approve(users[2].address, tokenId));
        const receipt = await waitFor(
          users[2].contract.transferFrom(
            users[1].address,
            users[0].address,
            tokenId
          )
        );
        const eventsMatching = receipt.events?.filter(
          (v) => v.event === 'Approval'
        );
        assert.equal(eventsMatching && eventsMatching.length, 0);
      });

      it('safe transfering the approved NFT results in aproval reset for it but no approval event', async function ({
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        await waitFor(users[1].contract.approve(users[2].address, tokenId));
        const receipt = await waitFor(
          users[2].contract['safeTransferFrom(address,address,uint256)'](
            users[1].address,
            users[0].address,
            tokenId
          )
        );
        const eventsMatching = receipt.events?.filter(
          (v) => v.event === 'Approval'
        );
        assert.equal(eventsMatching && eventsMatching.length, 0);
      });

      it('transfering the approved NFT again will fail', async function ({
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        await waitFor(users[1].contract.approve(users[2].address, tokenId));
        await waitFor(
          users[2].contract.transferFrom(
            users[1].address,
            users[0].address,
            tokenId
          )
        );
        await expect(
          users[2].contract.transferFrom(
            users[0].address,
            users[1].address,
            tokenId
          )
        ).to.be.reverted;
      });

      it('tsafe ransfering the approved NFT again will fail', async function ({
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        await waitFor(users[1].contract.approve(users[2].address, tokenId));
        await waitFor(
          users[2].contract['safeTransferFrom(address,address,uint256)'](
            users[1].address,
            users[0].address,
            tokenId
          )
        );
        await expect(
          users[2].contract['safeTransferFrom(address,address,uint256)'](
            users[0].address,
            users[1].address,
            tokenId
          )
        ).to.be.reverted;
      });

      it('approval by operator works', async function ({
        contract,
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        await waitFor(
          users[1].contract.transferFrom(
            users[1].address,
            users[0].address,
            tokenId
          )
        );

        await waitFor(
          users[0].contract.setApprovalForAll(users[2].address, true)
        );
        // await tx(contract, 'approve', {from: user0, gas}, user1, tokenId);
        await waitFor(
          users[2].contract.transferFrom(
            users[0].address,
            users[3].address,
            tokenId
          )
        );
        const newOwner = await contract.callStatic.ownerOf(tokenId);
        assert.equal(newOwner, users[3].address);
      });

      it('approval by operator works for safeTransfer', async function ({
        contract,
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        await waitFor(
          users[1].contract.transferFrom(
            users[1].address,
            users[0].address,
            tokenId
          )
        );

        await waitFor(
          users[0].contract.setApprovalForAll(users[2].address, true)
        );
        // await tx(contract, 'approve', {from: user0, gas}, user1, tokenId);
        await waitFor(
          users[2].contract['safeTransferFrom(address,address,uint256)'](
            users[0].address,
            users[3].address,
            tokenId
          )
        );
        const newOwner = await contract.callStatic.ownerOf(tokenId);
        assert.equal(newOwner, users[3].address);
      });
    });

    describe('ApprovalForAll', function (it) {
      it('approving all emit ApprovalForAll event', async function ({users}) {
        const receipt = await waitFor(
          users[1].contract.setApprovalForAll(users[0].address, true)
        );
        const eventsMatching = receipt.events?.filter(
          (v) => v.event === 'ApprovalForAll'
        );
        assert.equal(eventsMatching?.length, 1);
        const eventValues = eventsMatching && eventsMatching[0].args;
        assert.equal(eventValues && eventValues[0], users[1].address);
        assert.equal(eventValues && eventValues[1], users[0].address);
        assert.equal(eventValues && eventValues[2], true);
      });

      it('approving all update the approval status', async function ({
        users,
        contract,
      }) {
        await waitFor(
          users[1].contract.setApprovalForAll(users[0].address, true)
        );
        const isUser0Approved = await contract.callStatic.isApprovedForAll(
          users[1].address,
          users[0].address
        );
        assert.equal(isUser0Approved, true);
      });

      it('unsetting approval for all should update the approval status', async function ({
        contract,
        users,
      }) {
        await waitFor(
          users[1].contract.setApprovalForAll(users[0].address, true)
        );
        await waitFor(
          users[1].contract.setApprovalForAll(users[0].address, false)
        );
        const isUser0Approved = await contract.callStatic.isApprovedForAll(
          users[1].address,
          users[0].address
        );
        assert.equal(isUser0Approved, false);
      });

      it('unsetting approval for all should emit ApprovalForAll event', async function ({
        users,
      }) {
        await waitFor(
          users[1].contract.setApprovalForAll(users[0].address, true)
        );
        const receipt = await waitFor(
          users[1].contract.setApprovalForAll(users[0].address, false)
        );
        const eventsMatching = receipt.events?.filter(
          (v) => v.event === 'ApprovalForAll'
        );
        assert.equal(eventsMatching?.length, 1);
        const eventValues = eventsMatching && eventsMatching[0].args;
        assert.equal(eventValues && eventValues[0], users[1].address);
        assert.equal(eventValues && eventValues[1], users[0].address);
        assert.equal(eventValues && eventValues[2], false);
      });

      it('approving for all allows transfer from the approved party', async function ({
        contract,
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        await waitFor(
          users[1].contract.setApprovalForAll(users[0].address, true)
        );
        await waitFor(
          users[0].contract.transferFrom(
            users[1].address,
            users[2].address,
            tokenId
          )
        );
        const newOwner = await contract.callStatic.ownerOf(tokenId);
        assert.equal(newOwner, users[2].address);
      });
      it('transfering one NFT do not results in aprovalForAll reset', async function ({
        contract,
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        await waitFor(
          users[1].contract.setApprovalForAll(users[2].address, true)
        );
        await waitFor(
          users[1].contract.transferFrom(
            users[1].address,
            users[0].address,
            tokenId
          )
        );
        const isUser1Approved = await contract.callStatic.isApprovedForAll(
          users[1].address,
          users[2].address
        );
        assert.equal(isUser1Approved, true);
      });

      it('approval for all does not grant approval on a transfered NFT', async function ({
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        await waitFor(
          users[1].contract.setApprovalForAll(users[2].address, true)
        );
        await waitFor(
          users[1].contract.transferFrom(
            users[1].address,
            users[0].address,
            tokenId
          )
        );
        await expect(
          users[2].contract.transferFrom(
            users[0].address,
            users[2].address,
            tokenId
          )
        ).to.be.reverted;
      });

      it('approval for all set before will work on a transfered NFT', async function ({
        contract,
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        await waitFor(
          users[0].contract.setApprovalForAll(users[2].address, true)
        );
        await waitFor(
          users[1].contract.transferFrom(
            users[1].address,
            users[0].address,
            tokenId
          )
        );
        await waitFor(
          users[2].contract.transferFrom(
            users[0].address,
            users[2].address,
            tokenId
          )
        );
        const newOwner = await contract.callStatic.ownerOf(tokenId);
        assert.equal(newOwner, users[2].address);
      });

      it('approval for all allow to set individual nft approve', async function ({
        contract,
        users,
        mint,
      }) {
        const {tokenId} = await mint(users[1].address);
        await waitFor(
          users[1].contract.transferFrom(
            users[1].address,
            users[0].address,
            tokenId
          )
        );

        await waitFor(
          users[0].contract.setApprovalForAll(users[2].address, true)
        );

        await waitFor(users[0].contract.approve(users[3].address, tokenId));
        await waitFor(
          users[3].contract.transferFrom(
            users[0].address,
            users[3].address,
            tokenId
          )
        );
        const newOwner = await contract.callStatic.ownerOf(tokenId);
        assert.equal(newOwner, users[3].address);
      });
    });
  }
);

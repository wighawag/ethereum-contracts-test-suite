import {assert, expect} from '../chai-setup';
import {waitFor} from '../utils';
import {BigNumber} from '@ethersproject/bignumber';
import {AddressZero} from '@ethersproject/constants';
import {Contract} from '@ethersproject/contracts';
import {Web3Provider} from '@ethersproject/providers';
import erc20ABI from './erc20_abi.json';

import {TestSuite} from '../testsuite';

type ERC20Fixture = {
  ethereum: any; // TODO
  contractAddress: string;
  users: string[];
  userWithToken: string;
};

export type User = {
  address: string;
  contract: Contract;
  initialBalance: BigNumber;
};

export type ERC20FinalFixture = {
  contract: Contract;
  userWithToken: User;
  users: User[];
};

export const erc20 = new TestSuite<
  ERC20Fixture,
  {burn?: boolean; EIP717?: boolean},
  ERC20FinalFixture
>(
  async ({ethereum, contractAddress, users, userWithToken}) => {
    const ethersProvider = new Web3Provider(ethereum);

    const contract = new Contract(contractAddress, erc20ABI, ethersProvider);

    const usersWithContracts = [];
    for (const user of users) {
      usersWithContracts.push({
        address: user,
        contract: contract.connect(ethersProvider.getSigner(user)),
        initialBalance: BigNumber.from(0),
      });
    }

    let userWithTokenAsUser: User;
    const balance = await contract.balanceOf(userWithToken);
    if (balance.gt(100000)) {
      userWithTokenAsUser = {
        address: userWithToken,
        contract: contract.connect(ethersProvider.getSigner(userWithToken)),
        initialBalance: balance,
      };
    } else {
      throw new Error(`cannot Test as user do not have enough tokens`);
    }

    return {
      contract,
      userWithToken: userWithTokenAsUser,
      users: usersWithContracts,
    };
  },
  ({describe, it, options}) => {
    it('transfering from userWithToken to userWithToken should adjust their balance accordingly', async function ({
      users,
      userWithToken,
      contract,
    }) {
      const amount = BigNumber.from('1000');
      await waitFor(userWithToken.contract.transfer(users[0].address, amount));
      const user0Balance = await contract.callStatic.balanceOf(
        userWithToken.address
      );
      const user1Balance = await contract.callStatic.balanceOf(
        users[0].address
      );
      expect(user1Balance).to.equal(users[0].initialBalance.add(amount));
      expect(user0Balance).to.equal(userWithToken.initialBalance.sub(amount));
    });

    it('transfering from userWithToken more token that it owns should fails', async function ({
      users,
      userWithToken,
    }) {
      await expect(
        userWithToken.contract.transfer(
          users[0].address,
          userWithToken.initialBalance.add('1000')
        )
      ).to.be.reverted;
    });

    it('transfering to address zero should fails', async function ({
      userWithToken,
    }) {
      await expect(userWithToken.contract.transfer(AddressZero, '1000')).to.be
        .reverted;
    });
    it('transfering to address(this) should fail', async function ({
      userWithToken,
      contract,
    }) {
      await expect(userWithToken.contract.transfer(contract.address, '1000')).to
        .be.reverted;
    });
    it('transfering from userWithToken to users[0] by userWithToken should adjust their balance accordingly', async function ({
      users,
      userWithToken,
      contract,
    }) {
      const amount = BigNumber.from('1000');
      await waitFor(
        userWithToken.contract.transferFrom(
          userWithToken.address,
          users[0].address,
          amount
        )
      );
      const user0Balance = await contract.callStatic.balanceOf(
        userWithToken.address
      );
      const user1Balance = await contract.callStatic.balanceOf(
        users[0].address
      );
      expect(user1Balance).to.equal(users[0].initialBalance.add(amount));
      expect(user0Balance).to.equal(userWithToken.initialBalance.sub(amount));
    });

    it('transfering from userWithToken by users[0] should fails', async function ({
      users,
      userWithToken,
    }) {
      await expect(
        users[0].contract.transferFrom(
          userWithToken.address,
          users[0].address,
          userWithToken.initialBalance
        )
      ).to.be.reverted;
    });

    it('transfering from userWithToken to users[0] should trigger a transfer event', async function ({
      users,
      userWithToken,
    }) {
      const amount = BigNumber.from('1000');
      const receipt = await waitFor(
        userWithToken.contract.transfer(users[0].address, amount)
      );
      const event = receipt.events?.find((e) => e.event == 'Transfer');
      if (!(event && event.args)) {
        throw new Error(`no Transfer event found`);
      }
      assert.equal(event.args[0].toString(), userWithToken.address.toString());
      assert.equal(event.args[1].toString(), users[0].address.toString());
      assert.equal(event.args[2].toString(), amount.toString());
    });

    it('transfering from userWithToken to users[0] by operator after approval, should adjust their balance accordingly', async function ({
      users,
      userWithToken,
      contract,
    }) {
      const amount = BigNumber.from('1000');
      const operator = users[2];
      await waitFor(userWithToken.contract.approve(operator.address, amount));
      await waitFor(
        operator.contract.transferFrom(
          userWithToken.address,
          users[0].address,
          amount
        )
      );
      const user0Balance = await contract.callStatic.balanceOf(
        userWithToken.address
      );
      const user1Balance = await contract.callStatic.balanceOf(
        users[0].address
      );
      expect(user1Balance).to.equal(users[0].initialBalance.add(amount));
      expect(user0Balance).to.equal(userWithToken.initialBalance.sub(amount));
    });

    it('transfering from userWithToken to users[0] by operator after approval and approval reset, should fail', async function ({
      users,
      userWithToken,
    }) {
      const amount = BigNumber.from('1000');
      const operator = users[2];
      await waitFor(userWithToken.contract.approve(operator.address, amount));
      await waitFor(userWithToken.contract.approve(operator.address, 0));
      await expect(
        operator.contract.transferFrom(
          userWithToken.address,
          users[0].address,
          amount
        )
      ).to.be.reverted;
    });
    it('transfering from userWithToken to users[0] by operator after approval, should adjust the operator alowance accordingly', async function ({
      users,
      userWithToken,
      contract,
    }) {
      const amountApproved = BigNumber.from('1010');
      const amount = BigNumber.from('1000');
      const operator = users[2];
      await waitFor(
        userWithToken.contract.approve(operator.address, amountApproved)
      );
      await waitFor(
        operator.contract.transferFrom(
          userWithToken.address,
          users[0].address,
          amount
        )
      );
      const allowance = await contract.callStatic.allowance(
        userWithToken.address,
        operator.address
      );
      assert.equal(allowance.toString(), amountApproved.sub(amount).toString());
    });

    if (options?.EIP717) {
      it('transfering from userWithToken to users[0] by operator after max approval (2**256-1), should NOT adjust the operator allowance', async function ({
        users,
        userWithToken,
        contract,
      }) {
        const amountApproved = BigNumber.from(
          '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
        );
        const amount = BigNumber.from('1000');
        const operator = users[2];
        await waitFor(
          userWithToken.contract.approve(operator.address, amountApproved)
        );
        await waitFor(
          operator.contract.transferFrom(
            userWithToken.address,
            users[0].address,
            amount
          )
        );
        const allowance = await contract.callStatic.allowance(
          userWithToken.address,
          operator.address
        );
        assert.equal(
          allowance.toHexString(),
          '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
        );
      });
    } else {
      it('transfering from userWithToken to users[0] by operator after max approval (2**256-1), should still adjust the operator allowance', async function ({
        users,
        userWithToken,
        contract,
      }) {
        const amountApproved = BigNumber.from(
          '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
        );
        const amount = BigNumber.from('1000');
        const operator = users[2];
        await waitFor(
          userWithToken.contract.approve(operator.address, amountApproved)
        );
        await waitFor(
          operator.contract.transferFrom(
            userWithToken.address,
            users[0].address,
            amount
          )
        );
        const allowance = await contract.callStatic.allowance(
          userWithToken.address,
          operator.address
        );
        assert.equal(
          allowance.toHexString(),
          amountApproved.sub(amount).toHexString()
        );
      });
    }

    it('transfering from userWithToken to users[0] by operator after approval, but without enough allowance, should fails', async function ({
      users,
      userWithToken,
    }) {
      const amountApproved = BigNumber.from('1010');
      const amount = amountApproved.add(1);
      const operator = users[2];
      await waitFor(
        userWithToken.contract.approve(operator.address, amountApproved)
      );
      await expect(
        operator.contract.transferFrom(
          userWithToken.address,
          users[0].address,
          amount
        )
      ).to.be.reverted;
    });

    it('transfering from userWithToken by operators without pre-approval should fails', async function ({
      users,
      userWithToken,
    }) {
      const operator = users[2];
      await expect(
        operator.contract.transferFrom(
          userWithToken.address,
          users[0].address,
          userWithToken.initialBalance
        )
      ).to.be.reverted;
    });

    it('approving operator should trigger a Approval event', async function ({
      users,
      userWithToken,
    }) {
      const operator = users[2];
      const receipt = await waitFor(
        userWithToken.contract.approve(operator.address, '1000')
      );
      const event = receipt.events?.find((e) => e.event == 'Approval');
      if (!(event && event.args)) {
        throw new Error(`no Approval event found`);
      }
      assert.equal(event.args[2].toString(), '1000');
    });
    it('disapproving operator (allowance to zero) should trigger a Approval event', async function ({
      users,
      userWithToken,
    }) {
      const operator = users[2];
      await waitFor(userWithToken.contract.approve(operator.address, '1000'));
      const receipt = await waitFor(
        userWithToken.contract.approve(operator.address, '0')
      );
      const event = receipt.events?.find((e) => e.event == 'Approval');
      if (!(event && event.args)) {
        throw new Error(`no Approval event found`);
      }
      assert.equal(event.args[2].toString(), '0');
    });

    it('approve to address zero should fails', async function ({
      userWithToken,
    }) {
      await expect(userWithToken.contract.approve(AddressZero, '1000')).to.be
        .reverted;
    });

    if (options?.burn) {
      describe('burn', function () {
        it('burn should emit erc20 transfer event to zero address', async function ({
          userWithToken,
        }) {
          const receipt = await waitFor(userWithToken.contract.burn('1000'));
          const event = receipt.events?.find((e) => e.event == 'Transfer');
          if (!(event && event.args)) {
            throw new Error(`no Transfer event found`);
          }
          assert.equal(event.args[0], userWithToken.address);
          assert.equal(
            event.args[1],
            '0x0000000000000000000000000000000000000000'
          );
          assert.equal(event.args[2].toString(), '1000');
        });

        it('burning more token that a user owns should fails', async function ({
          userWithToken,
        }) {
          await expect(
            userWithToken.contract.burn(userWithToken.initialBalance.add(1))
          ).to.be.reverted;
        });
      });
    }
  }
);

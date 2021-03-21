import {
  Contract,
  ContractReceipt,
  ContractTransaction,
} from '@ethersproject/contracts';
import {Web3Provider} from '@ethersproject/providers';
import {
  TransactionResponse,
  TransactionReceipt,
} from '@ethersproject/abstract-provider';

export async function setupUsers<T extends {[contractName: string]: Contract}>(
  addresses: string[],
  contracts: T
): Promise<({address: string} & T)[]> {
  const users: ({address: string} & T)[] = [];
  for (const address of addresses) {
    users.push(await setupUser(address, contracts));
  }
  return users;
}

export async function setupUser<T extends {[contractName: string]: Contract}>(
  address: string,
  contracts: T
): Promise<{address: string} & T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user: any = {address};
  for (const key of Object.keys(contracts)) {
    user[key] = contracts[key].connect(
      await (contracts[key].provider as Web3Provider).getSigner(address)
    );
  }
  return user as {address: string} & T;
}

export async function waitFor(
  p: Promise<ContractTransaction>
): Promise<ContractReceipt>;
export async function waitFor(
  p: Promise<TransactionResponse>
): Promise<TransactionReceipt> {
  const tx = await p;
  return tx.wait();
}

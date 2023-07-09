import {
	Contract,
	ContractTransaction,
	BrowserProvider,
	TransactionResponse,
	TransactionReceipt,
	ContractTransactionResponse,
	ContractTransactionReceipt,
} from 'ethers';

export async function setupUsers<T extends {[contractName: string]: Contract}>(
	addresses: string[],
	contracts: T,
): Promise<({address: string} & T)[]> {
	const users: ({address: string} & T)[] = [];
	for (const address of addresses) {
		users.push(await setupUser(address, contracts));
	}
	return users;
}

export async function setupUser<T extends {[contractName: string]: Contract}>(
	address: string,
	contracts: T,
): Promise<{address: string} & T> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const user: any = {address};
	for (const key of Object.keys(contracts)) {
		const contract = contracts[key];
		user[key] = contracts[key].connect(await (contract.runner?.provider as BrowserProvider).getSigner(address));
	}
	return user as {address: string} & T;
}

export async function waitFor(p: Promise<ContractTransactionResponse>): Promise<ContractTransactionReceipt | null>;
export async function waitFor(p: Promise<TransactionResponse>): Promise<TransactionReceipt | null>;
export async function waitFor(
	p: Promise<TransactionResponse | ContractTransactionResponse>,
): Promise<ContractTransactionReceipt | TransactionReceipt | null> {
	const tx = await p;
	return tx.wait();
}

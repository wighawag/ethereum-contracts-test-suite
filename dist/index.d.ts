import { BrowserProvider } from 'ethers';

type Test<FinalFixture> = {
    title: string;
    subTests?: Test<FinalFixture>[];
    test?: (fixture: FinalFixture) => Promise<void>;
};
type TestToRun = {
    title: string;
    subTests?: TestToRun[];
    test?: () => Promise<void>;
};
type TestSuiteFunc<T, U> = (config: {
    describe(title: string, func: (func: (title: string, test: (obj: T) => Promise<void>) => Promise<void>) => void): void;
    it(title: string, test: (obj: T) => Promise<void>): void;
    options: U;
}) => void;
declare function recurse(test: TestToRun, { describe, it, }: {
    describe: (msg: string, func: () => void) => void;
    it: (msg: string, func: () => Promise<void> | void) => Promise<void> | void;
}): void;
declare function runtests(tests: TestToRun[], { describe, it, }: {
    describe: (msg: string, func: () => void) => void;
    it: (msg: string, func: () => Promise<void> | void) => Promise<void> | void;
}): void;
declare class TestSuite<Fixture, Options extends Record<string, unknown>, FinalFixture> {
    private func;
    private transform;
    constructor(func: TestSuiteFunc<FinalFixture, Options>);
    constructor(transform: (fixture: Fixture) => Promise<FinalFixture>, func: TestSuiteFunc<FinalFixture, Options>);
    generateTests(fixture: () => Promise<Fixture>): TestToRun[];
    generateTests(options: Options, fixture: () => Promise<Fixture>): TestToRun[];
}

type ERC20Fixture = {
    ethereum: any;
    contractAddress: string;
    users: string[];
    userWithToken: string;
};
type User = {
    address: string;
    contract: any;
    initialBalance: bigint;
};
type ERC20FinalFixture = {
    contract: any;
    userWithToken: User;
    users: User[];
};
declare const erc20: TestSuite<ERC20Fixture, {
    burn?: boolean | undefined;
    EIP717?: boolean | undefined;
}, ERC20FinalFixture>;

type ERC721Fixture = {
    ethereum: any;
    contractAddress: string;
    users: string[];
    deployer: string;
    mint(to: string): Promise<{
        hash: string;
        tokenId: string;
    }>;
};
type ERC721User = {
    address: string;
    contract: any;
};
type ERC721FinalFixture = {
    contract: any;
    users: ERC721User[];
    mint(to: string): Promise<{
        hash: string;
        tokenId: string;
    }>;
    ethersProvider: BrowserProvider;
    deployERC721TokenReceiver(address: string, allowTokensReceived: boolean, returnCorrectBytes: boolean): Promise<any>;
    deployNonReceivingContract(contractAddress: string): Promise<any>;
};
type ERC721Options = {
    burn?: boolean;
    ownedByAll?: boolean;
};
declare const erc721: TestSuite<ERC721Fixture, ERC721Options, ERC721FinalFixture>;

export { ERC20FinalFixture, ERC721FinalFixture, ERC721Options, ERC721User, Test, TestSuite, TestSuiteFunc, TestToRun, User, erc20, erc721, recurse, runtests };

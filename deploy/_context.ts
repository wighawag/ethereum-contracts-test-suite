import artifacts from '../generated/artifacts';

export const context = {
	accounts: {
		deployer: {
			default: 0,
		},
		tokensBeneficiary: {
			default: 1,
		},
	},
	artifacts,
} as const;

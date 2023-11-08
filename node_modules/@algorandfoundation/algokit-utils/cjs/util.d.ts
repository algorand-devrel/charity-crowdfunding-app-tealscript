/**
 * Converts a value which might be a number or a bigint into a number to be used with apis that don't support bigint.
 *
 * Throws an UnsafeConversionError if the conversion would result in an unsafe integer for the Number type
 * @param value
 */
export declare const toNumber: (value: number | bigint) => number;
export declare class UnsafeConversionError extends Error {
}
/**
 * Calculates the amount of funds to add to a wallet to bring it up to the minimum spending balance.
 * @param minSpendingBalance The minimum spending balance for the wallet
 * @param currentSpendingBalance The current spending balance for the wallet
 * @param minFundingIncrement The minimum amount of funds that can be added to the wallet
 * @returns The amount of funds to add to the wallet or null if the wallet is already above the minimum spending balance
 */
export declare const calculateFundAmount: (minSpendingBalance: number, currentSpendingBalance: number, minFundingIncrement: number) => number | null;
//# sourceMappingURL=util.d.ts.map
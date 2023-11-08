import { AlgoAmount } from './types/amount';
declare global {
    interface Number {
        microAlgos(this: number): AlgoAmount;
        algos(this: number): AlgoAmount;
    }
}
/** Returns an amount of Algos using AlgoAmount
 * @param algos The amount in Algos
 */
export declare const algos: (algos: number) => AlgoAmount;
/** Returns an amount of µAlgos using AlgoAmount
 * @param microAlgos The amount in µAlgos
 */
export declare const microAlgos: (microAlgos: number) => AlgoAmount;
/** Returns an amount of µAlgos to cover standard fees for the given number of transactions using AlgoAmount
 * @param numberOfTransactions The of standard transaction fees to return the amount of ALGOs
 */
export declare const transactionFees: (numberOfTransactions: number) => AlgoAmount;
//# sourceMappingURL=amount.d.ts.map
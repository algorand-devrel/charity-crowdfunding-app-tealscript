/** Wrapper class to ensure safe, explicit conversion between µAlgos, Algos and numbers */
export declare class AlgoAmount {
    private amountInMicroAlgos;
    /** Return the amount as a number in µAlgos */
    get microAlgos(): number;
    /** Return the amount as a number in Algos */
    get algos(): number;
    constructor(amount: {
        algos: number;
    } | {
        microAlgos: number;
    });
    toString(): string;
    /** valueOf allows you to use `AlgoAmount` in comparison operations such as `<` and `>=` etc.,
     * but it's not recommended to use this to convert to a number, it's much safer to explicitly call
     * the algos or microAlgos properties
     */
    valueOf(): number;
    /** Create a `AlgoAmount` object representing the given number of Algos */
    static Algos(amount: number): AlgoAmount;
    /** Create a `AlgoAmount` object representing the given number of µAlgos */
    static MicroAlgos(amount: number): AlgoAmount;
}
//# sourceMappingURL=amount.d.ts.map
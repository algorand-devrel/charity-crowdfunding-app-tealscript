import algosdk from 'algosdk';
/**
 * The account name identifier used for fund dispensing in test environments
 */
export const DISPENSER_ACCOUNT = 'DISPENSER';
/** Account wrapper that supports partial or full multisig signing. */
export class MultisigAccount {
    _params;
    _signingAccounts;
    _addr;
    _signer;
    /** The parameters for the multisig account */
    get params() {
        return this._params;
    }
    /** The list of accounts that are present to sign */
    get signingAccounts() {
        return this._signingAccounts;
    }
    /** The address of the multisig account */
    get addr() {
        return this._addr;
    }
    get signer() {
        return this._signer;
    }
    constructor(multisigParams, signingAccounts) {
        this._params = multisigParams;
        this._signingAccounts = signingAccounts;
        this._addr = algosdk.multisigAddress(multisigParams);
        this._signer = algosdk.makeMultiSigAccountTransactionSigner(multisigParams, signingAccounts.map((a) => a.sk));
    }
    /**
     * Sign the given transaction
     * @param transaction Either a transaction object or a raw, partially signed transaction
     * @returns The transaction signed by the present signers
     */
    sign(transaction) {
        let signedTxn = 'from' in transaction ? undefined : transaction;
        for (const signer of this._signingAccounts) {
            if (signedTxn) {
                signedTxn = algosdk.appendSignMultisigTransaction(signedTxn, this._params, signer.sk).blob;
            }
            else {
                signedTxn = algosdk.signMultisigTransaction(transaction, this._params, signer.sk).blob;
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return signedTxn;
    }
}
/** Account wrapper that supports a rekeyed account */
export class SigningAccount {
    _account;
    _signer;
    _sender;
    /**
     * Algorand address of the sender
     */
    get addr() {
        return this._sender;
    }
    /**
     * Secret key belonging to the signer
     */
    get sk() {
        return this._account.sk;
    }
    /**
     * Transaction signer for the underlying signing account
     */
    get signer() {
        return this._signer;
    }
    /**
     * Algorand account of the sender address and signer private key
     */
    get sender() {
        return {
            addr: this._sender,
            sk: this._account.sk,
        };
    }
    constructor(account, sender) {
        this._account = account;
        this._sender = sender ?? account.addr;
        this._signer = algosdk.makeBasicAccountTransactionSigner(account);
    }
}
//# sourceMappingURL=account.js.map
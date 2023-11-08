/** Defines the what additional actions occur with the transaction https://developer.algorand.org/docs/rest-apis/indexer/#oncompletion */
export var ApplicationOnComplete;
(function (ApplicationOnComplete) {
    ApplicationOnComplete["noop"] = "noop";
    ApplicationOnComplete["optin"] = "optin";
    ApplicationOnComplete["closeout"] = "closeout";
    ApplicationOnComplete["clear"] = "clear";
    ApplicationOnComplete["update"] = "update";
    ApplicationOnComplete["delete"] = "delete";
})(ApplicationOnComplete || (ApplicationOnComplete = {}));
/** Type of signature used by an account */
export var SignatureType;
(function (SignatureType) {
    /** Normal signature */
    SignatureType["sig"] = "sig";
    /** Multisig */
    SignatureType["msig"] = "msig";
    /** Logic signature */
    SignatureType["lsig"] = "lsig";
})(SignatureType || (SignatureType = {}));
/** Delegation status of the account */
export var AccountStatus;
(function (AccountStatus) {
    /** Indicates that the associated account is delegated */
    AccountStatus["Offline"] = "Offline";
    /** Indicates that the associated account used as part of the delegation pool */
    AccountStatus["Online"] = "Online";
    /** Indicates that the associated account is neither a delegator nor a delegate */
    AccountStatus["NotParticipating"] = "NotParticipating";
})(AccountStatus || (AccountStatus = {}));
//# sourceMappingURL=indexer.js.map
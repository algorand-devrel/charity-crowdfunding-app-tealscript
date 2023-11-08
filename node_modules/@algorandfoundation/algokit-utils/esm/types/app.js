/** The name of the TEAL template variable for deploy-time immutability control */
export const UPDATABLE_TEMPLATE_NAME = 'TMPL_UPDATABLE';
/** The name of the TEAL template variable for deploy-time permanence control */
export const DELETABLE_TEMPLATE_NAME = 'TMPL_DELETABLE';
/** The app create/update ARC-2 transaction note prefix */
export const APP_DEPLOY_NOTE_DAPP = 'ALGOKIT_DEPLOYER';
/** The maximum number of bytes in a single app code page */
export const APP_PAGE_MAX_SIZE = 2048;
/** First 4 bytes of SHA-512/256 hash of "return" for retrieving ABI return values */
export const ABI_RETURN_PREFIX = new Uint8Array([21, 31, 124, 117]);
/** What action to perform when deploying an app and an update is detected in the TEAL code */
export var OnUpdate;
(function (OnUpdate) {
    /** Fail the deployment */
    OnUpdate[OnUpdate["Fail"] = 0] = "Fail";
    /** Update the app */
    OnUpdate[OnUpdate["UpdateApp"] = 1] = "UpdateApp";
    /** Delete the app and create a new one in its place */
    OnUpdate[OnUpdate["ReplaceApp"] = 2] = "ReplaceApp";
    /** Create a new app */
    OnUpdate[OnUpdate["AppendApp"] = 3] = "AppendApp";
})(OnUpdate || (OnUpdate = {}));
/** What action to perform when deploying an app and a breaking schema change is detected */
export var OnSchemaBreak;
(function (OnSchemaBreak) {
    /** Fail the deployment */
    OnSchemaBreak[OnSchemaBreak["Fail"] = 0] = "Fail";
    /** Delete the app and create a new one in its place */
    OnSchemaBreak[OnSchemaBreak["ReplaceApp"] = 1] = "ReplaceApp";
    /** Create a new app */
    OnSchemaBreak[OnSchemaBreak["AppendApp"] = 2] = "AppendApp";
})(OnSchemaBreak || (OnSchemaBreak = {}));
//# sourceMappingURL=app.js.map
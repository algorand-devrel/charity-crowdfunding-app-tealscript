/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
/** A logger implementation that writes to console */
export const consoleLogger = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    verbose: console.trace,
    debug: console.debug,
};
/** A logger implementation that does nothing */
export const nullLogger = {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    error: function (message, ...optionalParams) { },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    warn: function (message, ...optionalParams) { },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    info: function (message, ...optionalParams) { },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    verbose: function (message, ...optionalParams) { },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    debug: function (message, ...optionalParams) { },
};
//# sourceMappingURL=logging.js.map
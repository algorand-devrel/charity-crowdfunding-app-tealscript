/** General purpose logger type, compatible with Winston and others. */
export type Logger = {
    error(message: string, ...optionalParams: unknown[]): void;
    warn(message: string, ...optionalParams: unknown[]): void;
    info(message: string, ...optionalParams: unknown[]): void;
    verbose(message: string, ...optionalParams: unknown[]): void;
    debug(message: string, ...optionalParams: unknown[]): void;
};
/** A logger implementation that writes to console */
export declare const consoleLogger: Logger;
/** A logger implementation that does nothing */
export declare const nullLogger: Logger;
//# sourceMappingURL=logging.d.ts.map
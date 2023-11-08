import type { BaseHTTPClientResponse, Query } from 'algosdk/dist/types/client/baseHTTPClient';
import { URLTokenBaseHTTPClient } from './urlTokenBaseHTTPClient';
/** A HTTP Client that wraps the Algorand SDK HTTP Client with retries */
export declare class AlgoHttpClientWithRetry extends URLTokenBaseHTTPClient {
    private static readonly MAX_TRIES;
    private static readonly MAX_BACKOFF_MS;
    private static readonly RETRY_STATUS_CODES;
    private static readonly RETRY_ERROR_CODES;
    private callWithRetry;
    get(relativePath: string, query?: Query<string>, requestHeaders?: Record<string, string>): Promise<BaseHTTPClientResponse>;
    post(relativePath: string, data: Uint8Array, query?: Query<string>, requestHeaders?: Record<string, string>): Promise<BaseHTTPClientResponse>;
    delete(relativePath: string, data: Uint8Array, query?: Query<string>, requestHeaders?: Record<string, string>): Promise<BaseHTTPClientResponse>;
}
//# sourceMappingURL=algo-http-client-with-retry.d.ts.map
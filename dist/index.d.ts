export interface CaptureConfig {
    accessToken: string;
    portalId: string;
    blockGenericEmails?: boolean;
}
export interface CaptureInput {
    email: string;
    formType: string;
    source?: string;
    properties?: Record<string, string>;
}
export interface CaptureResult {
    contactId: string;
    isNew: boolean;
    email: string;
    domain: string;
}
export declare class GenericEmailError extends Error {
    readonly domain: string;
    constructor(domain: string);
}
export declare class HubSpotApiError extends Error {
    readonly status: number;
    readonly body: unknown;
    constructor(status: number, body: unknown);
}
export declare function isGenericEmail(email: string): boolean;
export declare function extractDomain(email: string): string;
export declare function captureContact(input: CaptureInput, config: CaptureConfig): Promise<CaptureResult>;
export declare function createClient(config: CaptureConfig): {
    capture: (input: CaptureInput) => Promise<CaptureResult>;
    isGenericEmail: typeof isGenericEmail;
    extractDomain: typeof extractDomain;
};

/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Plugin = {
    id: string;
    name: string;
    version: string;
    description?: string;
    main: string;
    route?: string;
    license: string;
    coreAPI: string;
    activationEvents: Array<'onStartupFinished' | 'onAdminOpen' | 'onAdminClose' | 'onTicketReceived'>;
    contributes: {
        actions?: Array<Record<string, any>>;
        routes?: Array<Record<string, any>>;
        transforms?: Array<Record<string, any>>;
        shortcuts?: Array<Record<string, any>>;
        adminPanels?: Array<{
            id: string;
            title: string;
            requiredDomains?: Array<string>;
            requiredScopes?: Array<string>;
            latency?: string;
            route?: string;
        }>;
    };
    additionalProperties?: any;
};


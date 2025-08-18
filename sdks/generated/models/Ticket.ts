/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Ticket = {
    orderId: number | string;
    orderNumber: number | string;
    orderType?: string;
    specialInstructions?: string;
    allergy?: boolean;
    createdTs: number;
    items: Array<{
        itemId?: number | string;
        name: string;
        quantity: number;
        stationId?: number | string | null;
        modifiers?: Array<string>;
        specialInstructions?: string;
        allergy?: boolean;
    }>;
};


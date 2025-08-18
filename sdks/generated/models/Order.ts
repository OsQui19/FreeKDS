/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Order = {
    order_number?: string | number;
    order_type?: string;
    special_instructions?: string;
    allergy?: boolean;
    items: Array<{
        menu_item_id: number | string;
        quantity: number;
        special_instructions?: string;
        allergy?: boolean;
        modifier_ids?: Array<number | string>;
    }>;
};


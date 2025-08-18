/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Event } from '../models/Event';
import type { Order } from '../models/Order';
import type { Plugin } from '../models/Plugin';
import type { Station } from '../models/Station';
import type { Theme } from '../models/Theme';
import type { Ticket } from '../models/Ticket';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DefaultService {
    /**
     * List orders
     * @returns Order List of orders
     * @throws ApiError
     */
    public static getOrders(): CancelablePromise<Array<Order>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/orders',
        });
    }
    /**
     * Create an order
     * @returns Order Created order
     * @throws ApiError
     */
    public static postOrders({
        requestBody,
    }: {
        requestBody: Order,
    }): CancelablePromise<Order> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/orders',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * List tickets
     * @returns Ticket List of tickets
     * @throws ApiError
     */
    public static getTickets(): CancelablePromise<Array<Ticket>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tickets',
        });
    }
    /**
     * Create a ticket
     * @returns Ticket Created ticket
     * @throws ApiError
     */
    public static postTickets({
        requestBody,
    }: {
        requestBody: Ticket,
    }): CancelablePromise<Ticket> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tickets',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * List stations
     * @returns Station List of stations
     * @throws ApiError
     */
    public static getStations(): CancelablePromise<Array<Station>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/stations',
        });
    }
    /**
     * Create a station
     * @returns Station Created station
     * @throws ApiError
     */
    public static postStations({
        requestBody,
    }: {
        requestBody: Station,
    }): CancelablePromise<Station> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/stations',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * List themes
     * @returns Theme List of themes
     * @throws ApiError
     */
    public static getThemes(): CancelablePromise<Array<Theme>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/themes',
        });
    }
    /**
     * Create a theme
     * @returns Theme Created theme
     * @throws ApiError
     */
    public static postThemes({
        requestBody,
    }: {
        requestBody: Theme,
    }): CancelablePromise<Theme> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/themes',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * List plugins
     * @returns Plugin List of plugins
     * @throws ApiError
     */
    public static getPlugins(): CancelablePromise<Array<Plugin>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/plugins',
        });
    }
    /**
     * Register a plugin
     * @returns Plugin Registered plugin
     * @throws ApiError
     */
    public static postPlugins({
        requestBody,
    }: {
        requestBody: Plugin,
    }): CancelablePromise<Plugin> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/plugins',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Stream or list events
     * @returns Event Event stream
     * @throws ApiError
     */
    public static getEvents(): CancelablePromise<Array<Event>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/events',
        });
    }
    /**
     * Publish an event
     * @returns any Accepted event
     * @throws ApiError
     */
    public static postEvents({
        requestBody,
    }: {
        requestBody: Event,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/events',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}

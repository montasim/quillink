import { NextRequest } from 'next/server';
import httpStatusLite from 'http-status-lite';
import asyncError from '@/lib/asyncError';
import sendResponse from '@/utils/sendResponse';
import MESSAGES from '@/constants/messages';
import dataService from '@/lib/databaseOperation';
import { ShortKeySchema } from '@/schemas/schemas';
import validateParams from '@/lib/validateParams';
import { urlSelection } from '@/app/api/v1/urls/selection';

const { URL_DELETION, SINGLE_URL_DETAILS } = MESSAGES;
const { shortUrlModel } = dataService;

const deleteShortUrlById = async (
    request: NextRequest,
    context: { params: Promise<{ shortKey: string }> }
) => {
    const resolvedParams = await context.params;
    const validation = validateParams(ShortKeySchema, resolvedParams);
    if (!validation.success) return validation.response;

    const shortKey = validation.data.shortKey;

    // Attempt to find the URL record before attempting deletion
    const shortUrlRecord = await shortUrlModel.findUnique({
        // Renamed from url
        where: { shortKey },
    });

    // If no record is found, return a 404 response
    if (!shortUrlRecord) {
        return sendResponse(httpStatusLite.NOT_FOUND, URL_DELETION.NOT_FOUND);
    }

    // Delete the short URL record from the database
    await shortUrlModel.deleteData({
        where: { shortKey },
    });

    // Return a success response
    return sendResponse(httpStatusLite.OK, URL_DELETION.SUCCESS);
};

const getShortUrlDetailsById = async (
    request: NextRequest,
    context: { params: Promise<{ shortKey: string }> }
) => {
    const resolvedParams = await context.params;
    const validation = validateParams(ShortKeySchema, resolvedParams);
    if (!validation.success) return validation.response;

    const shortKey = validation.data.shortKey;

    // Find the short URL record, including its click logs
    const shortUrlRecord = await shortUrlModel.findUnique({
        where: { shortKey },
        select: urlSelection,
    });

    // If no record is found, return a 404 response
    if (!shortUrlRecord) {
        return sendResponse(
            httpStatusLite.NOT_FOUND,
            SINGLE_URL_DETAILS.NOT_FOUND
        );
    }

    // Check if the URL has expired
    if (shortUrlRecord.expiresAt && new Date() > shortUrlRecord.expiresAt) {
        return sendResponse(httpStatusLite.GONE, SINGLE_URL_DETAILS.EXPIRED);
    }

    // Return a success response with the URL details
    return sendResponse(
        httpStatusLite.OK,
        SINGLE_URL_DETAILS.SUCCESS,
        shortUrlRecord
    );
};

export const DELETE = asyncError(deleteShortUrlById);
export const GET = asyncError(getShortUrlDetailsById);

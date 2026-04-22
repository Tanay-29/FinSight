/**
 * api.ts — Backend URL config for all Flask API calls
 */
export const BACKEND_URL: string =
    (process.env.EXPO_PUBLIC_BACKEND_URL as string) || 'http://127.0.0.1:5000';

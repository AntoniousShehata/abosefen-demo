import { createApi } from './createApi.js';

export { ApiError, createApi, memoryStorage, STORAGE_KEY } from './createApi.js';

// One API for the whole app. Tests answer at once; the browser waits 150–450 ms, like a real network.
const isTest = import.meta.env?.MODE === 'test';

export const api = createApi({ latency: isTest ? [0, 0] : [150, 450] });

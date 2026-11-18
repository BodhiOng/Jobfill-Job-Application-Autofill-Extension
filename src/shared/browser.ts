type BrowserApi = typeof browser;
export const extensionBrowser = ((globalThis as typeof globalThis & { browser?: BrowserApi; chrome?: BrowserApi }).browser ?? (globalThis as typeof globalThis & { chrome?: BrowserApi }).chrome) as BrowserApi;

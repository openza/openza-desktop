import { app, ipcMain, safeStorage } from 'electron';
import path from 'path';
import fs from 'fs';

// Secure storage utilities with enhanced error handling
const getStoragePath = () => {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'secure-storage.json');
};

const loadSecureStorage = () => {
    try {
        const storagePath = getStoragePath();
        if (!fs.existsSync(storagePath)) {
            return new Map();
        }
        
        const data = fs.readFileSync(storagePath, 'utf-8');
        const parsed = JSON.parse(data);
        
        // Convert base64 strings back to Buffers with validation
        const storageMap = new Map();
        for (const [key, value] of Object.entries(parsed)) {
            if (typeof value === 'string') {
                try {
                    // Validate base64 format before decoding
                    if (/^[A-Za-z0-9+/=]+$/.test(value)) {
                        const buffer = Buffer.from(value, 'base64');
                        storageMap.set(key, buffer);
                    } else {
                        // Invalid base64, treat as corrupted data
                        console.warn(`Corrupted storage entry found: ${key}`);
                    }
                } catch (e) {
                    console.warn(`Failed to decode storage entry: ${key}`, e.message);
                }
            } else {
                storageMap.set(key, value);
            }
        }
        
        return storageMap;
    } catch (error) {
        console.error('Failed to load secure storage:', error);
        return new Map();
    }
};

const saveSecureStorage = (storageMap) => {
    try {
        const storagePath = getStoragePath();
        const userDataPath = path.dirname(storagePath);
        
        // Ensure userData directory exists
        if (!fs.existsSync(userDataPath)) {
            fs.mkdirSync(userDataPath, { recursive: true });
        }
        
        // Convert Buffer values to base64 strings for JSON storage
        const serializable = {};
        for (const [key, value] of storageMap.entries()) {
            if (Buffer.isBuffer(value)) {
                serializable[key] = value.toString('base64');
            } else {
                serializable[key] = value;
            }
        }
        
        const data = JSON.stringify(serializable);
        fs.writeFileSync(storagePath, data, 'utf-8');
        return true;
    } catch (error) {
        console.error('Failed to save secure storage:', error);
        return false;
    }
};

// Initialize secure storage
let secureStore = null;

// Setup secure storage IPC handlers with enhanced validation
export const setupStorageHandlers = () => {
    // Check if secure storage is available
    ipcMain.handle('secure-storage-available', () => {
        return safeStorage.isEncryptionAvailable();
    });

    // Set secure storage value with validation
    ipcMain.handle('secure-storage-set', async (event, key, value) => {
        try {
            // Validate inputs
            if (!key || typeof key !== 'string') {
                throw new Error('Invalid key: must be a non-empty string');
            }
            
            if (!value || typeof value !== 'string') {
                throw new Error('Invalid value: must be a non-empty string');
            }
            
            if (!safeStorage.isEncryptionAvailable()) {
                throw new Error('Secure storage not available');
            }
            
            // Initialize storage if needed
            if (!secureStore) {
                secureStore = loadSecureStorage();
            }
            
            const encrypted = safeStorage.encryptString(value);
            secureStore.set(key, encrypted);
            
            // Persist to disk
            const saved = saveSecureStorage(secureStore);
            if (!saved) {
                throw new Error('Failed to persist storage');
            }
            
            return { success: true };
        } catch (error) {
            console.error('Secure storage set error:', error);
            return { success: false, error: error.message };
        }
    });

    // Get secure storage value with validation
    ipcMain.handle('secure-storage-get', async (event, key) => {
        try {
            // Validate input
            if (!key || typeof key !== 'string') {
                throw new Error('Invalid key: must be a non-empty string');
            }
            
            if (!safeStorage.isEncryptionAvailable()) {
                throw new Error('Secure storage not available');
            }
            
            // Initialize storage if needed
            if (!secureStore) {
                secureStore = loadSecureStorage();
            }
            
            const encrypted = secureStore.get(key);
            if (!encrypted) {
                return { success: true, value: null };
            }
            
            // Ensure we have a valid Buffer for decryption
            let buffer;
            if (Buffer.isBuffer(encrypted)) {
                buffer = encrypted;
            } else if (typeof encrypted === 'string') {
                try {
                    // Validate base64 format
                    if (!/^[A-Za-z0-9+/=]+$/.test(encrypted)) {
                        throw new Error('Invalid base64 format');
                    }
                    buffer = Buffer.from(encrypted, 'base64');
                } catch (e) {
                    console.warn('Invalid base64 data, clearing corrupted entry:', key);
                    secureStore.delete(key);
                    saveSecureStorage(secureStore);
                    return { success: true, value: null };
                }
            } else {
                console.warn('Invalid storage format, clearing corrupted entry:', key);
                secureStore.delete(key);
                saveSecureStorage(secureStore);
                return { success: true, value: null };
            }
            
            const decrypted = safeStorage.decryptString(buffer);
            return { success: true, value: decrypted };
        } catch (error) {
            console.error('Secure storage get error:', error);
            // If decryption fails, clear corrupted data
            if (secureStore && secureStore.has(key)) {
                console.warn('Clearing corrupted storage entry:', key);
                secureStore.delete(key);
                saveSecureStorage(secureStore);
            }
            return { success: false, error: error.message };
        }
    });

    // Delete secure storage value with validation
    ipcMain.handle('secure-storage-delete', async (event, key) => {
        try {
            // Validate input
            if (!key || typeof key !== 'string') {
                throw new Error('Invalid key: must be a non-empty string');
            }
            
            // Initialize storage if needed
            if (!secureStore) {
                secureStore = loadSecureStorage();
            }
            
            secureStore.delete(key);
            
            // Persist to disk
            const saved = saveSecureStorage(secureStore);
            if (!saved) {
                throw new Error('Failed to persist storage after deletion');
            }
            
            return { success: true };
        } catch (error) {
            console.error('Secure storage delete error:', error);
            return { success: false, error: error.message };
        }
    });

    // Secure config handlers - keep sensitive data in main process
    ipcMain.handle('config-get-oauth-config', async (_event, provider) => {
        try {
            // Get config from environment variables in main process
            const config = {
                todoist: {
                    clientId: process.env.VITE_TODOIST_CLIENT_ID,
                    clientSecret: process.env.VITE_TODOIST_CLIENT_SECRET,
                    redirectUri: process.env.VITE_REDIRECT_URI,
                },
                msToDo: {
                    clientId: process.env.VITE_MSTODO_CLIENT_ID,
                    clientSecret: process.env.VITE_MSTODO_CLIENT_SECRET,
                    redirectUri: process.env.VITE_MSTODO_REDIRECT_URI,
                    tenantId: process.env.VITE_MSTODO_TENANT_ID || 'common',
                    protocolScheme: process.env.VITE_OAUTH_PROTOCOL_SCHEME || 'openza',
                    timeoutMinutes: parseInt(process.env.VITE_OAUTH_TIMEOUT_MINUTES || '3', 10),
                }
            };

            if (!config[provider]) {
                throw new Error(`Unknown provider: ${provider}`);
            }

            // Only return what's needed for renderer process (no secrets)
            const { clientSecret, ...safeConfig } = config[provider];
            return { success: true, config: safeConfig };
        } catch (error) {
            console.error('Failed to get OAuth config:', error);
            return { success: false, error: error.message };
        }
    });

    // Secure token exchange - keep secrets in main process
    ipcMain.handle('oauth-exchange-code', async (_event, provider, code, codeVerifier) => {
        try {
            const config = {
                todoist: {
                    clientId: process.env.VITE_TODOIST_CLIENT_ID,
                    clientSecret: process.env.VITE_TODOIST_CLIENT_SECRET,
                    redirectUri: process.env.VITE_REDIRECT_URI,
                },
                msToDo: {
                    clientId: process.env.VITE_MSTODO_CLIENT_ID,
                    clientSecret: process.env.VITE_MSTODO_CLIENT_SECRET,
                    redirectUri: process.env.VITE_MSTODO_REDIRECT_URI,
                    tenantId: process.env.VITE_MSTODO_TENANT_ID || 'common',
                }
            };

            if (!config[provider]) {
                throw new Error(`Unknown provider: ${provider}`);
            }

            const providerConfig = config[provider];

            if (provider === 'msToDo') {
                // Microsoft Graph token exchange for public client (desktop app)
                const tokenUrl = `https://login.microsoftonline.com/${providerConfig.tenantId}/oauth2/v2.0/token`;
                const params = new URLSearchParams({
                    client_id: providerConfig.clientId,
                    // Don't send client_secret for public clients (desktop apps)
                    code: code,
                    redirect_uri: providerConfig.redirectUri,
                    grant_type: 'authorization_code',
                    code_verifier: codeVerifier
                });

                const response = await fetch(tokenUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: params
                });

                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(`Token exchange failed: ${response.status} ${errorData}`);
                }

                const tokenData = await response.json();
                return { success: true, tokenData };
            } else if (provider === 'todoist') {
                // Todoist token exchange
                const tokenUrl = 'https://todoist.com/oauth/access_token';
                const params = new URLSearchParams({
                    client_id: providerConfig.clientId,
                    client_secret: providerConfig.clientSecret,
                    code: code,
                    redirect_uri: providerConfig.redirectUri
                });

                const response = await fetch(tokenUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: params
                });

                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(`Token exchange failed: ${response.status} ${errorData}`);
                }

                const tokenData = await response.json();
                return { success: true, tokenData };
            }

            throw new Error(`Unsupported provider: ${provider}`);
        } catch (error) {
            console.error('OAuth code exchange failed:', error);
            return { success: false, error: error.message };
        }
    });

    // Secure token refresh - keep secrets in main process
    ipcMain.handle('oauth-refresh-token', async (_event, provider, refreshToken) => {
        try {
            const config = {
                todoist: {
                    clientId: process.env.VITE_TODOIST_CLIENT_ID,
                    clientSecret: process.env.VITE_TODOIST_CLIENT_SECRET,
                    redirectUri: process.env.VITE_REDIRECT_URI,
                },
                msToDo: {
                    clientId: process.env.VITE_MSTODO_CLIENT_ID,
                    clientSecret: process.env.VITE_MSTODO_CLIENT_SECRET,
                    redirectUri: process.env.VITE_MSTODO_REDIRECT_URI,
                    tenantId: process.env.VITE_MSTODO_TENANT_ID || 'common',
                }
            };

            if (!config[provider]) {
                throw new Error(`Unknown provider: ${provider}`);
            }

            const providerConfig = config[provider];

            if (provider === 'msToDo') {
                // Microsoft Graph token refresh for public client (desktop app)
                const tokenUrl = `https://login.microsoftonline.com/${providerConfig.tenantId}/oauth2/v2.0/token`;
                const params = new URLSearchParams({
                    client_id: providerConfig.clientId,
                    // Don't send client_secret for public clients (desktop apps)
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token',
                    scope: 'https://graph.microsoft.com/MailboxSettings.Read https://graph.microsoft.com/offline_access https://graph.microsoft.com/Tasks.Read https://graph.microsoft.com/Tasks.ReadWrite https://graph.microsoft.com/User.Read'
                });

                const response = await fetch(tokenUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: params
                });

                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(`Token refresh failed: ${response.status} ${errorData}`);
                }

                const tokenData = await response.json();
                return { success: true, tokenData };
            } else if (provider === 'todoist') {
                // Todoist doesn't have refresh tokens, return error
                throw new Error('Todoist does not support refresh tokens');
            }

            throw new Error(`Unsupported provider: ${provider}`);
        } catch (error) {
            console.error('OAuth token refresh failed:', error);
            return { success: false, error: error.message };
        }
    });
};
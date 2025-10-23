import { app } from 'electron';
import path from 'path';
import fs from 'fs';

// Secure protocol registration with user consent and validation
export const registerCustomProtocol = () => {
    // Microsoft recommends using msal{ClientId} format for Electron apps
    const clientId = process.env.VITE_MSTODO_CLIENT_ID;
    const protocol = clientId ? `msal${clientId}` : 'openza';
    
    // Only register protocol in production with explicit opt-in
    if (process.env.NODE_ENV === 'production') {
        // Check if user has previously consented to protocol registration
        const userDataPath = app.getPath('userData');
        const consentFile = path.join(userDataPath, 'protocol-consent.json');
        
        let hasConsent = false;
        try {
            if (fs.existsSync(consentFile)) {
                const consent = JSON.parse(fs.readFileSync(consentFile, 'utf-8'));
                hasConsent = consent.protocolRegistration === true;
            }
        } catch (error) {
            console.warn('Failed to read protocol consent:', error.message);
        }
        
        if (!hasConsent) {
            console.log('Protocol registration requires user consent. Skipping automatic registration.');
            return false;
        }
        
        console.log('Registering protocol for production with user consent:', protocol);
        const success = app.setAsDefaultProtocolClient(protocol);
        console.log('Production protocol registration result:', success);
        return success;
    } else {
        // In development, only register for the current session without persistence
        console.log('Development mode: Registering protocol for current session only');
        const success = app.setAsDefaultProtocolClient(protocol);
        console.log('Development protocol registration result:', success);
        return success;
    }
};

// Function to request user consent for protocol registration
export const requestProtocolConsent = async () => {
    const userDataPath = app.getPath('userData');
    const consentFile = path.join(userDataPath, 'protocol-consent.json');
    
    try {
        // Ensure directory exists
        if (!fs.existsSync(userDataPath)) {
            fs.mkdirSync(userDataPath, { recursive: true });
        }
        
        // Store user consent
        const consent = {
            protocolRegistration: true,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
        
        fs.writeFileSync(consentFile, JSON.stringify(consent, null, 2));
        console.log('User consent granted for protocol registration');
        
        // Now register the protocol
        return registerCustomProtocol();
    } catch (error) {
        console.error('Failed to store protocol consent:', error);
        return false;
    }
};

// Validate OAuth callback URLs for security
export const validateOAuthCallback = (url) => {
    try {
        const parsedUrl = new URL(url);
        const clientId = process.env.VITE_MSTODO_CLIENT_ID;
        
        // Validate protocol - support both MSAL format and legacy openza format
        const expectedMsalProtocol = clientId ? `msal${clientId}:` : null;
        const validProtocols = [expectedMsalProtocol, 'openza:'].filter(Boolean);
        
        if (!validProtocols.includes(parsedUrl.protocol)) {
            throw new Error(`Invalid protocol: ${parsedUrl.protocol}. Expected: ${validProtocols.join(' or ')}`);
        }
        
        // Validate structure for OAuth callbacks
        // MSAL format: msal{clientId}://auth or openza://auth (Microsoft recommended pattern)
        // Microsoft adds query parameters like: openza://auth/?code=...&state=...
        if (parsedUrl.hostname === 'auth') {
            // Allow any path for auth hostname (Microsoft might add / or query params)
            return true;
        }
        
        throw new Error(`Invalid OAuth callback structure: ${url}`);
    } catch (error) {
        console.error('OAuth callback validation failed:', error.message);
        return false;
    }
};

// Handle protocol URLs with validation
export const handleProtocolUrl = (url, handleOAuthCallback) => {
    console.log('Protocol URL received:', url);
    
    // Validate the URL before processing
    if (!validateOAuthCallback(url)) {
        console.warn('Rejected invalid protocol URL:', url);
        return false;
    }
    
    // Handle OAuth callback URLs - support both MSAL and custom protocol formats
    const clientId = process.env.VITE_MSTODO_CLIENT_ID;
    const msalProtocolPrefix = clientId ? `msal${clientId}://auth` : null;
    
    if ((msalProtocolPrefix && url.startsWith(msalProtocolPrefix)) || 
        url.startsWith('openza://auth')) {  // Simplified format: openza://auth (not openza://auth/)
        handleOAuthCallback(url);
        return true;
    }
    
    console.warn('Unhandled protocol URL:', url);
    return false;
};
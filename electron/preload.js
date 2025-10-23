const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, func) =>
      ipcRenderer.on(channel, (event, ...args) => func(...args)),
    
    // Secure storage methods
    secureStorage: {
        set: (key, value) => ipcRenderer.invoke('secure-storage-set', key, value),
        get: (key) => ipcRenderer.invoke('secure-storage-get', key),
        delete: (key) => ipcRenderer.invoke('secure-storage-delete', key),
        isAvailable: () => ipcRenderer.invoke('secure-storage-available'),
    },

    // Shell API for secure external URL opening
    shell: {
        openExternal: (url) => ipcRenderer.invoke('shell-open-external', url),
    },

    // OAuth window management for development
    oauth: {
        openWindow: (oauthUrl) => ipcRenderer.invoke('oauth-window-open', oauthUrl),
    },

    // Secure configuration access
    config: {
        getOAuthConfig: (provider) => ipcRenderer.invoke('config-get-oauth-config', provider),
        exchangeCode: (provider, code, codeVerifier) => ipcRenderer.invoke('oauth-exchange-code', provider, code, codeVerifier),
        refreshToken: (provider, refreshToken) => ipcRenderer.invoke('oauth-refresh-token', provider, refreshToken),
    },

    // MSAL authentication methods
    msal: {
        getAuthCodeUrl: (request) => ipcRenderer.invoke('msal-get-auth-code-url', request),
        acquireTokenByCode: (request) => ipcRenderer.invoke('msal-acquire-token-by-code', request),
        acquireTokenInteractive: (request) => ipcRenderer.invoke('msal-acquire-token-interactive', request),
        acquireTokenSilent: (request) => ipcRenderer.invoke('msal-acquire-token-silent', request),
        getAccount: () => ipcRenderer.invoke('msal-get-account'),
        signOut: () => ipcRenderer.invoke('msal-sign-out'),
        debugCache: () => ipcRenderer.invoke('msal-debug-cache'),
    },

    // Database API
    database: {
        // Task operations
        createTask: (taskData) => ipcRenderer.invoke('db:createTask', taskData),
        getTaskById: (id) => ipcRenderer.invoke('db:getTaskById', id),
        getTasks: (filters) => ipcRenderer.invoke('db:getTasks', filters || {}),
        updateTask: (id, updates) => ipcRenderer.invoke('db:updateTask', id, updates),
        deleteTask: (id) => ipcRenderer.invoke('db:deleteTask', id),

        // Project operations
        createProject: (projectData) => ipcRenderer.invoke('db:createProject', projectData),
        getProjectById: (id) => ipcRenderer.invoke('db:getProjectById', id),
        getProjects: (filters) => ipcRenderer.invoke('db:getProjects', filters || {}),

        // Integration operations
        updateTaskIntegration: (taskId, integration, data) => 
            ipcRenderer.invoke('db:updateTaskIntegration', taskId, integration, data),
        getTasksByIntegration: (integration) => 
            ipcRenderer.invoke('db:getTasksByIntegration', integration),

        // Search operations
        searchTasks: (searchTerm) => ipcRenderer.invoke('db:searchTasks', searchTerm),

        // Statistics
        getTaskStatistics: () => ipcRenderer.invoke('db:getTaskStatistics'),

        // Convenience methods
        getTodayTasks: () => ipcRenderer.invoke('db:getTodayTasks'),
        getOverdueTasks: () => ipcRenderer.invoke('db:getOverdueTasks'),
        getUpcomingTasks: (days) => ipcRenderer.invoke('db:getUpcomingTasks', days),
        getTasksByProject: (projectId) => ipcRenderer.invoke('db:getTasksByProject', projectId),
        getCompletedTasks: (limit) => ipcRenderer.invoke('db:getCompletedTasks', limit),
        getTasksByContext: (context) => ipcRenderer.invoke('db:getTasksByContext', context),
        getHighPriorityTasks: () => ipcRenderer.invoke('db:getHighPriorityTasks'),

        // Bulk operations
        bulkUpdateTasks: (updates) => ipcRenderer.invoke('db:bulkUpdateTasks', updates),
        bulkDeleteTasks: (taskIds) => ipcRenderer.invoke('db:bulkDeleteTasks', taskIds),

        // Maintenance
        vacuum: () => ipcRenderer.invoke('db:vacuum'),
        analyze: () => ipcRenderer.invoke('db:analyze'),
        healthCheck: () => ipcRenderer.invoke('db:healthCheck'),
    },
});
/**
 * AceConnect Configuration
 * 
 * Toggle 'ENV' between 'dev' and 'prod' to switch API endpoints.
 */

const CONFIG = {
    // CHANGE THIS TO 'prod' WHEN YOU ARE READY TO DEPLOY
    ENV: 'dev' as 'dev' | 'prod',

    development: {
        API_URL: 'http://localhost:3000/api',
        SOCKET_URL: 'http://localhost:3000',
    },

    production: {
        // REPLACE THIS with your actual Render URL after deployment
        // Example: 'https://ace-connect-server.onrender.com/api'
        API_URL: 'https://YOUR_BACKEND_URL.onrender.com/api',
        SOCKET_URL: 'https://YOUR_BACKEND_URL.onrender.com',
    }
};

export const getApiUrl = () => {
    return CONFIG.ENV === 'prod' ? CONFIG.production.API_URL : CONFIG.development.API_URL;
};

export const getSocketUrl = () => {
    return CONFIG.ENV === 'prod' ? CONFIG.production.SOCKET_URL : CONFIG.development.SOCKET_URL;
};

export default CONFIG;

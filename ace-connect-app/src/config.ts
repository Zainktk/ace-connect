/**
 * AceConnect Configuration
 * 
 * Toggle 'ENV' between 'dev' and 'prod' to switch API endpoints.
 */

const CONFIG = {
    // CHANGE THIS TO 'prod' WHEN YOU ARE READY TO DEPLOY
    ENV: 'prod' as 'dev' | 'prod',

    development: {
        API_URL: 'http://localhost:3000/api',
        SOCKET_URL: 'http://localhost:3000',
    },

    production: {
        API_URL: 'https://ace-connect.onrender.com/api',
        SOCKET_URL: 'https://ace-connect.onrender.com',
    }
};

export const getApiUrl = () => {
    return CONFIG.ENV === 'prod' ? CONFIG.production.API_URL : CONFIG.development.API_URL;
};

export const getSocketUrl = () => {
    return CONFIG.ENV === 'prod' ? CONFIG.production.SOCKET_URL : CONFIG.development.SOCKET_URL;
};

export default CONFIG;

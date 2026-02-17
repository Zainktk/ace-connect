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
    },

    GOOGLE_MAPS_API_KEY: 'AIzaSyCxYqMAuyWNJsIEBa9Q-8F9MrxKILy2tgk', // Replace if needed
};

// STRIPE - Replace with your real pk_test_... key when ready
export const STRIPE_PUBLISHABLE_KEY = 'pk_test_51T1P9oGFO0HfANVikDYjMCCwwFTlGrtxqRGE7iFoFfJQbxg6TmlAAY0tUiPli3Q47cAr4iD8FgZZ7jbhp2EwEZRo00W55gHDJF';


export const getApiUrl = () => {
    return CONFIG.ENV === 'prod' ? CONFIG.production.API_URL : CONFIG.development.API_URL;
};

export const getSocketUrl = () => {
    return CONFIG.ENV === 'prod' ? CONFIG.production.SOCKET_URL : CONFIG.development.SOCKET_URL;
};

export const reverseGeocode = async (latitude: number, longitude: number): Promise<string | null> => {
    try {
        // Using OpenStreetMap (Nominatim) for free geocoding
        // Zoom 18 = Building/House level
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'AceConnect-Mobile/1.0',
                    'Accept-Language': 'en'
                }
            }
        );

        const data = await response.json();

        if (data && data.display_name) {
            return data.display_name;
        }
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null; // Fallback to coordinates
    }
};

export default CONFIG;

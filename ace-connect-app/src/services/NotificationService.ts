import { PermissionsAndroid, Platform } from 'react-native';

// Only import Firebase on Android
const messaging = Platform.OS === 'android' ? require('@react-native-firebase/messaging').default : null;

class NotificationService {
    // 1. Request Permission
    async requestUserPermission() {
        // iOS: Not supported yet
        if (Platform.OS !== 'android') {
            console.log('Push notifications only supported on Android');
            return false;
        }

        if (Platform.Version >= 33) {
            const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                console.log('Notification permission granted.');
                return true;
            } else {
                console.log('Notification permission denied.');
                return false;
            }
        }

        const authStatus = await messaging().requestPermission();
        const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
            console.log('Authorization status:', authStatus);
            return true;
        }
        return false;
    }

    // 2. Get FCM Token
    async getFCMToken() {
        if (Platform.OS !== 'android' || !messaging) {
            return null;
        }

        try {
            const token = await messaging().getToken();
            console.log('FCM Token:', token);
            return token;
        } catch (error) {
            console.error('Error getting FCM token:', error);
            return null;
        }
    }

    // 3. Setup Listeners
    setupListeners() {
        if (Platform.OS !== 'android' || !messaging) {
            return () => { }; // Return empty unsubscribe function
        }

        // Foreground Message
        const unsubscribe = messaging().onMessage(async remoteMessage => {
            console.log('A new FCM message arrived!', remoteMessage);
            // You can show a local notification (toast/alert) here if needed
        });

        // Background Message Handler is set in index.js usually
        messaging().setBackgroundMessageHandler(async remoteMessage => {
            console.log('Message handled in the background!', remoteMessage);
        });

        return unsubscribe;
    }
}

export default new NotificationService();

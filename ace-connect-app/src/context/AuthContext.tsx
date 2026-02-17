import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import NotificationService from '../services/NotificationService';

interface User {
    id: number;
    email: string;
    name?: string;
    ntrpRating?: number;
    bio?: string;
    location?: string;
    photoUrl?: string;
    karmaRating?: number;
    reviewCount?: number;
    role?: 'player' | 'organizer' | 'admin';
    latitude?: number;
    longitude?: number;
    isOrganizerVerified?: boolean;
    walletBalance?: number;
    stripeOnboardingComplete?: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string, ntrpRating?: number, location?: string, role?: 'player' | 'organizer', latitude?: number, longitude?: number) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Auto-login on app start
    useEffect(() => {
        checkAuthStatus();
    }, []);

    const updateFCMToken = async () => {
        try {
            const hasPermission = await NotificationService.requestUserPermission();
            if (hasPermission) {
                const fcmToken = await NotificationService.getFCMToken();
                if (fcmToken) {
                    await api.put('/users/fcm-token', { token: fcmToken });
                    console.log('FCM Token synced with backend');
                }
            }
            NotificationService.setupListeners();
        } catch (error) {
            console.error('Failed to sync FCM token:', error);
        }
    };

    const checkAuthStatus = async () => {
        try {
            const storedToken = await AsyncStorage.getItem('authToken');
            const storedUser = await AsyncStorage.getItem('user');

            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
                updateFCMToken(); // Auto-update token on app open
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        try {
            const response = await api.post('/auth/login', { email, password });
            const { token: newToken, user: userData } = response.data;

            await AsyncStorage.setItem('authToken', newToken);
            await AsyncStorage.setItem('user', JSON.stringify(userData));

            setToken(newToken);
            setUser(userData);
            updateFCMToken(); // Update token on login
        } catch (error: any) {
            throw error;
        }
    };

    const register = async (
        email: string,
        password: string,
        name: string,
        ntrpRating?: number,
        location?: string,
        role: 'player' | 'organizer' = 'player',
        latitude?: number,
        longitude?: number
    ) => {
        try {
            await api.post('/auth/register', {
                email,
                password,
                name,
                ntrpRating,
                location,
                role,
                latitude,
                longitude
            });
            // Token/User are NOT set here anymore. User must verify OTP first.
        } catch (error: any) {
            throw new Error(error.response?.data?.error || 'Registration failed');
        }
    };
    const logout = async () => {
        try {
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('user');
            setToken(null);
            setUser(null);
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const updateUser = (userData: Partial<User>) => {
        if (user) {
            const updatedUser = { ...user, ...userData };
            setUser(updatedUser);
            AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        }
    };

    return (
        <AuthContext.Provider
            value={{ user, token, loading, login, register, logout, updateUser }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

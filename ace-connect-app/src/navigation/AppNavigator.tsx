import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import MatchmakingScreen from '../screens/MatchmakingScreen';
import EventsScreen from '../screens/EventsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OTPScreen from '../screens/OTPScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="OTP" component={OTPScreen} />
    </Stack.Navigator>
);

const MainTabs = () => (
    <Tab.Navigator
        screenOptions={{
            headerShown: true,
            tabBarActiveTintColor: '#00A86B',
            tabBarInactiveTintColor: '#6c757d',
        }}
    >
        <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
                tabBarLabel: 'Home',
                tabBarIcon: () => null,
            }}
        />
        <Tab.Screen
            name="Matchmaking"
            component={MatchmakingScreen}
            options={{
                tabBarLabel: 'Match',
                tabBarIcon: () => null,
            }}
        />
        <Tab.Screen
            name="Events"
            component={EventsScreen}
            options={{
                tabBarLabel: 'Events',
                tabBarIcon: () => null,
            }}
        />
        <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
                tabBarLabel: 'Profile',
                tabBarIcon: () => null,
            }}
        />
    </Tab.Navigator>
);

// Import matchmaking screens
import CreateMatchRequestScreen from '../screens/CreateMatchRequestScreen';
import MatchRequestDetailScreen from '../screens/MatchRequestDetailScreen';
import InvitationDetailScreen from '../screens/InvitationDetailScreen';
import SafetyScreen from '../screens/SafetyScreen';
import ChatScreen from '../screens/ChatScreen';
import MatchHistoryScreen from '../screens/MatchHistoryScreen';

const MainStack = () => (
    <Stack.Navigator>
        <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
        />
        <Stack.Screen
            name="CreateMatchRequest"
            component={CreateMatchRequestScreen}
            options={{ title: 'Create Request' }}
        />
        <Stack.Screen
            name="MatchRequestDetail"
            component={MatchRequestDetailScreen}
            options={{ title: 'Match Request' }}
        />
        <Stack.Screen
            name="InvitationDetail"
            component={InvitationDetailScreen}
            options={{ title: 'Invitation' }}
        />
        <Stack.Screen
            name="Safety"
            component={SafetyScreen}
            options={{ title: 'Safety Guidelines' }}
        />
        <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={({ route }: any) => ({
                title: route.params?.opponentName ? `Chat with ${route.params.opponentName}` : 'Chat'
            })}
        />
        <Stack.Screen
            name="MatchHistory"
            component={MatchHistoryScreen}
            options={{ title: 'Match History' }}
        />
    </Stack.Navigator>
);

const AppNavigator = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return null; // Or a loading screen
    }

    return (
        <NavigationContainer>
            {user ? <MainStack /> : <AuthStack />}
        </NavigationContainer>
    );
};

export default AppNavigator;

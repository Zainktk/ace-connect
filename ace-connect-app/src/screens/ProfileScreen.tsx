import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    ScrollView,
    Linking,
    AppState,
    AppStateStatus,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { colors, typography, spacing, borderRadius } from '../theme/index';

const ProfileScreen = ({ navigation }: any) => {
    const { user, logout, updateUser } = useAuth();
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState(user?.name || '');
    const [ntrpRating, setNtrpRating] = useState(user?.ntrpRating?.toString() || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [location, setLocation] = useState(user?.location || '');
    const [latitude, setLatitude] = useState(user?.latitude);
    const [longitude, setLongitude] = useState(user?.longitude);
    const [onboardingLoading, setOnboardingLoading] = useState(false);
    const [isStripeComplete, setIsStripeComplete] = useState(user?.stripeOnboardingComplete || false);

    useEffect(() => {
        setName(user?.name || '');
        setNtrpRating(user?.ntrpRating?.toString() || '');
        setBio(user?.bio || '');
        setLocation(user?.location || '');
    }, [user]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const updates: any = {};
            if (name !== user?.name) updates.name = name;
            if (ntrpRating && parseFloat(ntrpRating) !== user?.ntrpRating) {
                updates.ntrpRating = parseFloat(ntrpRating);
            }
            if (bio !== user?.bio) updates.bio = bio;
            if (location !== user?.location) updates.location = location;

            if (Object.keys(updates).length > 0) {
                await api.put('/profile', updates);
                updateUser(updates);
                Alert.alert('Success', 'Profile updated successfully');
            }
            setEditing(false);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleStripeOnboard = async () => {
        setOnboardingLoading(true);
        try {
            const response = await api.post('/payments/onboard');
            const { url } = response.data;
            if (url) {
                await Linking.openURL(url);
            }
        } catch (error: any) {
            console.error('Stripe Onboarding Error:', error.response?.data);
            const errorMsg = error.response?.data?.details || 'Could not start Stripe onboarding. Please try again.';
            Alert.alert('Error', errorMsg);
        } finally {
            setOnboardingLoading(false);
        }
    };

    const checkStripeStatus = async () => {
        try {
            const response = await api.get('/payments/onboard-status');
            if (response.data.complete) {
                setIsStripeComplete(true);
                updateUser({ stripeOnboardingComplete: true });
            }
        } catch (error) {
            console.error('Failed to check Stripe status');
        }
    };

    useEffect(() => {
        if (user?.role === 'organizer' && !isStripeComplete) {
            checkStripeStatus();
        }

        // Check status when app returns from background (browser onboarding)
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active' && user?.role === 'organizer' && !isStripeComplete) {
                checkStripeStatus();
            }
        });

        return () => {
            subscription.remove();
        };
    }, [user?.role, isStripeComplete]);

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: logout },
            ]
        );
    };

    const detectLocation = () => {
        Geolocation.getCurrentPosition(
            (position) => {
                const locString = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
                setLocation(locString);
                Alert.alert('Location Detected', 'Coordinates updated! City name resolution coming soon.');
            },
            (error) => {
                Alert.alert('Error', 'Could not detect location.');
            }
        );
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                </View>
                <Text style={styles.email}>{user?.email}</Text>

                <View style={styles.karmaContainer}>
                    <Text style={styles.karmaStars}>
                        {'⭐'.repeat(Math.round(user?.karmaRating || 5))}
                        <Text style={styles.karmaValue}> {(user?.karmaRating || 5.0).toFixed(1)}</Text>
                    </Text>
                    <Text style={styles.karmaCount}>{user?.reviewCount || 0} reviews</Text>
                </View>

                {user?.role === 'organizer' ? (
                    <View style={{ alignItems: 'center' }}>
                        <View style={[styles.topPlayerBadge, { backgroundColor: '#E0F2FE', borderColor: '#0369A1' }]}>
                            <Text style={[styles.topPlayerText, { color: '#0369A1' }]}>
                                {user?.isOrganizerVerified ? '🛡️ Verified Organizer' : '⏳ Verification Pending'}
                            </Text>
                        </View>
                        <View style={styles.walletCard}>
                            <Text style={styles.walletLabel}>Escrow Wallet</Text>
                            <Text style={styles.walletAmount}>${(user?.walletBalance || 0).toFixed(2)}</Text>
                            <Text style={styles.walletSubtext}>* Funds released 24h after event</Text>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.stripeButton,
                                isStripeComplete && styles.stripeButtonComplete,
                                onboardingLoading && { opacity: 0.7 }
                            ]}
                            onPress={handleStripeOnboard}
                            disabled={onboardingLoading || isStripeComplete}
                        >
                            {onboardingLoading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.stripeButtonText}>
                                        {isStripeComplete ? '💳 Stripe Connected' : '🔗 Connect Stripe for Payouts'}
                                    </Text>
                                    {!isStripeComplete && <Text style={styles.stripeSubtext}>Required to receive real money</Text>}
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                ) : user?.karmaRating && user.karmaRating >= 4.5 && (
                    <View style={styles.topPlayerBadge}>
                        <Text style={styles.topPlayerText}>🏆 Highly Recommended Partner</Text>
                    </View>
                )}
            </View>

            <View style={styles.form}>
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>{user?.role === 'organizer' ? 'Organization Name' : 'Name'}</Text>
                    <TextInput
                        style={[styles.input, !editing && styles.inputDisabled]}
                        value={name}
                        onChangeText={setName}
                        editable={editing}
                    />
                </View>

                {user?.role !== 'organizer' && (
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>NTRP Rating</Text>
                        <TextInput
                            style={[styles.input, !editing && styles.inputDisabled]}
                            value={ntrpRating}
                            onChangeText={setNtrpRating}
                            keyboardType="decimal-pad"
                            editable={editing}
                            placeholder="e.g., 3.5"
                        />
                    </View>
                )}

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>{user?.role === 'organizer' ? 'About Organization' : 'Bio'}</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, !editing && styles.inputDisabled]}
                        value={bio}
                        onChangeText={setBio}
                        multiline
                        numberOfLines={3}
                        editable={editing}
                        placeholder={user?.role === 'organizer' ? "Describe your organization and types of events..." : "Tell us about your tennis journey..."}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Location</Text>
                    <View style={styles.locationInputRow}>
                        <TextInput
                            style={[styles.input, !editing && styles.inputDisabled, { flex: 1 }]}
                            value={location}
                            onChangeText={setLocation}
                            editable={editing}
                            placeholder="City, State"
                        />
                        {editing && (
                            <TouchableOpacity
                                style={styles.detectButton}
                                onPress={() => navigation.navigate('LocationSelect', {
                                    initialLat: latitude,
                                    initialLng: longitude,
                                    onSelect: (data: any) => {
                                        setLocation(data.address);
                                        setLatitude(data.latitude);
                                        setLongitude(data.longitude);
                                    }
                                })}
                            >
                                <Text style={styles.detectButtonText}>🗺️ Map</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {editing ? (
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonSecondary]}
                            onPress={() => {
                                setEditing(false);
                                setName(user?.name || '');
                                setNtrpRating(user?.ntrpRating?.toString() || '');
                                setBio(user?.bio || '');
                                setLocation(user?.location || '');
                            }}
                            disabled={loading}
                        >
                            <Text style={styles.buttonSecondaryText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonPrimary]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.text.light} />
                            ) : (
                                <Text style={styles.buttonPrimaryText}>Save</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.button, styles.buttonPrimary]}
                        onPress={() => setEditing(true)}
                    >
                        <Text style={styles.buttonPrimaryText}>Edit Profile</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.button, styles.buttonDanger]}
                    onPress={handleLogout}
                >
                    <Text style={styles.buttonDangerText}>Logout</Text>
                </TouchableOpacity>

                {!editing && (
                    <TouchableOpacity
                        style={[styles.button, styles.historyButton]}
                        onPress={() => navigation.navigate('MatchHistory')}
                    >
                        <Text style={styles.historyButtonText}>📊 View Match History</Text>
                    </TouchableOpacity>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.secondary,
    },
    header: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        backgroundColor: colors.background.card,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary.green,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    avatarText: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.text.light,
    },
    email: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
    },
    form: {
        padding: spacing.xl,
    },
    inputContainer: {
        marginBottom: spacing.lg,
    },
    label: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    input: {
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    inputDisabled: {
        backgroundColor: colors.background.secondary,
        color: colors.text.secondary,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    button: {
        borderRadius: borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    locationInputRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    detectButton: {
        backgroundColor: colors.primary.green,
        paddingHorizontal: spacing.md,
        justifyContent: 'center',
        borderRadius: borderRadius.md,
    },
    detectButtonText: {
        color: colors.text.light,
        fontSize: typography.fontSize.xs,
        fontWeight: 'bold',
    },
    buttonPrimary: {
        flex: 1,
        backgroundColor: colors.primary.green,
    },
    buttonPrimaryText: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.light,
    },
    buttonSecondary: {
        flex: 1,
        backgroundColor: colors.background.card,
        borderWidth: 1,
        borderColor: colors.border,
    },
    buttonSecondaryText: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
    },
    buttonDanger: {
        backgroundColor: colors.error,
    },
    buttonDangerText: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.light,
    },
    historyButton: {
        backgroundColor: colors.background.card,
        borderWidth: 1,
        borderColor: colors.primary.green,
    },
    historyButtonText: {
        fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.bold,
        color: colors.primary.green,
    },
    karmaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.sm,
        gap: spacing.sm,
    },
    karmaStars: {
        fontSize: 16,
    },
    karmaValue: {
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    karmaCount: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        fontStyle: 'italic',
    },
    topPlayerBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.lg,
        marginTop: spacing.md,
        borderWidth: 1,
        borderColor: '#F59E0B',
    },
    topPlayerText: {
        fontSize: typography.fontSize.xs,
        fontWeight: 'bold',
        color: '#92400E',
    },
    walletCard: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginTop: 15,
        width: '80%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    walletLabel: {
        fontSize: 12,
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    walletAmount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#00A86B',
        marginVertical: 5,
    },
    walletSubtext: {
        fontSize: 10,
        color: '#999',
        fontStyle: 'italic',
    },
    stripeButton: {
        backgroundColor: '#635BFF',
        width: '80%',
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 15,
        alignItems: 'center',
        shadowColor: '#635BFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 3,
    },
    stripeButtonComplete: {
        backgroundColor: '#E0E7FF',
        borderWidth: 1,
        borderColor: '#635BFF',
        shadowOpacity: 0,
        elevation: 0,
    },
    stripeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    stripeSubtext: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 10,
        marginTop: 2,
    },
});

export default ProfileScreen;

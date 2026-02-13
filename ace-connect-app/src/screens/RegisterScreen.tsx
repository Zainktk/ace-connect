import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { colors, typography, spacing, borderRadius } from '../theme/index';

const RegisterScreen = ({ navigation }: any) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [ntrpRating, setNtrpRating] = useState('');
    const [location, setLocation] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();

    const handleRegister = async () => {
        if (!name || !email || !password) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const rating = ntrpRating ? parseFloat(ntrpRating) : undefined;
            const normalizedEmail = email.toLowerCase().trim();
            await register(normalizedEmail, password, name.trim(), rating, location.trim());

            Alert.alert(
                'Verification Required',
                'Please check your email for the verification code.',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.navigate('OTP', { email: normalizedEmail })
                    }
                ]
            );
        } catch (error: any) {
            Alert.alert('Registration Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    const detectLocation = () => {
        Geolocation.getCurrentPosition(
            (position) => {
                // In a real app, we'd reverse geocode here. 
                // For now, we'll store coordinates or a placeholder.
                setLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
                Alert.alert('Location Detected', 'We have found your coordinates. In the future, we will show your city name here!');
            },
            (error) => {
                Alert.alert('Error', 'Could not detect location. Please type it manually.');
                console.error(error);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
    };

    return (
        <LinearGradient
            colors={colors.gradients.primary}
            style={styles.container}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.content}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.title}>Join AceConnect</Text>
                            <Text style={styles.subtitle}>Start your tennis journey</Text>
                        </View>

                        {/* Form */}
                        <View style={styles.form}>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Name *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="John Doe"
                                    placeholderTextColor={colors.text.muted}
                                    value={name}
                                    onChangeText={setName}
                                    editable={!loading}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Location</Text>
                                <View style={styles.locationInputRow}>
                                    <TextInput
                                        style={[styles.input, { flex: 1 }]}
                                        placeholder="City, State"
                                        placeholderTextColor={colors.text.muted}
                                        value={location}
                                        onChangeText={setLocation}
                                        editable={!loading}
                                    />
                                    <TouchableOpacity
                                        style={styles.detectButton}
                                        onPress={detectLocation}
                                    >
                                        <Text style={styles.detectButtonText}>📍 Detect</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Email *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="your@email.com"
                                    placeholderTextColor={colors.text.muted}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    editable={!loading}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Password *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Minimum 6 characters"
                                    placeholderTextColor={colors.text.muted}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    editable={!loading}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>NTRP Rating (Optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., 3.5"
                                    placeholderTextColor={colors.text.muted}
                                    value={ntrpRating}
                                    onChangeText={setNtrpRating}
                                    keyboardType="decimal-pad"
                                    editable={!loading}
                                />
                                <Text style={styles.helperText}>
                                    NTRP scale: 1.0 (beginner) to 7.0 (professional)
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={[styles.button, loading && styles.buttonDisabled]}
                                onPress={handleRegister}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color={colors.text.light} />
                                ) : (
                                    <Text style={styles.buttonText}>Create Account</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.linkButton}
                                onPress={() => navigation.navigate('Login')}
                                disabled={loading}
                            >
                                <Text style={styles.linkText}>
                                    Already have an account? <Text style={styles.linkTextBold}>Login</Text>
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: spacing.xl,
    },
    content: {
        paddingHorizontal: spacing.xl,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    title: {
        fontSize: typography.fontSize['4xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.text.light,
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: typography.fontSize.lg,
        color: colors.text.light,
        opacity: 0.9,
    },
    form: {
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    inputContainer: {
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
    label: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    input: {
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    helperText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.muted,
        marginTop: spacing.xs,
    },
    button: {
        backgroundColor: colors.primary.green,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        alignItems: 'center',
        marginTop: spacing.md,
        shadowColor: colors.primary.darkGreen,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.light,
    },
    linkButton: {
        marginTop: spacing.lg,
        alignItems: 'center',
    },
    linkText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
    },
    linkTextBold: {
        fontWeight: typography.fontWeight.bold,
        color: colors.primary.green,
    },
});

export default RegisterScreen;

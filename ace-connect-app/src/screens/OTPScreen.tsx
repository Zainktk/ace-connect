import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Keyboard,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, typography, spacing, borderRadius } from '../theme/index';
import api from '../services/api';

const OTPScreen = ({ route, navigation }: any) => {
    const { email } = route.params;
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [timer, setTimer] = useState(60);
    const inputs = useRef<Array<TextInput | null>>([]);

    useEffect(() => {
        let interval: any;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleChange = (text: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);

        // Auto-focus next input
        if (text && index < 5) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        const otpCode = otp.join('');
        if (otpCode.length < 6) {
            Alert.alert('Error', 'Please enter the full 6-digit code');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/verify-otp', { email, otp: otpCode });
            Alert.alert('Success', 'Email verified successfully! You can now login.', [
                { text: 'OK', onPress: () => navigation.navigate('Login') }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (timer > 0) return;

        setResending(true);
        try {
            await api.post('/auth/resend-otp', { email });
            setTimer(60);
            Alert.alert('Success', 'A new verification code has been sent to your email.');
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to resend code');
        } finally {
            setResending(false);
        }
    };

    return (
        <LinearGradient
            colors={[colors.primary.darkGreen, colors.primary.green]}
            style={styles.container}
        >
            <View style={styles.card}>
                <Text style={styles.title}>Email Verification</Text>
                <Text style={styles.subtitle}>
                    We've sent a 6-digit code to{'\n'}
                    <Text style={styles.emailText}>{email}</Text>
                </Text>

                <View style={styles.otpContainer}>
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => { inputs.current[index] = ref; }}
                            style={styles.otpInput}
                            value={digit}
                            onChangeText={(text) => handleChange(text, index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                            keyboardType="numeric"
                            maxLength={1}
                            selectTextOnFocus
                        />
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleVerify}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={colors.text.light} />
                    ) : (
                        <Text style={styles.buttonText}>Verify Account</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.resendContainer}>
                    <Text style={styles.resendText}>Didn't receive code? </Text>
                    <TouchableOpacity onPress={handleResend} disabled={timer > 0 || resending}>
                        <Text style={[styles.resendLink, (timer > 0 || resending) && styles.resendLinkDisabled]}>
                            {resending ? 'Sending...' : timer > 0 ? `Resend in ${timer}s` : 'Resend Now'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>Back to Register</Text>
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: spacing.xl,
    },
    card: {
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        alignItems: 'center',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    title: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    emailText: {
        fontWeight: typography.fontWeight.bold,
        color: colors.primary.green,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: spacing.xl,
    },
    otpInput: {
        width: 45,
        height: 55,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        textAlign: 'center',
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        backgroundColor: colors.background.secondary,
    },
    button: {
        width: '100%',
        backgroundColor: colors.primary.green,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: colors.text.light,
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
    },
    resendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    resendText: {
        color: colors.text.secondary,
        fontSize: typography.fontSize.sm,
    },
    resendLink: {
        color: colors.primary.green,
        fontWeight: typography.fontWeight.bold,
        fontSize: typography.fontSize.sm,
    },
    resendLinkDisabled: {
        color: colors.text.muted,
    },
    backButton: {
        padding: spacing.sm,
    },
    backButtonText: {
        color: colors.text.secondary,
        fontSize: typography.fontSize.sm,
        textDecorationLine: 'underline',
    },
});

export default OTPScreen;

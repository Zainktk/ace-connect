import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Dimensions
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import api from '../services/api';
import { colors, typography, spacing, borderRadius } from '../theme/index';

interface PaymentModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    eventTitle: string;
    amount: number;
    eventId: number;
    processPayment: (eventId: number) => Promise<void>;
}

const { height } = Dimensions.get('window');

const PaymentModal = ({
    visible,
    onClose,
    onSuccess,
    eventTitle,
    amount,
    eventId,
    processPayment
}: PaymentModalProps) => {
    const [loading, setLoading] = useState(false);
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    const handleConfirmPayment = async () => {
        setLoading(true);
        try {
            // 1. Create Payment Intent on backend
            const response = await api.post('/payments/create-payment-intent', {
                eventId: eventId
            });

            const { clientSecret } = response.data;

            // 2. Initialize Payment Sheet
            const { error: initError } = await initPaymentSheet({
                merchantDisplayName: 'AceConnect',
                paymentIntentClientSecret: clientSecret,
                defaultBillingDetails: {
                    name: 'Tennis Player',
                },
            });

            if (initError) {
                throw new Error(initError.message);
            }

            // 3. Present Payment Sheet
            const { error: presentError } = await presentPaymentSheet();

            if (presentError) {
                if (presentError.code === 'Canceled') {
                    setLoading(false);
                    return;
                }
                throw new Error(presentError.message);
            }

            // 4. Finalize internal payment record (Original processPayment)
            await processPayment(eventId);
            onSuccess();
        } catch (error: any) {
            console.error('Payment Modal Error:', error);
            Alert.alert("Payment Failed", error.message || "Transaction could not be completed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={styles.dismissArea}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View style={styles.content}>
                    <View style={styles.handle} />

                    <Text style={styles.header}>Confirm Payment</Text>

                    <View style={styles.eventInfo}>
                        <Text style={styles.eventLabel}>Event</Text>
                        <Text style={styles.eventTitle}>{eventTitle}</Text>

                        <View style={styles.priceRow}>
                            <Text style={styles.priceLabel}>Event Registration</Text>
                            <Text style={styles.priceValue}>${amount.toFixed(2)}</Text>
                        </View>
                        <View style={styles.feeRow}>
                            <Text style={styles.feeLabel}>Secure Platform Processing</Text>
                            <Text style={styles.feeValue}>Included</Text>
                        </View>
                    </View>

                    <View style={styles.escrowContainer}>
                        <View style={styles.escrowHeader}>
                            <Text style={styles.escrowIcon}>🛡️</Text>
                            <Text style={styles.escrowTitle}>Escrow Protection Active</Text>
                        </View>
                        <Text style={styles.escrowDescription}>
                            Your funds are held by AceConnect and only released to the organizer 24h after the event concludes successfully.
                        </Text>
                    </View>

                    <View style={styles.simulationNotice}>
                        <Text style={styles.noticeText}>
                            Secure payments powered by Stripe. Your card data is encrypted and never stored on our servers.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.payButton, loading && styles.payButtonDisabled]}
                        onPress={handleConfirmPayment}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.text.light} />
                        ) : (
                            <Text style={styles.payButtonText}>Pay ${amount.toFixed(2)} & Join</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={onClose}
                        disabled={loading}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'flex-end',
    },
    dismissArea: {
        flex: 1,
    },
    content: {
        backgroundColor: colors.background.primary,
        borderTopLeftRadius: borderRadius.xl || 25,
        borderTopRightRadius: borderRadius.xl || 25,
        padding: spacing.xl,
        paddingBottom: spacing.xxl + 20,
        maxHeight: height * 0.7,
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: spacing.lg,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.xl,
        textAlign: 'center',
    },
    eventInfo: {
        backgroundColor: colors.background.secondary,
        padding: spacing.lg,
        borderRadius: borderRadius.md,
        marginBottom: spacing.xl,
    },
    eventLabel: {
        fontSize: 12,
        color: colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    eventTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    priceLabel: {
        fontSize: 14,
        color: colors.text.secondary,
    },
    priceValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    feeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    feeLabel: {
        fontSize: 12,
        color: colors.text.secondary,
        fontStyle: 'italic',
    },
    feeValue: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary.green,
    },
    escrowContainer: {
        backgroundColor: '#F0F9FF',
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: '#B9E6FE',
        marginBottom: spacing.xl,
    },
    escrowHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    escrowIcon: {
        fontSize: 20,
        marginRight: spacing.sm,
    },
    escrowTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#026AA2',
    },
    escrowDescription: {
        fontSize: 13,
        color: '#026AA2',
        lineHeight: 18,
    },
    simulationNotice: {
        marginBottom: spacing.xl,
        alignItems: 'center',
    },
    noticeText: {
        fontSize: 11,
        color: colors.text.secondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    payButton: {
        backgroundColor: colors.primary.green,
        paddingVertical: 16,
        borderRadius: borderRadius.lg || 12,
        alignItems: 'center',
        marginBottom: spacing.md,
        shadowColor: colors.primary.green,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    payButtonDisabled: {
        opacity: 0.7,
    },
    payButtonText: {
        color: colors.text.light,
        fontSize: 18,
        fontWeight: 'bold',
    },
    cancelButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: colors.text.secondary,
        fontSize: 16,
    },
});

export default PaymentModal;

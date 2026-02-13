import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme/index';
import api from '../services/api';

const InvitationDetailScreen = ({ route, navigation }: any) => {
    const { invitationId } = route.params;
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [invitation, setInvitation] = useState<any>(null);

    useEffect(() => {
        loadInvitation();
    }, []);

    const loadInvitation = async () => {
        try {
            const response = await api.get('/matchmaking/invitations');
            const inv = response.data.find((i: any) => i.id === invitationId);
            setInvitation(inv);
        } catch (error: any) {
            Alert.alert('Error', 'Failed to load invitation');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        setProcessing(true);
        try {
            await api.put(`/matchmaking/invitations/${invitationId}/accept`);
            Alert.alert('Success', 'Invitation accepted! Match created.', [
                { text: 'OK', onPress: () => navigation.navigate('MainTabs', { screen: 'Home' }) }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to accept invitation');
        } finally {
            setProcessing(false);
        }
    };

    const handleDecline = async () => {
        Alert.alert(
            'Decline Invitation',
            'Are you sure you want to decline this invitation?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Decline',
                    style: 'destructive',
                    onPress: async () => {
                        setProcessing(true);
                        try {
                            await api.put(`/matchmaking/invitations/${invitationId}/decline`);
                            Alert.alert('Declined', 'Invitation declined', [
                                { text: 'OK', onPress: () => navigation.goBack() }
                            ]);
                        } catch (error: any) {
                            Alert.alert('Error', 'Failed to decline invitation');
                        } finally {
                            setProcessing(false);
                        }
                    }
                }
            ]
        );
    };

    const handleReport = () => {
        Alert.alert(
            'Report User',
            'Please choose a reason for reporting:',
            [
                { text: 'Inappropriate Behavior', onPress: () => submitReport('Inappropriate Behavior') },
                { text: 'Suspicious/Criminal', onPress: () => submitReport('Suspicious/Criminal') },
                { text: 'Spam', onPress: () => submitReport('Spam') },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const submitReport = async (reason: string) => {
        try {
            await api.post('/users/report', {
                reportedId: invitation.sender_id,
                reason,
                details: `Reported from InvitationDetailScreen for: ${reason}`
            });
            Alert.alert('Reported', 'Thank you for keeping our community safe. We will review this report.');
        } catch (error: any) {
            Alert.alert('Error', 'Failed to submit report');
        }
    };

    const handleBlock = () => {
        Alert.alert(
            'Block User',
            'Are you sure you want to block this user? You will no longer see their requests.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Block',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.post('/users/block', { blockedId: invitation.sender_id });
                            Alert.alert('Blocked', 'User has been blocked.');
                            navigation.goBack();
                        } catch (error: any) {
                            Alert.alert('Error', 'Failed to block user');
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary.green} />
            </View>
        );
    }

    if (!invitation) return null;

    const isPending = invitation.status === 'pending';

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Sender Info */}
            <View style={styles.senderCard}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{invitation.sender_name?.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.senderName}>{invitation.sender_name}</Text>
                <Text style={styles.senderRating}>NTRP: {(parseFloat(invitation.sender_rating) || 0).toFixed(1)}</Text>
            </View>

            {/* Match Details */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Match Details</Text>

                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailValue}>
                        {invitation.match_type === 'singles' ? '🎾 Singles' : '🎾🎾 Doubles'}
                    </Text>
                </View>

                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Location:</Text>
                    <Text style={styles.detailValue}>{invitation.location || 'Flexible'}</Text>
                </View>

                {invitation.preferred_date && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Date:</Text>
                        <Text style={styles.detailValue}>
                            {new Date(invitation.preferred_date).toLocaleDateString()}
                        </Text>
                    </View>
                )}

                {invitation.preferred_time && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Time:</Text>
                        <Text style={styles.detailValue}>{invitation.preferred_time.substring(0, 5)}</Text>
                    </View>
                )}

                {invitation.message && (
                    <View style={styles.messageContainer}>
                        <Text style={styles.messageLabel}>Message:</Text>
                        <Text style={styles.messageText}>"{invitation.message}"</Text>
                    </View>
                )}
            </View>

            {/* Status Badge */}
            <View style={[
                styles.statusBadge,
                {
                    backgroundColor:
                        invitation.status === 'accepted' ? colors.success :
                            invitation.status === 'declined' ? colors.error :
                                colors.warning
                }
            ]}>
                <Text style={styles.statusText}>
                    {invitation.status.toUpperCase()}
                </Text>
            </View>

            {/* Action Buttons (only if pending) */}
            {isPending && (
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.acceptButton, processing && styles.buttonDisabled]}
                        onPress={handleAccept}
                        disabled={processing}
                    >
                        {processing ? (
                            <ActivityIndicator color={colors.text.light} />
                        ) : (
                            <Text style={styles.acceptButtonText}>Accept</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.declineButton, processing && styles.buttonDisabled]}
                        onPress={handleDecline}
                        disabled={processing}
                    >
                        <Text style={styles.declineButtonText}>Decline</Text>
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity
                        style={styles.safetyButton}
                        onPress={handleReport}
                    >
                        <Text style={styles.safetyButtonText}>🚩 Report User</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.safetyButton}
                        onPress={handleBlock}
                    >
                        <Text style={styles.safetyButtonText}>🚫 Block User</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    content: {
        padding: spacing.lg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background.primary,
    },
    senderCard: {
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        alignItems: 'center',
        marginBottom: spacing.lg,
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
        fontSize: 36,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.light,
    },
    senderName: {
        fontSize: typography.fontSize.xxl,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    senderRating: {
        fontSize: typography.fontSize.lg,
        color: colors.text.secondary,
    },
    section: {
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: spacing.sm,
    },
    detailLabel: {
        fontSize: typography.fontSize.md,
        color: colors.text.secondary,
        width: 80,
    },
    detailValue: {
        fontSize: typography.fontSize.md,
        color: colors.text.primary,
        fontWeight: typography.fontWeight.medium,
        flex: 1,
    },
    messageContainer: {
        marginTop: spacing.md,
    },
    messageLabel: {
        fontSize: typography.fontSize.md,
        color: colors.text.secondary,
        marginBottom: spacing.xs,
    },
    messageText: {
        fontSize: typography.fontSize.md,
        color: colors.text.primary,
        fontStyle: 'italic',
    },
    statusBadge: {
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    statusText: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.light,
    },
    buttonContainer: {
        gap: spacing.md,
    },
    acceptButton: {
        backgroundColor: colors.success,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
    },
    acceptButtonText: {
        color: colors.text.light,
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
    },
    declineButton: {
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.error,
    },
    declineButtonText: {
        color: colors.error,
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.sm,
    },
    safetyButton: {
        paddingVertical: spacing.sm,
        alignItems: 'center',
    },
    safetyButtonText: {
        color: colors.text.secondary,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
    },
});

export default InvitationDetailScreen;

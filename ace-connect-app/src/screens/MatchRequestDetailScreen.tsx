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

const MatchRequestDetailScreen = ({ route, navigation }: any) => {
    const { requestId } = route.params;
    const [loading, setLoading] = useState(true);
    const [request, setRequest] = useState<any>(null);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadRequest();
    }, []);

    const loadRequest = async () => {
        try {
            const response = await api.get(`/matchmaking/requests/${requestId}`);
            setRequest(response.data);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to load request');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handleSendInvitation = async () => {
        setSending(true);
        try {
            await api.post('/matchmaking/invitations', {
                matchRequestId: requestId,
                message: `Hi! I'd love to play ${request.match_type} with you!`
            });
            Alert.alert('Success', 'Invitation sent successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to send invitation');
        } finally {
            setSending(false);
        }
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
                reportedId: request.user_id,
                reason,
                details: `Reported from MatchRequestDetailScreen for: ${reason}`
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
                            await api.post('/users/block', { blockedId: request.user_id });
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

    if (!request) return null;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Player Info */}
            <View style={styles.playerCard}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{request.name?.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.playerName}>{request.name}</Text>
                <Text style={styles.playerRating}>NTRP: {(parseFloat(request.ntrp_rating) || 0).toFixed(1)}</Text>
                {request.bio && <Text style={styles.playerBio}>{request.bio}</Text>}
            </View>

            {/* Match Details */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Match Details</Text>

                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type:</Text>
                    <Text style={styles.detailValue}>
                        {request.match_type === 'singles' ? '🎾 Singles' : '🎾🎾 Doubles'}
                    </Text>
                </View>

                <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Location:</Text>
                    <Text style={styles.detailValue}>{request.location || 'Flexible'}</Text>
                </View>

                {request.preferred_date && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Date:</Text>
                        <Text style={styles.detailValue}>
                            {new Date(request.preferred_date).toLocaleDateString()}
                        </Text>
                    </View>
                )}

                {request.preferred_time && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Time:</Text>
                        <Text style={styles.detailValue}>{request.preferred_time.substring(0, 5)}</Text>
                    </View>
                )}

                {request.skill_level_min && request.skill_level_max && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Skill Range:</Text>
                        <Text style={styles.detailValue}>
                            {(parseFloat(request.skill_level_min) || 0).toFixed(1)} - {(parseFloat(request.skill_level_max) || 0).toFixed(1)}
                        </Text>
                    </View>
                )}

                {request.notes && (
                    <View style={styles.notesContainer}>
                        <Text style={styles.notesLabel}>Notes:</Text>
                        <Text style={styles.notesText}>{request.notes}</Text>
                    </View>
                )}
            </View>

            {/* Send Invitation Button */}
            <TouchableOpacity
                style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                onPress={handleSendInvitation}
                disabled={sending}
            >
                {sending ? (
                    <ActivityIndicator color={colors.text.light} />
                ) : (
                    <Text style={styles.sendButtonText}>Send Invitation</Text>
                )}
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
    playerCard: {
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
    playerName: {
        fontSize: typography.fontSize.xxl,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    playerRating: {
        fontSize: typography.fontSize.lg,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    playerBio: {
        fontSize: typography.fontSize.md,
        color: colors.text.secondary,
        textAlign: 'center',
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
        width: 100,
    },
    detailValue: {
        fontSize: typography.fontSize.md,
        color: colors.text.primary,
        fontWeight: typography.fontWeight.medium,
        flex: 1,
    },
    notesContainer: {
        marginTop: spacing.md,
    },
    notesLabel: {
        fontSize: typography.fontSize.md,
        color: colors.text.secondary,
        marginBottom: spacing.xs,
    },
    notesText: {
        fontSize: typography.fontSize.md,
        color: colors.text.primary,
        fontStyle: 'italic',
    },
    sendButton: {
        backgroundColor: colors.primary.green,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
    },
    sendButtonDisabled: {
        opacity: 0.6,
    },
    sendButtonText: {
        color: colors.text.light,
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.md,
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

export default MatchRequestDetailScreen;

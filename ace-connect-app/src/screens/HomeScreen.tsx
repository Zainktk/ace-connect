import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Alert, TextInput } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, typography, spacing, borderRadius } from '../theme/index';
import api from '../services/api';

const HomeScreen = ({ navigation }: any) => {
    const { user } = useAuth();
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Review Modal State
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<any>(null);
    const [rating, setRating] = useState(5);
    const [feedback, setFeedback] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);

    useEffect(() => {
        fetchMatches();
    }, []);

    const fetchMatches = async () => {
        try {
            const response = await api.get('/matchmaking/matches/my');
            setMatches(response.data);
        } catch (error) {
            console.error('Fetch matches error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReview = (match: any) => {
        setSelectedMatch(match);
        setReviewModalVisible(true);
    };

    const submitReview = async () => {
        if (!selectedMatch) return;

        setSubmittingReview(true);
        try {
            await api.post(`/matchmaking/matches/${selectedMatch.id}/review`, {
                rating,
                feedback: feedback.trim()
            });
            Alert.alert('Thank You!', 'Your feedback helps build a safer community.');
            setReviewModalVisible(false);
            setFeedback('');
            setRating(5);
            fetchMatches(); // Refresh data
        } catch (error) {
            console.error('Review submission error:', error);
            Alert.alert('Error', 'Failed to submit review.');
        } finally {
            setSubmittingReview(false);
        }
    };

    const upcomingMatches = matches.filter(m => m.status === 'accepted' || m.status === 'pending');

    const pendingReviews = matches.filter(m => {
        const matchTime = m.scheduled_time ? new Date(m.scheduled_time) : null;
        const now = new Date();
        return m.status === 'accepted' && matchTime && matchTime < now && !m.user_reviewed;
    });

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.name}>{user?.name || 'Tennis Player'}!</Text>
            </View>

            <View style={styles.statsContainer}>
                {/* ... existing stats ... */}
            </View>

            {pendingReviews.length > 0 && (
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.warning }]}>⭐ Pending Reviews</Text>
                    {pendingReviews.map((match) => (
                        <TouchableOpacity
                            key={`review-${match.id}`}
                            style={[styles.matchCard, styles.reviewCard]}
                            onPress={() => handleReview(match)}
                        >
                            <View style={styles.matchInfo}>
                                <Text style={styles.reviewPrompt}>How was your match with {match.opponent_name}?</Text>
                                <Text style={styles.reviewSubtext}>Tap to rate and help the community.</Text>
                            </View>
                            <Text style={styles.reviewAction}>Rate 🎾</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📅 Upcoming Matches</Text>
                {loading ? (
                    <ActivityIndicator size="small" color={colors.primary.green} />
                ) : upcomingMatches.length > 0 ? (
                    upcomingMatches.map((match) => (
                        <View key={match.id} style={styles.matchCard}>
                            <View style={styles.matchInfo}>
                                <Text style={styles.opponentName}>vs {match.opponent_name}</Text>
                                <Text style={styles.matchDetails}>
                                    {match.match_type.toUpperCase()} • {typeof match.opponent_rating === 'number' ? match.opponent_rating.toFixed(1) : 'N/A'}
                                </Text>
                                <Text style={styles.matchLocation}>📍 {match.location || 'TBA'}</Text>
                                <Text style={styles.matchTime}>
                                    🕒 {match.scheduled_time
                                        ? new Date(match.scheduled_time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                                        : 'Time TBD'}
                                </Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: match.status === 'accepted' ? '#D1FAE5' : '#FEF3C7' }]}>
                                <Text style={[styles.statusText, { color: match.status === 'accepted' ? '#065F46' : '#92400E' }]}>
                                    {match.status.toUpperCase()}
                                </Text>
                            </View>
                            {match.status === 'accepted' && (
                                <TouchableOpacity
                                    style={styles.chatButton}
                                    onPress={() => navigation.navigate('Chat', {
                                        matchId: match.id,
                                        opponentName: match.opponent_name
                                    })}
                                >
                                    <Text style={styles.chatButtonText}>💬 Chat</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No matches scheduled yet.</Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('MainTabs', { screen: 'Matchmaking' })}
                        >
                            <Text style={styles.linkText}>Find a partner 🎾</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <TouchableOpacity
                style={styles.safetyCard}
                onPress={() => navigation.navigate('Safety')}
            >
                <View style={styles.safetyIconContainer}>
                    <Text style={styles.safetyIcon}>🛡️</Text>
                </View>
                <View style={styles.safetyContent}>
                    <Text style={styles.safetyTitle}>Safety Center</Text>
                    <Text style={styles.safetyText}>Learn how to stay safe while playing matches.</Text>
                </View>
                <Text style={styles.safetyArrow}>{'>'}</Text>
            </TouchableOpacity>

            <View style={styles.quickActions}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('MainTabs', { screen: 'Matchmaking' })}
                >
                    <Text style={styles.actionButtonText}>🎾 Find a Match</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('MainTabs', { screen: 'Events' })}
                >
                    <Text style={styles.actionButtonText}>📅 Browse Events</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>🛒 Shop Gear</Text>
                </TouchableOpacity>
            </View>

            <Modal
                visible={reviewModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setReviewModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Rate your opponent</Text>
                        <Text style={styles.modalSubtitle}>How was {selectedMatch?.opponent_name} as a partner?</Text>

                        <View style={styles.ratingRow}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <TouchableOpacity
                                    key={star}
                                    onPress={() => setRating(star)}
                                >
                                    <Text style={[styles.starIcon, rating >= star ? styles.starFilled : styles.starEmpty]}>
                                        {rating >= star ? '⭐' : '☆'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            style={styles.feedbackInput}
                            placeholder="Optional feedback (e.g. prompt, friendly, great court etiquette)"
                            placeholderTextColor={colors.text.muted}
                            multiline
                            numberOfLines={4}
                            value={feedback}
                            onChangeText={setFeedback}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setReviewModalVisible(false)}
                                disabled={submittingReview}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.submitButton]}
                                onPress={submitReview}
                                disabled={submittingReview}
                            >
                                {submittingReview ? (
                                    <ActivityIndicator color={colors.text.light} />
                                ) : (
                                    <Text style={styles.submitButtonText}>Submit</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.secondary,
        padding: spacing.xl,
    },
    header: {
        marginBottom: spacing.xl,
    },
    greeting: {
        fontSize: typography.fontSize.lg,
        color: colors.text.secondary,
    },
    name: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.background.card,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statValue: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.primary.green,
        marginBottom: spacing.xs,
    },
    statLabel: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    matchCard: {
        backgroundColor: colors.background.card,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    matchInfo: {
        flex: 1,
    },
    opponentName: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: 2,
    },
    matchDetails: {
        fontSize: typography.fontSize.sm,
        color: colors.primary.green,
        fontWeight: typography.fontWeight.semibold,
        marginBottom: spacing.xs,
    },
    matchLocation: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        marginBottom: 2,
    },
    matchTime: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
    },
    statusText: {
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.bold,
    },
    emptyCard: {
        backgroundColor: colors.background.card,
        padding: spacing.xl,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: colors.border,
    },
    emptyText: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        marginBottom: spacing.sm,
    },
    linkText: {
        fontSize: typography.fontSize.base,
        color: colors.primary.green,
        fontWeight: typography.fontWeight.bold,
    },
    quickActions: {
        marginBottom: spacing.xl,
    },
    actionButton: {
        backgroundColor: colors.background.card,
        padding: spacing.lg,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    actionButtonText: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
    },
    safetyCard: {
        backgroundColor: '#EBF5FF',
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xl,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    safetyIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#DBEAFE',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    safetyIcon: {
        fontSize: 20,
    },
    safetyContent: {
        flex: 1,
    },
    safetyTitle: {
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.bold,
        color: '#1E40AF',
    },
    safetyText: {
        fontSize: typography.fontSize.xs,
        color: '#1E40AF',
        opacity: 0.8,
    },
    safetyArrow: {
        fontSize: 20,
        color: '#1E40AF',
        marginLeft: spacing.sm,
        fontWeight: 'bold',
    },
    reviewCard: {
        borderColor: colors.warning,
        borderWidth: 1,
        backgroundColor: '#FFFBEB',
    },
    reviewPrompt: {
        fontSize: typography.fontSize.md,
        fontWeight: 'bold',
        color: '#92400E',
    },
    reviewSubtext: {
        fontSize: typography.fontSize.xs,
        color: '#B45309',
        fontStyle: 'italic',
    },
    reviewAction: {
        fontSize: typography.fontSize.sm,
        fontWeight: 'bold',
        color: '#92400E',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    modalContent: {
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.xl,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    modalSubtitle: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    ratingRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    starIcon: {
        fontSize: 32,
    },
    starFilled: {
        color: colors.warning,
    },
    starEmpty: {
        color: colors.text.muted,
    },
    feedbackInput: {
        width: '100%',
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        minHeight: 100,
        textAlignVertical: 'top',
        color: colors.text.primary,
        marginBottom: spacing.xl,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    modalButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: colors.background.secondary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cancelButtonText: {
        color: colors.text.primary,
        fontWeight: 'bold',
    },
    submitButton: {
        backgroundColor: colors.primary.green,
    },
    submitButtonText: {
        color: colors.text.light,
        fontWeight: 'bold',
    },
    chatButton: {
        backgroundColor: colors.primary.green,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.md,
        marginLeft: spacing.md,
    },
    chatButtonText: {
        color: colors.text.light,
        fontSize: typography.fontSize.xs,
        fontWeight: 'bold',
    },
});

export default HomeScreen;

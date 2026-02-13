import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    RefreshControl
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme/index';
import api from '../services/api';

const MatchHistoryScreen = ({ navigation }: any) => {
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const response = await api.get('/matchmaking/matches/history');
            setMatches(response.data);
        } catch (error) {
            console.error('Match history load error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadHistory();
    };

    const renderMatchItem = ({ item }: { item: any }) => (
        <View style={styles.matchCard}>
            <View style={styles.matchHeader}>
                <Text style={styles.matchDate}>
                    {new Date(item.matchDate).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    })}
                </Text>
                <View style={styles.matchTypeBadge}>
                    <Text style={styles.matchTypeText}>{item.matchType?.toUpperCase() || 'MATCH'}</Text>
                </View>
            </View>

            <View style={styles.matchBody}>
                <View style={styles.opponentSection}>
                    {item.opponentPhoto ? (
                        <Image source={{ uri: item.opponentPhoto }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarInitial}>{item.opponentName?.charAt(0)}</Text>
                        </View>
                    )}
                    <View>
                        <Text style={styles.vsText}>VS</Text>
                        <Text style={styles.opponentName}>{item.opponentName}</Text>
                    </View>
                </View>

                <View style={styles.scoreSection}>
                    <Text style={styles.scoreLabel}>Score</Text>
                    <Text style={styles.scoreValue}>{item.score || 'N/A'}</Text>
                </View>
            </View>

            {item.location && (
                <View style={styles.locationSection}>
                    <Text style={styles.locationText}>📍 {item.location}</Text>
                </View>
            )}
        </View>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary.green} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={matches}
                renderItem={renderMatchItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>🏆</Text>
                        <Text style={styles.emptyTitle}>No Matches Yet</Text>
                        <Text style={styles.emptyText}>Complete matches to see your history here!</Text>
                        <TouchableOpacity
                            style={styles.findButton}
                            onPress={() => navigation.navigate('Matchmaking')}
                        >
                            <Text style={styles.findButtonText}>Find a Match</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    listContent: {
        padding: spacing.lg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    matchCard: {
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    matchHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: spacing.sm,
    },
    matchDate: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        fontWeight: typography.fontWeight.medium,
    },
    matchTypeBadge: {
        backgroundColor: `${colors.primary.green}15`,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
    },
    matchTypeText: {
        fontSize: 10,
        fontWeight: typography.fontWeight.bold,
        color: colors.primary.green,
    },
    matchBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    opponentSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: spacing.md,
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.background.secondary,
        marginRight: spacing.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 20,
        color: colors.text.secondary,
        fontWeight: 'bold',
    },
    vsText: {
        fontSize: 10,
        color: colors.text.muted,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    opponentName: {
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
    },
    scoreSection: {
        alignItems: 'flex-end',
    },
    scoreLabel: {
        fontSize: 10,
        color: colors.text.muted,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    scoreValue: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.primary.green,
    },
    locationSection: {
        marginTop: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 100,
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    emptyText: {
        fontSize: typography.fontSize.md,
        color: colors.text.secondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    findButton: {
        backgroundColor: colors.primary.green,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
    },
    findButtonText: {
        color: colors.text.light,
        fontWeight: 'bold',
        fontSize: typography.fontSize.md,
    }
});

export default MatchHistoryScreen;

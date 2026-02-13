import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme/index';

interface MatchRequestCardProps {
  request: any;
  onPress: () => void;
  showCompatibility?: boolean;
}

const MatchRequestCard: React.FC<MatchRequestCardProps> = ({
  request,
  onPress,
  showCompatibility = false
}) => {
  const formatDate = (date: string) => {
    if (!date) return 'Flexible';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    return time.substring(0, 5); // HH:MM
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {showCompatibility && request.compatibility_score && (
        <View style={[
          styles.compatibilityBadge,
          { backgroundColor: request.compatibility_score >= 70 ? colors.success : colors.warning }
        ]}>
          <Text style={styles.compatibilityText}>
            {request.compatibility_score}% Match
          </Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {request.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{request.name || 'Unknown'}</Text>
            {request.is_verified !== false && (
              <Text style={styles.verifiedBadge}>✅</Text>
            )}
          </View>
          <Text style={styles.rating}>
            NTRP: {(parseFloat(request.ntrp_rating) || 0).toFixed(1)}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Type:</Text>
          <Text style={styles.detailValue}>
            {request.match_type === 'singles' ? '🎾 Singles' : '🎾🎾 Doubles'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>When:</Text>
          <Text style={styles.detailValue}>
            {formatDate(request.preferred_date)}
            {request.preferred_time && ` at ${formatTime(request.preferred_time)}`}
          </Text>
        </View>

        {request.location && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue}>{request.location}</Text>
          </View>
        )}

        {request.skill_level_min && request.skill_level_max && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Skill Level:</Text>
            <Text style={styles.detailValue}>
              {(parseFloat(request.skill_level_min) || 0).toFixed(1)} - {(parseFloat(request.skill_level_max) || 0).toFixed(1)}
            </Text>
          </View>
        )}
      </View>

      {request.notes && (
        <Text style={styles.notes} numberOfLines={2}>
          "{request.notes}"
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
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
  compatibilityBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  compatibilityText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  verifiedBadge: {
    marginLeft: spacing.xs,
    fontSize: 14,
  },
  rating: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  details: {
    marginBottom: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    width: 80,
  },
  detailValue: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
  notes: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
});

export default MatchRequestCard;

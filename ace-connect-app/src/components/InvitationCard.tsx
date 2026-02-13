import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme/index';

interface InvitationCardProps {
  invitation: any;
  onPress: () => void;
  type?: 'received' | 'sent';
}

const InvitationCard: React.FC<InvitationCardProps> = ({
  invitation,
  onPress,
  type = 'received'
}) => {
  const formatDate = (date: string) => {
    if (!date) return 'Flexible';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return colors.success;
      case 'declined': return colors.error;
      case 'pending': return colors.warning;
      default: return colors.text.secondary;
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {invitation.sender_name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {type === 'received' ? invitation.sender_name : invitation.recipient_name}
            </Text>
            {type === 'received' && invitation.sender_is_verified !== false && (
              <Text style={styles.verifiedBadge}>✅</Text>
            )}
          </View>
          <Text style={styles.rating}>
            NTRP: {(parseFloat(invitation.sender_rating) || 0).toFixed(1)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invitation.status) }]}>
          <Text style={styles.statusText}>{getStatusText(invitation.status)}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Type:</Text>
          <Text style={styles.detailValue}>
            {invitation.match_type === 'singles' ? '🎾 Singles' : '🎾🎾 Doubles'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>When:</Text>
          <Text style={styles.detailValue}>
            {formatDate(invitation.preferred_date)}
            {invitation.preferred_time && ` at ${invitation.preferred_time.substring(0, 5)}`}
          </Text>
        </View>

        {invitation.location && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue}>{invitation.location}</Text>
          </View>
        )}
      </View>

      {invitation.message && (
        <Text style={styles.message} numberOfLines={2}>
          "{invitation.message}"
        </Text>
      )}

      <Text style={styles.timestamp}>
        {new Date(invitation.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        })}
      </Text>
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
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
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
  message: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  timestamp: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted,
    textAlign: 'right',
  },
});

export default InvitationCard;

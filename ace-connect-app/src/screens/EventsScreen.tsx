import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../theme/index';

const EventsScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>📅 Events</Text>
            <Text style={styles.subtitle}>Coming Soon</Text>
            <Text style={styles.description}>
                Discover and join tennis tournaments, clinics, and social events near you.
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    title: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.md,
    },
    subtitle: {
        fontSize: typography.fontSize.xl,
        color: colors.primary.green,
        marginBottom: spacing.lg,
    },
    description: {
        fontSize: typography.fontSize.base,
        color: colors.text.secondary,
        textAlign: 'center',
    },
});

export default EventsScreen;

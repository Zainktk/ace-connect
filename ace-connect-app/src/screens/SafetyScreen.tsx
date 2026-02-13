import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme/index';

const SafetyScreen = ({ navigation }: any) => {
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={styles.title}>🎾 Safety First</Text>
                <Text style={styles.subtitle}>Our community is built on trust and respect. Follow these guidelines to stay safe while playing.</Text>
            </View>

            <View style={styles.tipCard}>
                <Text style={styles.tipIcon}>📍</Text>
                <View style={styles.tipContent}>
                    <Text style={styles.tipTitle}>Meet in Public</Text>
                    <Text style={styles.tipDescription}>Only meet at verified public tennis courts during daylight hours or in well-lit evening areas.</Text>
                </View>
            </View>

            <View style={styles.tipCard}>
                <Text style={styles.tipIcon}>📱</Text>
                <View style={styles.tipContent}>
                    <Text style={styles.tipTitle}>Share Your Location</Text>
                    <Text style={styles.tipDescription}>Always tell a friend or family member exactly where you are going and who you are meeting.</Text>
                </View>
            </View>

            <View style={styles.tipCard}>
                <Text style={styles.tipIcon}>🔒</Text>
                <View style={styles.tipContent}>
                    <Text style={styles.tipTitle}>Protect Privacy</Text>
                    <Text style={styles.tipDescription}>Exchange phone numbers only after you have met in person and feel comfortable.</Text>
                </View>
            </View>

            <View style={styles.tipCard}>
                <Text style={styles.tipIcon}>🚩</Text>
                <View style={styles.tipContent}>
                    <Text style={styles.tipTitle}>Trust Your Gut</Text>
                    <Text style={styles.tipDescription}>If something feels off, cancel the match. Use the "Report" button if a user behaves inappropriately.</Text>
                </View>
            </View>

            <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.goBack()}
            >
                <Text style={styles.buttonText}>I Understand</Text>
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
        padding: spacing.xl,
    },
    header: {
        marginBottom: spacing.xl,
        alignItems: 'center',
    },
    title: {
        fontSize: typography.fontSize['3xl'],
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: typography.fontSize.md,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    tipCard: {
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        flexDirection: 'row',
        marginBottom: spacing.md,
        alignItems: 'center',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    tipIcon: {
        fontSize: 32,
        marginRight: spacing.lg,
    },
    tipContent: {
        flex: 1,
    },
    tipTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: 4,
    },
    tipDescription: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        lineHeight: 20,
    },
    button: {
        backgroundColor: colors.primary.green,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    buttonText: {
        color: colors.text.light,
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
    },
});

export default SafetyScreen;

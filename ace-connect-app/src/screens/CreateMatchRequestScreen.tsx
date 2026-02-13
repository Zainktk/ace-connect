import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    Platform,
    Modal
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme/index';
import Geolocation from '@react-native-community/geolocation';
import MapView, { Marker } from 'react-native-maps';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CreateMatchRequestScreen = ({ navigation }: any) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const [matchType, setMatchType] = useState<'singles' | 'doubles'>('singles');
    const [preferredDate, setPreferredDate] = useState('');
    const [preferredTime, setPreferredTime] = useState('');
    const [location, setLocation] = useState('');
    const getInitialSkill = (val: any, offset: number) => {
        const num = parseFloat(val);
        return isNaN(num) ? '' : (num + offset).toFixed(1);
    };

    const [skillLevelMin, setSkillLevelMin] = useState(getInitialSkill(user?.ntrpRating, -0.5));
    const [skillLevelMax, setSkillLevelMax] = useState(getInitialSkill(user?.ntrpRating, 0.5));
    const [courtType, setCourtType] = useState('any');
    const [preferredTimeRange, setPreferredTimeRange] = useState('');
    const [latitude, setLatitude] = useState(40.7128); // Default NYC
    const [longitude, setLongitude] = useState(-74.0060);
    const [mapModalVisible, setMapModalVisible] = useState(false);
    const [notes, setNotes] = useState('');

    const handleSubmit = async () => {
        // Validation
        if (!location.trim()) {
            Alert.alert('Error', 'Please enter a location');
            return;
        }

        setLoading(true);
        try {
            await api.post('/matchmaking/requests', {
                matchType,
                preferredDate: preferredDate || null,
                preferredTime: preferredTime || null,
                location: location.trim(),
                skillLevelMin: skillLevelMin ? parseFloat(skillLevelMin) : null,
                skillLevelMax: skillLevelMax ? parseFloat(skillLevelMax) : null,
                courtType,
                preferredTimeRange: preferredTimeRange || null,
                latitude,
                longitude,
                notes: notes.trim() || null
            });

            Alert.alert('Success', 'Match request created successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to create request');
        } finally {
            setLoading(false);
        }
    };

    const detectLocation = () => {
        Geolocation.getCurrentPosition(
            (position) => {
                const { latitude: lat, longitude: lng } = position.coords;
                setLatitude(lat);
                setLongitude(lng);
                setLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                Alert.alert('Location Detected', 'Coordinates updated! Drop a pin on the map for more precision.');
            },
            (error) => Alert.alert('Error', 'Could not detect location.'),
            { enableHighAccuracy: true, timeout: 15000 }
        );
    };

    const handleMapSelect = (e: any) => {
        const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
        setLatitude(lat);
        setLongitude(lng);
        setLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Create Match Request</Text>
            <Text style={styles.subtitle}>Find your perfect tennis partner</Text>

            {/* Match Type */}
            <Text style={styles.label}>Match Type *</Text>
            <View style={styles.matchTypeContainer}>
                <TouchableOpacity
                    style={[styles.matchTypeButton, matchType === 'singles' && styles.matchTypeButtonActive]}
                    onPress={() => setMatchType('singles')}
                >
                    <Text style={[styles.matchTypeText, matchType === 'singles' && styles.matchTypeTextActive]}>
                        🎾 Singles
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.matchTypeButton, matchType === 'doubles' && styles.matchTypeButtonActive]}
                    onPress={() => setMatchType('doubles')}
                >
                    <Text style={[styles.matchTypeText, matchType === 'doubles' && styles.matchTypeTextActive]}>
                        🎾🎾 Doubles
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Court Type */}
            <Text style={styles.label}>Court Type</Text>
            <View style={styles.matchTypeContainer}>
                {['any', 'hard', 'clay', 'grass'].map((type) => (
                    <TouchableOpacity
                        key={type}
                        style={[styles.courtTypeButton, courtType === type && styles.matchTypeButtonActive]}
                        onPress={() => setCourtType(type)}
                    >
                        <Text style={[styles.matchTypeText, courtType === type && styles.matchTypeTextActive]}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Location */}
            <Text style={styles.label}>Location *</Text>
            <View style={styles.locationInputRow}>
                <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="e.g., Central Park Courts"
                    placeholderTextColor={colors.text.muted}
                    value={location}
                    onChangeText={setLocation}
                />
                <TouchableOpacity style={styles.detectButton} onPress={detectLocation}>
                    <Text style={styles.detectButtonText}>📍 Detect</Text>
                </TouchableOpacity>
            </View>
            <TouchableOpacity
                style={styles.mapPickerButton}
                onPress={() => setMapModalVisible(true)}
            >
                <Text style={styles.mapPickerButtonText}>🗺️ Pick on Map</Text>
            </TouchableOpacity>

            {/* Date & Time */}
            <Text style={styles.label}>Preferred Date (Optional)</Text>
            <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD (e.g., 2026-02-15)"
                placeholderTextColor={colors.text.muted}
                value={preferredDate}
                onChangeText={setPreferredDate}
            />

            <Text style={styles.label}>Preferred Time (Optional)</Text>
            <TextInput
                style={styles.input}
                placeholder="HH:MM (e.g., 14:30)"
                placeholderTextColor={colors.text.muted}
                value={preferredTime}
                onChangeText={setPreferredTime}
            />

            <Text style={styles.label}>Time Preference (Range)</Text>
            <View style={styles.timeRangeContainer}>
                {['Morning', 'Afternoon', 'Evening', 'Night'].map((time) => (
                    <TouchableOpacity
                        key={time}
                        style={[styles.timeRangeButton, preferredTimeRange === time && styles.matchTypeButtonActive]}
                        onPress={() => setPreferredTimeRange(preferredTimeRange === time ? '' : time)}
                    >
                        <Text style={[styles.matchTypeText, preferredTimeRange === time && styles.matchTypeTextActive]}>
                            {time}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Skill Level Range */}
            <Text style={styles.label}>Skill Level Range (Optional)</Text>
            <View style={styles.skillRangeContainer}>
                <View style={styles.skillInputContainer}>
                    <Text style={styles.skillInputLabel}>Min</Text>
                    <TextInput
                        style={styles.skillInput}
                        placeholder="1.0"
                        placeholderTextColor={colors.text.muted}
                        value={skillLevelMin}
                        onChangeText={setSkillLevelMin}
                        keyboardType="decimal-pad"
                    />
                </View>
                <Text style={styles.skillRangeSeparator}>to</Text>
                <View style={styles.skillInputContainer}>
                    <Text style={styles.skillInputLabel}>Max</Text>
                    <TextInput
                        style={styles.skillInput}
                        placeholder="7.0"
                        placeholderTextColor={colors.text.muted}
                        value={skillLevelMax}
                        onChangeText={setSkillLevelMax}
                        keyboardType="decimal-pad"
                    />
                </View>
            </View>

            {/* Notes */}
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any additional details..."
                placeholderTextColor={colors.text.muted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
            />

            {/* Submit Button */}
            <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color={colors.text.light} />
                ) : (
                    <Text style={styles.submitButtonText}>Create Request</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            {/* Map Picker Modal */}
            <Modal visible={mapModalVisible} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Drop a Pin</Text>
                        <TouchableOpacity onPress={() => setMapModalVisible(false)}>
                            <Text style={styles.modalClose}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    <MapView
                        style={styles.map}
                        initialRegion={{
                            latitude,
                            longitude,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        }}
                        onPress={handleMapSelect}
                    >
                        <Marker
                            coordinate={{ latitude, longitude }}
                            draggable
                            onDragEnd={handleMapSelect}
                        />
                    </MapView>
                    <View style={styles.mapInstructions}>
                        <Text style={styles.instructionText}>Tap or drag the pin to set match location</Text>
                    </View>
                </View>
            </Modal>
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
    title: {
        fontSize: typography.fontSize.xxl,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: typography.fontSize.md,
        color: colors.text.secondary,
        marginBottom: spacing.xl,
    },
    label: {
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.medium,
        color: colors.text.primary,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
    },
    input: {
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: typography.fontSize.md,
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    textArea: {
        height: 100,
        paddingTop: spacing.md,
    },
    matchTypeContainer: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    matchTypeButton: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
    },
    matchTypeButtonActive: {
        borderColor: colors.primary.green,
        backgroundColor: `${colors.primary.green}15`,
    },
    matchTypeText: {
        fontSize: typography.fontSize.md,
        color: colors.text.secondary,
        fontWeight: typography.fontWeight.medium,
    },
    matchTypeTextActive: {
        color: colors.primary.green,
        fontWeight: typography.fontWeight.bold,
    },
    courtTypeButton: {
        flex: 1,
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    timeRangeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    timeRangeButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background.card,
    },
    skillRangeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    skillInputContainer: {
        flex: 1,
    },
    skillInputLabel: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        marginBottom: spacing.xs,
    },
    skillInput: {
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        fontSize: typography.fontSize.md,
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    skillRangeSeparator: {
        fontSize: typography.fontSize.md,
        color: colors.text.secondary,
        marginTop: 20,
    },
    submitButton: {
        backgroundColor: colors.primary.green,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: colors.text.light,
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
    },
    cancelButton: {
        padding: spacing.md,
        alignItems: 'center',
        marginTop: spacing.md,
    },
    cancelButtonText: {
        color: colors.text.secondary,
        fontSize: typography.fontSize.md,
    },
    locationInputRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.xs,
    },
    detectButton: {
        backgroundColor: colors.primary.green,
        paddingHorizontal: spacing.md,
        justifyContent: 'center',
        borderRadius: borderRadius.md,
    },
    detectButtonText: {
        color: colors.text.light,
        fontSize: typography.fontSize.xs,
        fontWeight: 'bold',
    },
    mapPickerButton: {
        backgroundColor: colors.background.secondary,
        borderWidth: 1,
        borderColor: colors.primary.green,
        borderRadius: borderRadius.md,
        padding: spacing.sm,
        alignItems: 'center',
        marginTop: spacing.xs,
    },
    mapPickerButtonText: {
        color: colors.primary.green,
        fontSize: typography.fontSize.sm,
        fontWeight: 'bold',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.background.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: typography.fontSize.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
    },
    modalClose: {
        fontSize: typography.fontSize.md,
        color: colors.primary.green,
        fontWeight: 'bold',
    },
    map: {
        flex: 1,
    },
    mapInstructions: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    instructionText: {
        color: '#fff',
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
    },
});

export default CreateMatchRequestScreen;

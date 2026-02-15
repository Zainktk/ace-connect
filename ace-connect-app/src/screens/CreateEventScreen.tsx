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
    Image,
    Platform
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme/index';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CreateEventScreen = ({ navigation }: any) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [latitude, setLatitude] = useState<number | undefined>(undefined);
    const [longitude, setLongitude] = useState<number | undefined>(undefined);
    const [price, setPrice] = useState('');
    const [maxParticipants, setMaxParticipants] = useState('');
    const [skillLevelMin, setSkillLevelMin] = useState('');
    const [skillLevelMax, setSkillLevelMax] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            const currentDate = selectedDate;
            // Keep the time from the current date state
            currentDate.setHours(date.getHours());
            currentDate.setMinutes(date.getMinutes());
            setDate(currentDate);
        }
    };

    const onTimeChange = (event: any, selectedDate?: Date) => {
        setShowTimePicker(Platform.OS === 'ios');
        if (selectedDate) {
            const currentDate = date;
            currentDate.setHours(selectedDate.getHours());
            currentDate.setMinutes(selectedDate.getMinutes());
            setDate(new Date(currentDate)); // Create new date object to trigger re-render
        }
    };

    const handleSubmit = async () => {
        if (!title.trim() || !location.trim() || !description.trim()) {
            Alert.alert('Error', 'Please fill in all required fields (Title, Location, Description)');
            return;
        }

        setLoading(true);
        try {
            await api.post('/events', {
                title: title.trim(),
                description: description.trim(),
                eventDate: date.toISOString(),
                location: location.trim(),
                price: price ? parseFloat(price) : 0,
                maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
                skillLevelMin: skillLevelMin ? parseFloat(skillLevelMin) : null,
                skillLevelMax: skillLevelMax ? parseFloat(skillLevelMax) : null,
                imageUrl: imageUrl.trim() || null
            });

            Alert.alert('Success', 'Event created successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            console.error('Create event error:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to create event');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.headerTitle}>Host an Event</Text>
            <Text style={styles.headerSubtitle}>Create a tournament, social, or match day</Text>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Event Title *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., Summer Singles Open"
                    placeholderTextColor={colors.text.muted}
                    value={title}
                    onChangeText={setTitle}
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe the event format, rules, etc."
                    placeholderTextColor={colors.text.muted}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                />
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Date & Time *</Text>
                <View style={styles.dateTimeRow}>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={styles.dateButtonText}>
                            📅 {date.toLocaleDateString()}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowTimePicker(true)}
                    >
                        <Text style={styles.dateButtonText}>
                            ⏰ {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </TouchableOpacity>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={date}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                        minimumDate={new Date()}
                    />
                )}

                {showTimePicker && (
                    <DateTimePicker
                        value={date}
                        mode="time"
                        display="default"
                        onChange={onTimeChange}
                    />
                )}
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Location *</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="e.g., Central Park Tennis Center"
                        placeholderTextColor={colors.text.muted}
                        value={location}
                        onChangeText={setLocation}
                    />
                    <TouchableOpacity
                        style={styles.mapButton}
                        onPress={() => navigation.navigate('LocationSelect', {
                            onSelect: (data: any) => {
                                setLocation(data.address);
                                setLatitude(data.latitude);
                                setLongitude(data.longitude);
                            }
                        })}
                    >
                        <Text style={styles.mapButtonText}>🗺️ Map</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
                    <Text style={styles.label}>Price ($)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        placeholderTextColor={colors.text.muted}
                        value={price}
                        onChangeText={setPrice}
                        keyboardType="decimal-pad"
                    />
                </View>

                <View style={[styles.formGroup, { flex: 1, marginLeft: spacing.sm }]}>
                    <Text style={styles.label}>Max Players</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g., 16"
                        placeholderTextColor={colors.text.muted}
                        value={maxParticipants}
                        onChangeText={setMaxParticipants}
                        keyboardType="number-pad"
                    />
                </View>
            </View>

            <Text style={styles.sectionLabel}>Skill Level Range (Optional)</Text>
            <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1, marginRight: spacing.sm }]}>
                    <Text style={styles.label}>Min Rating</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="1.0"
                        placeholderTextColor={colors.text.muted}
                        value={skillLevelMin}
                        onChangeText={setSkillLevelMin}
                        keyboardType="decimal-pad"
                    />
                </View>

                <View style={[styles.formGroup, { flex: 1, marginLeft: spacing.sm }]}>
                    <Text style={styles.label}>Max Rating</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="7.0"
                        placeholderTextColor={colors.text.muted}
                        value={skillLevelMax}
                        onChangeText={setSkillLevelMax}
                        keyboardType="decimal-pad"
                    />
                </View>
            </View>

            <View style={styles.formGroup}>
                <Text style={styles.label}>Cover Image URL (Optional)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="https://..."
                    placeholderTextColor={colors.text.muted}
                    value={imageUrl}
                    onChangeText={setImageUrl}
                    autoCapitalize="none"
                />
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.previewImage} resizeMode="cover" />
                ) : null}
            </View>

            <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color={colors.text.light} />
                ) : (
                    <Text style={styles.submitButtonText}>Create Event</Text>
                )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
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
    headerTitle: {
        fontSize: typography.fontSize.xxl,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    headerSubtitle: {
        fontSize: typography.fontSize.md,
        color: colors.text.secondary,
        marginBottom: spacing.xl,
    },
    formGroup: {
        marginBottom: spacing.md,
    },
    label: {
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    sectionLabel: {
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
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
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dateTimeRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    dateButton: {
        flex: 1,
        backgroundColor: colors.background.card,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    dateButtonText: {
        color: colors.text.primary,
        fontSize: typography.fontSize.md,
    },
    previewImage: {
        width: '100%',
        height: 150,
        borderRadius: borderRadius.md,
        marginTop: spacing.sm,
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
    mapButton: {
        backgroundColor: colors.primary.green,
        paddingHorizontal: spacing.md,
        justifyContent: 'center',
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    mapButtonText: {
        color: colors.text.light,
        fontWeight: 'bold',
    },
});

export default CreateEventScreen;

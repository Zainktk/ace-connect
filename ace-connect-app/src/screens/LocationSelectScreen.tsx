import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    SafeAreaView,
    ActivityIndicator,
    Platform
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import { colors, typography, spacing, borderRadius } from '../theme/index';
import { reverseGeocode } from '../config';

const LocationSelectScreen = ({ navigation, route }: any) => {
    // Get initial coordinates or default to NYC
    const initialLat = route.params?.initialLat || 40.7128;
    const initialLng = route.params?.initialLng || -74.0060;

    const [region, setRegion] = useState({
        latitude: initialLat,
        longitude: initialLng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });

    const [marker, setMarker] = useState({
        latitude: initialLat,
        longitude: initialLng,
    });

    const [locationString, setLocationString] = useState(`${initialLat.toFixed(4)}, ${initialLng.toFixed(4)}`);
    const [loading, setLoading] = useState(false);

    // Update string when marker moves
    useEffect(() => {
        // Initial reverse geocode on load if needed, or just show coords first
        // We can debounce this or just rely on drag end for API calls to save quota
    }, [marker]);

    const updateAddress = async (lat: number, lng: number) => {
        setLoading(true);
        const address = await reverseGeocode(lat, lng);
        setLoading(false);
        if (address) {
            setLocationString(address);
        } else {
            setLocationString(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        }
    };

    const handleMapPress = (e: any) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setMarker({ latitude, longitude });
        updateAddress(latitude, longitude);
    };

    const handleDragEnd = (e: any) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        setMarker({ latitude, longitude });
        updateAddress(latitude, longitude);
    };

    const detectLocation = () => {
        setLoading(true);
        Geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setRegion({
                    ...region,
                    latitude,
                    longitude,
                });
                setMarker({ latitude, longitude });
                updateAddress(latitude, longitude);
                setLoading(false);
            },
            (error) => {
                Alert.alert('Error', 'Could not detect location.');
                setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 15000 }
        );
    };

    const handleConfirm = () => {
        // Return data to previous screen
        if (route.params?.onSelect) {
            route.params.onSelect({
                latitude: marker.latitude,
                longitude: marker.longitude,
                address: locationString, // In real app, this would be reverse geocoded address
            });
        }
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            <MapView
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                style={styles.map}
                region={region}
                onRegionChangeComplete={setRegion} // Use Complete to avoid jitter
                onPress={handleMapPress}
            >
                <Marker
                    coordinate={marker}
                    draggable
                    onDragEnd={handleDragEnd}
                    title="Selected Location"
                    description={locationString}
                />
            </MapView>

            <SafeAreaView style={styles.overlay}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                        <Text style={styles.closeButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Pick Location</Text>
                    <View style={{ width: 60 }} />
                </View>

                <View style={styles.footer}>
                    <View style={styles.addressBox}>
                        <Text style={styles.addressLabel}>Selected Coordinates:</Text>
                        <Text style={styles.addressText}>{locationString}</Text>
                        <Text style={styles.hintText}>Tap map or drag pin to adjust</Text>
                    </View>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.detectButton}
                            onPress={detectLocation}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color={colors.primary.green} /> : <Text style={styles.detectButtonText}>📍 Detect Me</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                            <Text style={styles.confirmButtonText}>Confirm Location</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    overlay: {
        flex: 1,
        justifyContent: 'space-between',
        pointerEvents: 'box-none', // Allow touches to pass through to map where no views exist
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        backgroundColor: 'rgba(255,255,255,0.9)',
        margin: spacing.md,
        borderRadius: borderRadius.lg,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    title: {
        fontSize: typography.fontSize.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        paddingVertical: spacing.md,
    },
    closeButton: {
        padding: spacing.sm,
    },
    closeButtonText: {
        color: colors.error,
        fontWeight: '600',
    },
    footer: {
        backgroundColor: '#fff',
        padding: spacing.lg,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 10,
    },
    addressBox: {
        marginBottom: spacing.lg,
        alignItems: 'center',
    },
    addressLabel: {
        fontSize: typography.fontSize.xs,
        color: colors.text.secondary,
        textTransform: 'uppercase',
        marginBottom: spacing.xs,
    },
    addressText: {
        fontSize: typography.fontSize.lg,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    hintText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.muted,
        fontStyle: 'italic',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    detectButton: {
        flex: 1,
        backgroundColor: colors.background.secondary,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    detectButtonText: {
        color: colors.primary.green,
        fontWeight: 'bold',
    },
    confirmButton: {
        flex: 2,
        backgroundColor: colors.primary.green,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        shadowColor: colors.primary.green,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 5,
    },
    confirmButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: typography.fontSize.md,
    },
});

export default LocationSelectScreen;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { colors, typography, spacing, borderRadius } from '../theme/index';
import api from '../services/api';
import MatchRequestCard from '../components/MatchRequestCard';
import InvitationCard from '../components/InvitationCard';

type Tab = 'find' | 'map' | 'my-requests' | 'invitations';

const MatchmakingScreen = ({ navigation }: any) => {
    const [activeTab, setActiveTab] = useState<Tab>('find');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Find Players tab data
    const [availableRequests, setAvailableRequests] = useState<any[]>([]);

    // My Requests tab data
    const [myRequests, setMyRequests] = useState<any[]>([]);

    // Invitations tab data
    const [invitations, setInvitations] = useState<any[]>([]);

    // Map data
    const mapRef = useRef<MapView>(null);
    const [region, setRegion] = useState({
        latitude: 40.7128, // Default to NYC
        longitude: -74.0060,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });

    // Filters
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filters, setFilters] = useState({
        courtType: 'any',
        timeRange: '',
        location: ''
    });

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'find') {
                await loadAvailableRequests();
            } else if (activeTab === 'my-requests') {
                await loadMyRequests();
            } else if (activeTab === 'invitations') {
                await loadInvitations();
            }
        } catch (error) {
            console.error('Load data error:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAvailableRequests = async () => {
        try {
            const params = new URLSearchParams();
            if (activeTab === 'map') {
                params.append('lat', region.latitude.toString());
                params.append('lng', region.longitude.toString());
                params.append('radius', '50'); // 50km radius for map search
            }
            if (filters.courtType !== 'any') params.append('courtType', filters.courtType);
            if (filters.timeRange) params.append('timeRange', filters.timeRange);
            if (filters.location) params.append('location', filters.location);

            const response = await api.get(`/matchmaking/requests?${params.toString()}`);
            setAvailableRequests(response.data);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to load requests');
        }
    };

    const loadMyRequests = async () => {
        try {
            const response = await api.get('/matchmaking/requests/my');
            setMyRequests(response.data);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to load your requests');
        }
    };

    const loadInvitations = async () => {
        try {
            const response = await api.get('/matchmaking/invitations');
            setInvitations(response.data);
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to load invitations');
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [activeTab]);

    const handleRequestPress = (request: any) => {
        navigation.navigate('MatchRequestDetail', { requestId: request.id });
    };

    const handleInvitationPress = (invitation: any) => {
        navigation.navigate('InvitationDetail', { invitationId: invitation.id });
    };

    const handleCreateRequest = () => {
        navigation.navigate('CreateMatchRequest');
    };

    const handleDeleteRequest = async (requestId: number) => {
        Alert.alert(
            'Delete Request',
            'Are you sure you want to delete this match request?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/matchmaking/requests/${requestId}`);
                            Alert.alert('Success', 'Request deleted successfully');
                            loadMyRequests();
                        } catch (error: any) {
                            Alert.alert('Error', error.response?.data?.error || 'Failed to delete request');
                        }
                    }
                }
            ]
        );
    };

    const renderTabButton = (tab: Tab, label: string) => (
        <TouchableOpacity
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
        >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎾</Text>
            <Text style={styles.emptyTitle}>
                {activeTab === 'find' && 'No Match Requests'}
                {activeTab === 'my-requests' && 'No Active Requests'}
                {activeTab === 'invitations' && 'No Invitations'}
            </Text>
            <Text style={styles.emptyText}>
                {activeTab === 'find' && 'Check back later for new match requests'}
                {activeTab === 'my-requests' && 'Create a request to find tennis partners'}
                {activeTab === 'invitations' && 'Invitations will appear here'}
            </Text>
            {activeTab === 'my-requests' && (
                <TouchableOpacity style={styles.createButton} onPress={handleCreateRequest}>
                    <Text style={styles.createButtonText}>Create Request</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderContent = () => {
        if (loading && !refreshing) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary.green} />
                </View>
            );
        }

        if (activeTab === 'map') {
            return (
                <View style={styles.mapContainer}>
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        initialRegion={region}
                        onRegionChangeComplete={setRegion}
                    >
                        {availableRequests
                            .filter(req => req.latitude && req.longitude)
                            .map((req) => (
                                <Marker
                                    key={req.id}
                                    coordinate={{
                                        latitude: parseFloat(req.latitude),
                                        longitude: parseFloat(req.longitude),
                                    }}
                                    pinColor={colors.primary.green}
                                >
                                    <Callout onPress={() => handleRequestPress(req)}>
                                        <View style={styles.callout}>
                                            <Text style={styles.calloutTitle}>{req.match_type.toUpperCase()}</Text>
                                            <Text style={styles.calloutText}>{req.name}</Text>
                                            <Text style={styles.calloutText}>{req.location}</Text>
                                            <Text style={styles.calloutLink}>View Details</Text>
                                        </View>
                                    </Callout>
                                </Marker>
                            ))}
                    </MapView>
                    <TouchableOpacity
                        style={styles.searchHereButton}
                        onPress={loadAvailableRequests}
                    >
                        <Text style={styles.searchHereText}>Search This Area</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (activeTab === 'find') {
            return (
                <FlatList
                    data={availableRequests}
                    renderItem={({ item }) => (
                        <MatchRequestCard
                            request={item}
                            onPress={() => handleRequestPress(item)}
                            showCompatibility={true}
                        />
                    )}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={renderEmptyState}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                />
            );
        }

        if (activeTab === 'my-requests') {
            return (
                <FlatList
                    data={myRequests}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.myRequestCard}
                            onLongPress={() => handleDeleteRequest(item.id)}
                        >
                            <View style={styles.myRequestHeader}>
                                <Text style={styles.myRequestType}>
                                    {item.match_type === 'singles' ? '🎾 Singles' : '🎾🎾 Doubles'}
                                </Text>
                                <View style={[
                                    styles.statusBadge,
                                    { backgroundColor: item.status === 'open' ? colors.success : colors.text.muted }
                                ]}>
                                    <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                                </View>
                            </View>
                            <Text style={styles.myRequestLocation}>{item.location || 'Any location'}</Text>
                            <Text style={styles.myRequestDate}>
                                {item.preferred_date
                                    ? new Date(item.preferred_date).toLocaleDateString()
                                    : 'Flexible date'}
                            </Text>
                            <Text style={styles.myRequestInvitations}>
                                {item.invitation_count || 0} invitation(s) received
                            </Text>
                        </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={renderEmptyState}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                />
            );
        }

        if (activeTab === 'invitations') {
            return (
                <FlatList
                    data={invitations}
                    renderItem={({ item }) => (
                        <InvitationCard
                            invitation={item}
                            onPress={() => handleInvitationPress(item)}
                            type="received"
                        />
                    )}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={renderEmptyState}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                />
            );
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Matchmaking</Text>
                <View style={styles.headerButtons}>
                    {activeTab === 'find' && (
                        <TouchableOpacity
                            style={styles.filterButton}
                            onPress={() => setFilterModalVisible(true)}
                        >
                            <Text style={styles.filterButtonText}>🔍 Filters</Text>
                        </TouchableOpacity>
                    )}
                    {activeTab === 'my-requests' && (
                        <TouchableOpacity style={styles.addButton} onPress={handleCreateRequest}>
                            <Text style={styles.addButtonText}>+ New</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.tabContainer}>
                {renderTabButton('find', 'List View')}
                {renderTabButton('map', 'Map View')}
                {renderTabButton('my-requests', 'My Requests')}
                {renderTabButton('invitations', 'Invitations')}
            </View>

            {renderContent()}

            <Modal
                visible={filterModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setFilterModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Filter Match Requests</Text>

                        <ScrollView style={styles.modalForm}>
                            <Text style={styles.label}>Court Type</Text>
                            <View style={styles.filterGrid}>
                                {['any', 'hard', 'clay', 'grass', 'indoor'].map((type) => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[
                                            styles.filterOption,
                                            filters.courtType === type && styles.filterOptionActive
                                        ]}
                                        onPress={() => setFilters({ ...filters, courtType: type })}
                                    >
                                        <Text style={[
                                            styles.filterOptionText,
                                            filters.courtType === type && styles.filterOptionTextActive
                                        ]}>
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.label}>Time Preference</Text>
                            <View style={styles.filterGrid}>
                                {['Morning', 'Afternoon', 'Evening', 'Night'].map((time) => (
                                    <TouchableOpacity
                                        key={time}
                                        style={[
                                            styles.filterOption,
                                            filters.timeRange === time && styles.filterOptionActive
                                        ]}
                                        onPress={() => setFilters({ ...filters, timeRange: filters.timeRange === time ? '' : time })}
                                    >
                                        <Text style={[
                                            styles.filterOptionText,
                                            filters.timeRange === time && styles.filterOptionTextActive
                                        ]}>
                                            {time}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.resetButton]}
                                onPress={() => {
                                    setFilters({ courtType: 'any', timeRange: '', location: '' });
                                }}
                            >
                                <Text style={styles.resetButtonText}>Reset</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.applyButton]}
                                onPress={() => {
                                    setFilterModalVisible(false);
                                    loadAvailableRequests();
                                }}
                            >
                                <Text style={styles.applyButtonText}>Apply Filters</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    title: {
        fontSize: typography.fontSize.xxl,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
    },
    addButton: {
        backgroundColor: colors.primary.green,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    addButtonText: {
        color: colors.text.light,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.bold,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    tabButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabButtonActive: {
        borderBottomColor: colors.primary.green,
    },
    tabText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        fontWeight: typography.fontWeight.medium,
    },
    tabTextActive: {
        color: colors.primary.green,
        fontWeight: typography.fontWeight.bold,
    },
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl * 2,
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
        marginBottom: spacing.lg,
    },
    createButton: {
        backgroundColor: colors.primary.green,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
    },
    createButtonText: {
        color: colors.text.light,
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.bold,
    },
    myRequestCard: {
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
    myRequestHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    myRequestType: {
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
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
    myRequestLocation: {
        fontSize: typography.fontSize.md,
        color: colors.text.secondary,
        marginBottom: spacing.xs,
    },
    myRequestDate: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
        marginBottom: spacing.xs,
    },
    myRequestInvitations: {
        fontSize: typography.fontSize.sm,
        color: colors.primary.green,
        fontWeight: typography.fontWeight.medium,
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterButton: {
        backgroundColor: colors.background.secondary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: spacing.sm,
    },
    filterButtonText: {
        color: colors.text.primary,
        fontSize: typography.fontSize.sm,
        fontWeight: typography.fontWeight.medium,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.background.card,
        borderTopLeftRadius: borderRadius.xxl,
        borderTopRightRadius: borderRadius.xxl,
        padding: spacing.xl,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: typography.fontSize.xl,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    modalForm: {
        marginBottom: spacing.lg,
    },
    label: {
        fontSize: typography.fontSize.md,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
        marginBottom: spacing.sm,
        marginTop: spacing.md,
    },
    filterGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -spacing.xs,
    },
    filterOption: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        borderColor: colors.border,
        margin: spacing.xs,
        backgroundColor: colors.background.secondary,
    },
    filterOptionActive: {
        backgroundColor: colors.primary.green,
        borderColor: colors.primary.green,
    },
    filterOptionText: {
        fontSize: typography.fontSize.sm,
        color: colors.text.secondary,
    },
    filterOptionTextActive: {
        color: colors.text.light,
        fontWeight: typography.fontWeight.bold,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.md,
    },
    modalButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    resetButton: {
        backgroundColor: colors.background.secondary,
        marginRight: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    resetButtonText: {
        color: colors.text.primary,
        fontWeight: 'bold',
    },
    applyButton: {
        backgroundColor: colors.primary.green,
    },
    applyButtonText: {
        color: colors.text.light,
        fontWeight: 'bold',
    },
    mapContainer: {
        flex: 1,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    searchHereButton: {
        position: 'absolute',
        top: spacing.md,
        alignSelf: 'center',
        backgroundColor: colors.primary.green,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    searchHereText: {
        color: colors.text.light,
        fontWeight: 'bold',
        fontSize: typography.fontSize.sm,
    },
    callout: {
        width: 150,
        padding: spacing.xs,
    },
    calloutTitle: {
        fontWeight: 'bold',
        color: colors.primary.green,
        marginBottom: 2,
    },
    calloutText: {
        fontSize: typography.fontSize.xs,
        color: colors.text.primary,
    },
    calloutLink: {
        fontSize: typography.fontSize.xs,
        color: colors.primary.green,
        marginTop: 4,
        fontWeight: 'bold',
    },
});

export default MatchmakingScreen;

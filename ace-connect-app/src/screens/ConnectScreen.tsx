import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Event {
    id: number;
    title: string;
    description: string;
    event_date: string;
    location: string;
    price: number;
    image_url: string;
    organizer_name: string;
    is_joined?: boolean;
    participant_count: number;
    max_participants: number | null;
}

const ConnectScreen = () => {
    const navigation = useNavigation();
    const { token, user } = useAuth();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const response = await api.get('/events');
            setEvents(response.data);
        } catch (error) {
            console.error('Fetch events error:', error);
            // Don't alert on every focus if it fails silently, or use a toast
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchEvents();
        });
        return unsubscribe;
    }, [navigation]);

    const handleJoinEvent = (event: Event) => {
        const spotsLeft = event.max_participants ? event.max_participants - event.participant_count : null;

        if (spotsLeft !== null && spotsLeft <= 0) {
            Alert.alert("Event Full", "Sorry, this event has reached its maximum capacity.");
            return;
        }

        Alert.alert(
            "Join Event",
            `Do you want to join "${event.title}" for $${typeof event.price === 'string' ? parseFloat(event.price).toFixed(2) : event.price.toFixed(2)}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Join Now",
                    onPress: async () => {
                        try {
                            await api.post(`/events/${event.id}/join`);
                            Alert.alert("Success", "You have joined the event!");
                            fetchEvents();
                        } catch (error: any) {
                            Alert.alert("Error", error.response?.data?.error || "Failed to join event");
                        }
                    }
                }
            ]
        );
    };

    const renderEventItem = ({ item }: { item: Event }) => {
        const isFull = item.max_participants ? item.participant_count >= item.max_participants : false;
        const spotsDisplay = item.max_participants
            ? `${item.participant_count}/${item.max_participants} spots`
            : `${item.participant_count} joined`;

        return (
            <View style={styles.card}>
                {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.image} />
                ) : (
                    <View style={[styles.image, { backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' }]}>
                        <Text style={{ fontSize: 40 }}>🎾</Text>
                    </View>
                )}
                <View style={styles.cardContent}>
                    <View style={styles.row}>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={[styles.spots, isFull && !item.is_joined && { color: '#dc3545' }]}>
                            {spotsDisplay}
                        </Text>
                    </View>

                    {user?.role !== 'organizer' && (
                        <Text style={styles.organizer}>by {item.organizer_name}</Text>
                    )}

                    <View style={styles.row}>
                        <Text style={styles.detail}>📅 {new Date(item.event_date).toLocaleDateString()} {new Date(item.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.detail}>📍 {item.location}</Text>
                    </View>

                    <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

                    <View style={styles.footer}>
                        <Text style={styles.price}>${typeof item.price === 'string' ? parseFloat(item.price).toFixed(2) : item.price.toFixed(2)}</Text>

                        {user?.role === 'organizer' ? (
                            <View style={[styles.joinButton, { backgroundColor: '#e9ecef' }]}>
                                <Text style={[styles.joinButtonText, { color: '#495057' }]}>Your Event</Text>
                            </View>
                        ) : item.is_joined ? (
                            <View style={[styles.joinButton, { backgroundColor: '#6c757d' }]}>
                                <Text style={styles.joinButtonText}>Joined</Text>
                            </View>
                        ) : isFull ? (
                            <View style={[styles.joinButton, { backgroundColor: '#e9ecef' }]}>
                                <Text style={[styles.joinButtonText, { color: '#dc3545' }]}>Full</Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.joinButton}
                                onPress={() => handleJoinEvent(item)}
                            >
                                <Text style={styles.joinButtonText}>Join</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>
                        {user?.role === 'organizer' ? 'My Hosted Events' : 'Connect'}
                    </Text>
                    <Text style={styles.headerSubtitle}>
                        {user?.role === 'organizer' ? 'Manage your tournaments' : 'Find Tournaments & Events'}
                    </Text>
                </View>
                {user?.role === 'organizer' && (
                    <TouchableOpacity
                        style={styles.createButton}
                        onPress={() => (navigation as any).navigate('CreateEvent')}
                    >
                        <Text style={styles.createButtonText}>+ Host</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={events}
                renderItem={renderEventItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchEvents} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No events found</Text>
                        <Text style={styles.emptySubtext}>Be the first to host one!</Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#666',
        marginTop: 5,
    },
    createButton: {
        backgroundColor: '#00A86B',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    createButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    listContent: {
        padding: 15,
        flexGrow: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    emptySubtext: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: 150,
        resizeMode: 'cover',
    },
    cardContent: {
        padding: 15,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
        flex: 1,
    },
    spots: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    organizer: {
        fontSize: 14,
        color: '#00A86B',
        marginBottom: 10,
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    detail: {
        fontSize: 14,
        color: '#666',
    },
    description: {
        fontSize: 14,
        color: '#444',
        lineHeight: 20,
        marginBottom: 15,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 5,
    },
    price: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    joinButton: {
        backgroundColor: '#00A86B',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
    },
    joinButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
});

export default ConnectScreen;

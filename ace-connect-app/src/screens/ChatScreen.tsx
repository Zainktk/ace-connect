import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { colors, typography, spacing, borderRadius } from '../theme/index';
import { getSocketUrl } from '../config';

// Ported to config.ts
const SOCKET_URL = getSocketUrl();

const ChatScreen = ({ route }: any) => {
    const { matchId, opponentName } = route.params;
    const { user } = useAuth();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const socket = useRef<any>(null);
    const flatListRef = useRef<any>(null);

    useEffect(() => {
        fetchMessages();

        // Initialize socket
        socket.current = io(SOCKET_URL);

        socket.current.on('connect', () => {
            console.log('Connected to socket server');
            socket.current.emit('join_match', matchId);
        });

        socket.current.on('new_message', (message: any) => {
            setMessages((prev) => [...prev, message]);
        });

        return () => {
            if (socket.current) {
                socket.current.disconnect();
            }
        };
    }, [matchId]);

    const fetchMessages = async () => {
        try {
            const response = await api.get(`/matchmaking/matches/${matchId}/messages`);
            setMessages(response.data);
        } catch (error) {
            console.error('Fetch messages error:', error);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = () => {
        if (!newMessage.trim() || !user) return;

        const messageData = {
            matchId,
            senderId: user.id,
            content: newMessage.trim(),
        };

        socket.current.emit('send_message', messageData);
        setNewMessage('');
    };

    const renderMessage = ({ item }: { item: any }) => {
        const isMine = item.sender_id === user?.id;
        return (
            <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}>
                <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>
                    {item.content}
                </Text>
                <Text style={styles.messageTime}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            {loading ? (
                <ActivityIndicator style={styles.loader} color={colors.primary.green} />
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.messageList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />
            )}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    value={newMessage}
                    onChangeText={setNewMessage}
                    multiline
                />
                <TouchableOpacity
                    style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
                    onPress={sendMessage}
                    disabled={!newMessage.trim()}
                >
                    <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.secondary,
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
    },
    messageList: {
        padding: spacing.md,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.sm,
    },
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: colors.primary.green,
        borderBottomRightRadius: borderRadius.none,
    },
    theirMessage: {
        alignSelf: 'flex-start',
        backgroundColor: colors.background.card,
        borderBottomLeftRadius: borderRadius.none,
        borderWidth: 1,
        borderColor: colors.border,
    },
    messageText: {
        fontSize: typography.fontSize.base,
    },
    myMessageText: {
        color: colors.text.light,
    },
    theirMessageText: {
        color: colors.text.primary,
    },
    messageTime: {
        fontSize: 10,
        color: colors.text.secondary,
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: spacing.md,
        backgroundColor: colors.background.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: colors.background.secondary,
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        fontSize: typography.fontSize.base,
        color: colors.text.primary,
        maxHeight: 100,
    },
    sendButton: {
        marginLeft: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: colors.primary.green,
        borderRadius: borderRadius.md,
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    sendButtonText: {
        color: colors.text.light,
        fontWeight: typography.fontWeight.bold,
    },
});

export default ChatScreen;

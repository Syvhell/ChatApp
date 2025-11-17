import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TextInput, FlatList, TouchableOpacity,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import io from 'socket.io-client';
import Constants from 'expo-constants';

const { backendUrl } = Constants.expoConfig.extra;

export default function ChatBoxScreen({ route }) {
  const { chatId, name, avatar } = route.params;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef();

  const socketRef = useRef(null);

  // Load messages
  const fetchMessages = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${backendUrl}/api/chat/${chatId}?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMessages(data);
      flatListRef.current?.scrollToEnd({ animated: false });
    } catch (err) {
      console.error('Fetch messages error:', err);
    }
  };

  // Setup socket
  useEffect(() => {
    fetchMessages();

    const initSocket = async () => {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) return;
      const user = JSON.parse(userData);

      socketRef.current = io(backendUrl, { transports: ['websocket'], autoConnect: true });

      socketRef.current.on('connect', () => {
        console.log('Socket connected:', socketRef.current.id);
        socketRef.current.emit('join', user._id);
      });

      socketRef.current.on('onlineStatus', ({ userId, online }) => {
        if (userId === chatId.toString()) setIsOnline(online);
      });

      socketRef.current.on('typing', ({ userId, typing }) => {
        if (userId === chatId.toString()) setIsTyping(typing);
      });

      socketRef.current.on('receiveMessage', (msg) => {
        setMessages(prev => [...prev, msg]);
        flatListRef.current?.scrollToEnd({ animated: true });
      });

      socketRef.current.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsOnline(false);
        setIsTyping(false);
      });
    };

    initSocket();

    return () => {
      socketRef.current?.off('receiveMessage');
      socketRef.current?.off('typing');
      socketRef.current?.off('onlineStatus');
      socketRef.current?.disconnect();
    };
  }, []);

  const handleTyping = (text) => {
    setInput(text);
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', { chatId, typing: text.length > 0 });
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const tempMessage = {
      _id: Date.now().toString(),
      sender: { _id: "me", avatar },
      text: input,
      type: "text",
      replyTo: replyTo || null,
    };
    setMessages(prev => [...prev, tempMessage]);
    setInput('');
    setReplyTo(null);

    const token = await AsyncStorage.getItem('token');

    // Emit message via socket
    socketRef.current?.emit('sendMessage', {
      receiverId: chatId,
      text: tempMessage.text,
      type: "text",
      replyTo: tempMessage.replyTo?._id || null,
    });

    // Save message via API
    try {
      await fetch(`${backendUrl}/api/chat/send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: chatId,
          text: tempMessage.text,
          replyTo: tempMessage.replyTo?._id || null,
        }),
      });
    } catch (err) {
      console.error('Send message error:', err);
    }
  };

 const renderMessageItem = ({ item }) => {
    if (!item) return null; // safety check

    // Typing indicator
    if (item.type === 'typing') {
      return (
        <View style={{ padding: 6, paddingLeft: 12 }}>
          <Text style={{ color: '#aaa', fontStyle: 'italic' }}>{item.text}</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[
          styles.messageWrapper,
          item.sender?._id === chatId ? styles.theirMessage : styles.myMessage
        ]}
        onLongPress={() => setReplyTo(item)}
      >
        {item.replyTo && (
          <View style={styles.replyContainer}>
            <Text style={styles.replyLabel}>Replying to:</Text>
            <Text style={styles.replyText}>{item.replyTo?.text || ''}</Text>
          </View>
        )}
        <View style={styles.messageContent}>
          <Text style={styles.messageText}>{item.text}</Text>
        </View>
      </TouchableOpacity>
    );
  };


  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#121212' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>

          <FlatList
            ref={flatListRef}
            data={[
              ...messages,
              isTyping
                ? { _id: 'typing', sender: { _id: chatId }, text: `${name} is typing...`, type: 'typing' }
                : null
            ].filter(Boolean)}
            keyExtractor={item => (item._id ? item._id.toString() : Date.now().toString() + Math.random())}
            renderItem={renderMessageItem}
            contentContainerStyle={{ padding: 10, paddingBottom: 80 }}
          />

          {replyTo && (
            <View style={styles.replyPreview}>
              <Text style={styles.replyLabelPreview}>Replying to:</Text>
              <Text style={styles.replyTextPreview}>{replyTo.text}</Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <Ionicons name="close-circle" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputWrapper}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={handleTyping}
                placeholder={`Message ${name}`}
                placeholderTextColor="#aaa"
              />
              <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                <Ionicons name="send" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  messageWrapper: { maxWidth: '75%', padding: 10, borderRadius: 12, marginVertical: 5 },
  myMessage: { backgroundColor: '#0078fe', alignSelf: 'flex-end', borderTopRightRadius: 4 },
  theirMessage: { backgroundColor: '#1e1e1e', alignSelf: 'flex-start', borderTopLeftRadius: 4 },
  messageText: { fontSize: 16, color: '#fff' },
  messageContent: { flexDirection: 'row', alignItems: 'center' },
  messageAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
  inputWrapper: { borderTopWidth: 1, borderColor: '#333', backgroundColor: '#1e1e1e', paddingBottom: Platform.OS === 'ios' ? 20 : 10 },
  inputContainer: { flexDirection: 'row', padding: 10, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: '#333', borderRadius: 25, paddingHorizontal: 15, marginRight: 8, height: 45, color: '#fff', backgroundColor: '#2a2a2a' },
  sendButton: { backgroundColor: '#0078fe', borderRadius: 25, width: 45, height: 45, justifyContent: 'center', alignItems: 'center', marginLeft: 5 },
  replyPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a2a', paddingHorizontal: 10, paddingVertical: 5 },
  replyLabelPreview: { fontWeight: 'bold', fontSize: 12, color: '#fff', marginRight: 5 },
  replyTextPreview: { flex: 1, fontSize: 12, color: '#ccc' },
  replyContainer: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 6, borderRadius: 8, marginBottom: 5 },
  replyLabel: { fontWeight: 'bold', fontSize: 12, color: '#fff' },
  replyText: { fontSize: 12, opacity: 0.8, color: '#ddd' },
});

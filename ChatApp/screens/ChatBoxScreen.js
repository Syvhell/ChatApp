import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TextInput, FlatList, TouchableOpacity,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard,
  Image, Alert, Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import io from 'socket.io-client';
import Constants from 'expo-constants';

const { backendUrl } = Constants.expoConfig.extra;
const { width } = Dimensions.get('window');

export default function ChatBoxScreen({ route, navigation }) {
  const { chatId, name, avatar } = route.params;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [seenMessages, setSeenMessages] = useState([]);
  
  const socket = useRef(io(`${backendUrl}`)).current;
  const flatListRef = useRef();

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${backendUrl}/api/chat/${chatId}`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMessages(data);
      flatListRef.current?.scrollToEnd({ animated: false });
    } catch (err) {
      console.error(err);
      Alert.alert("Error", err.message);
    }
  };

  // Socket setup
  useEffect(() => {
    fetchMessages();
    socket.emit("join", chatId);

    socket.on("onlineStatus", ({ userId, online }) => {
      if (userId === chatId) setIsOnline(online);
    });

    socket.on("messageSeen", ({ messageId }) => {
      setSeenMessages(prev => [...prev, messageId]);
    });

    socket.on("typing", ({ userId, typing }) => {
      if (userId === chatId) setIsTyping(typing);
    });

    socket.on("receiveMessage", (msg) => {
      setMessages(prev => [...prev, msg]);
      flatListRef.current?.scrollToEnd({ animated: true });
    });

    socket.on("receiveVoice", (msg) => {
      setMessages(prev => [...prev, msg]);
      flatListRef.current?.scrollToEnd({ animated: true });
    });

    return () => {
      socket.off("receiveMessage");
      socket.off("typing");
      socket.off("onlineStatus");
      socket.off("messageSeen");
      socket.off("receiveVoice");
    };
  }, []);

  // Typing
  const handleTyping = (text) => {
    setInput(text);
    socket.emit("typing", { chatId, typing: text.length > 0 });
  };

  // Send message
  const sendMessage = async () => {
    if (!input.trim()) return;

    const tempMessage = {
      _id: Date.now().toString(),
      sender: { _id: "me", avatar },
      text: input,
      type: "text",
      replyTo: replyTo ? { _id: replyTo._id, text: replyTo.text, sender: replyTo.sender } : null,
    };

    setMessages(prev => [...prev, tempMessage]);
    setInput('');
    setReplyTo(null);

    try {
      const token = await AsyncStorage.getItem("token");
      socket.emit("sendMessage", {
        receiverId: chatId,
        text: tempMessage.text,
        type: "text",
        replyTo: tempMessage.replyTo?._id || null,
      });

      await fetch(`${backendUrl}/api/chat/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          receiverId: chatId, 
          text: tempMessage.text, 
          replyTo: tempMessage.replyTo?._id || null 
        }),
      });

      socket.emit("seen", { chatId });
    } catch (err) {
      console.error(err);
    }
  };

  // Pick media (placeholder)
  const pickMedia = async (type) => {
    // Implement your media picker here if needed
  };

  // Render messages
  const renderMessageItem = ({ item }) => (
    <TouchableOpacity
      onLongPress={() => setReplyTo(item)}
      style={[
        styles.messageWrapper,
        item.sender._id === chatId ? styles.theirMessage : styles.myMessage
      ]}
    >
      {item.replyTo && (
        <View style={styles.replyPreview}>
          <Text style={styles.replyLabelPreview}>Replying to:</Text>
          <Text style={styles.replyTextPreview}>
            {item.replyTo.text || 'Message deleted'}
          </Text>
        </View>
      )}
      <View style={styles.messageContent}>
        <Image
          source={ item.sender.avatar ? { uri: item.sender.avatar } : { uri: "https://i.pravatar.cc/150" }}
          style={styles.messageAvatar}
        />
        {item.type === "text" && <Text style={styles.messageText}>{item.text}</Text>}
      </View>
      {item.sender._id === "me" && (
        <Text style={{ color: seenMessages.includes(item._id) ? "#4CAF50" : "#999", fontSize: 10 }}>
          {seenMessages.includes(item._id) ? "Seen" : "Delivered"}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#121212' }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 80}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#bbb", textAlign: "center", paddingTop: 10 }}>
            {isOnline ? "Active now 🟢" : "Offline ⚫"}
          </Text>

          {isTyping && (
            <Text style={{ color: "#aaa", padding: 6, paddingLeft: 12 }}>
              {name} is typing...
            </Text>
          )}

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id.toString()}
            contentContainerStyle={{ padding: 10, paddingBottom: 20 }}
            renderItem={renderMessageItem}
          />

          {/* Replying Preview */}
          {replyTo && (
            <View style={styles.replyPreview}>
              <Text style={styles.replyLabelPreview}>Replying to:</Text>
              <Text style={styles.replyTextPreview}>{replyTo.text}</Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <Ionicons name="close-circle" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* Input */}
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
              <TouchableOpacity style={styles.mediaButton} onPress={() => pickMedia('image')}>
                <Ionicons name="image" size={24} color="#0078fe" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  messageWrapper: { maxWidth: '75%', padding: 10, borderRadius: 12, marginVertical: 5 },
  myMessage: { backgroundColor: '#0078fe', alignSelf: 'flex-end', borderTopRightRadius: 4 },
  theirMessage: { backgroundColor: '#1e1e1e', alignSelf: 'flex-start', borderTopLeftRadius: 4 },
  messageText: { fontSize: 16, color: '#fff' },
  inputWrapper: { borderTopWidth: 1, borderColor: '#333', backgroundColor: '#1e1e1e', paddingBottom: Platform.OS === 'ios' ? 20 : 10 },
  replyPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a2a', paddingHorizontal: 10, paddingVertical: 5 },
  replyLabelPreview: { fontWeight: 'bold', fontSize: 12, color: '#fff', marginRight: 5 },
  replyTextPreview: { flex: 1, fontSize: 12, color: '#ccc' },
  inputContainer: { flexDirection: 'row', padding: 10, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: '#333', borderRadius: 25, paddingHorizontal: 15, marginRight: 8, height: 45, color: '#fff', backgroundColor: '#2a2a2a' },
  sendButton: { backgroundColor: '#0078fe', borderRadius: 25, width: 45, height: 45, justifyContent: 'center', alignItems: 'center', marginLeft: 5 },
  mediaButton: { backgroundColor: '#2a2a2a', borderRadius: 25, width: 45, height: 45, justifyContent: 'center', alignItems: 'center', marginLeft: 5 },
  messageContent: { flexDirection: 'row', alignItems: 'center' },
  messageAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
});

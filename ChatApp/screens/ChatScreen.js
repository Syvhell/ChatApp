import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const { backendUrl } = Constants.expoConfig.extra;

export default function ChatScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('token'); // JWT from login
      const response = await fetch(`${backendUrl}/api/chat/users`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
      setLoading(false);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

    const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.accountItem}
      onPress={() =>
        navigation.navigate('ChatBox', {
          chatId: item.id,
          name: item.username,
          avatar: item.avatar,
          active: item.active,
        })
      }
    >
      <View style={styles.avatarWrapper}>
        <Image
          source={
            item.avatar
              ? { uri: item.avatar }
              : { uri: 'https://i.pravatar.cc/150' } // fallback must be wrapped in { uri: ... }
          }
          style={styles.avatar}
        />
        {item.active && <View style={styles.activeStatus} />}
      </View>
      <View style={styles.textWrapper}>
        <Text style={styles.accountName}>{item.username}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage || 'No messages yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );



  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0078fe" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 10, paddingTop: 10 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#121212', 
  },
  accountItem: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#1e1e1e', 
    borderRadius: 12,
    marginBottom: 10,
  },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  activeStatus: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4cd137', 
    borderWidth: 2,
    borderColor: '#121212',
  },
  textWrapper: { flex: 1 },
  accountName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  lastMessage: { fontSize: 14, color: '#aaa', marginTop: 2 },
});

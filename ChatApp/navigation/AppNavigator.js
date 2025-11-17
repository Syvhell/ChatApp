import React from 'react';
import { TouchableOpacity, Image, View, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import LoginScreen from '../screens/LoginScreen';
import ChatScreen from '../screens/ChatScreen';
import ChatBoxScreen from '../screens/ChatBoxScreen';
import RegisterScreen from '../screens/RegisterScreen';

const Stack = createNativeStackNavigator();
const { backendUrl } = Constants.expoConfig.extra;

export default function AppNavigator() {
  const handleLogout = async (navigation) => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (token) {
        // Call backend logout to set active = false
        const res = await fetch(`${backendUrl}/api/chat/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || 'Failed to logout');
        }
      }

      // Clear token and user info
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');

      // Reset navigation to login
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (err) {
      console.error(err);
      Alert.alert('Logout Failed', err.message);
    }
  };

  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerStyle: { backgroundColor: '#121212', elevation: 0, shadowOpacity: 0 },
        headerTintColor: '#fff',
        headerTitleStyle: { color: '#fff', fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />

      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ navigation }) => ({
          headerTitle: 'Chats',
          headerTitleAlign: 'left',
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 15 }}
              onPress={() => handleLogout(navigation)}
            >
              <Ionicons name="log-out-outline" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        })}
      />

      <Stack.Screen
        name="ChatBox"
        component={ChatBoxScreen}
        options={({ route }) => ({
          headerTitleAlign: 'left',
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={
                  route.params.avatar
                    ? { uri: route.params.avatar }
                    : { uri: 'https://i.pravatar.cc/150' }
                }
                style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }}
              />
              <View>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#fff' }}>
                  {route.params.name}
                </Text>
                {route.params.active && (
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: '#4cd137',
                      marginTop: 2,
                    }}
                  />
                )}
              </View>
            </View>
          ),
        })}
      />

      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

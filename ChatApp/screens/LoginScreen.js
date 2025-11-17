import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, Alert, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomButton from '../components/CustomButton';
import Constants from 'expo-constants';

const { backendUrl } = Constants.expoConfig.extra;

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to login');
      }

      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));

      navigation.reset({
        index: 0,
        routes: [{ name: 'Chat' }],
      });

    } catch (error) {
      console.error(error);
      Alert.alert('Login Failed', error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* Title with image */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Estyll</Text>
          <Image
            source={require('../assets/icon.jpg')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.subtitle}>
          Log in to see photos and videos from your friends.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#aaa"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <CustomButton
          title="Log In"
          onPress={handleLogin}
          gradient={['#f58529','#dd2a7b','#8134af']}
          style={styles.loginButton}
        />

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#121212',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 48,
    fontFamily: 'Billabong',
    color: '#fff',
  },
  logoImage: {
    width: 40,
    height: 40,
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#333',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#1e1e1e',
    color: '#fff',
    fontSize: 14,
  },
  loginButton: {
    marginTop: 10,
    width: '100%',
    borderRadius: 8,
  },
  registerContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  registerText: {
    color: '#aaa',
    fontSize: 14,
  },
  registerLink: {
    color: '#0095f6',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

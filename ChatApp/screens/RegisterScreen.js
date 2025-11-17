import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import CustomButton from '../components/CustomButton';
import Constants from 'expo-constants';

const { backendUrl } = Constants.expoConfig.extra;

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const handleRegister = async () => {
  if (!username || !email || !password || !confirm) {
    Alert.alert("Error", "All fields are required");
    return;
  }

  if (password !== confirm) {
    Alert.alert("Error", "Passwords do not match");
    return;
  }

  try {
    const response = await fetch(`${backendUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || 'Failed to register');
    }

    const data = await response.json();

    // Optional: save token somewhere like AsyncStorage
    // await AsyncStorage.setItem('token', data.token);

    Alert.alert("Success", "Account created!");
    navigation.navigate("Login");
  } catch (error) {
    console.error(error);
    Alert.alert("Registration Failed", error.message);
  }
};


  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Estyll</Text>
        <Text style={styles.subtitle}>
          Sign up to see photos and videos from your friends.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#aaa"
          value={username}
          onChangeText={setUsername}
        />

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

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />

        <CustomButton
          title="Sign Up"
          onPress={handleRegister}
          gradient={['#f58529','#dd2a7b','#8134af']} // Instagram gradient
          style={styles.signupButton}
        />

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Log In</Text>
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
    backgroundColor: '#121212', // dark mode background
  },
  title: {
    fontSize: 48,
    fontFamily: 'Billabong', // Instagram font if available
    color: '#fff',
    marginBottom: 10,
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
    marginBottom: 12,
    backgroundColor: '#1e1e1e', // dark input background
    color: '#fff',
    fontSize: 14,
  },
  signupButton: {
    marginTop: 10,
    width: '100%',
    borderRadius: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  loginText: {
    color: '#aaa',
  },
  loginLink: {
    color: '#0095f6',
    fontWeight: 'bold',
  },
});

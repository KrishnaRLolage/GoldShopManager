import * as React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import PJDiamondIcon from '../assets/PJDiamondIcon';
import { initializeDatabase, apiLogin} from '../db';
import { useEffect } from 'react';
import WebNavBanner from '../components/WebNavBanner';

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    initializeDatabase();
  }, []);

  const handleLogin = async () => {
    try {
      setError('');
      // Call login API and only navigate if JWT is received
      const resp = await apiLogin(username, password);
      const token = resp.token || (resp.data && resp.data.token);
      if (token) {
        navigation.navigate('Dashboard');
      } else {
        setError('Invalid credentials or no token received.');
      }
    } catch (error: any) {
      setError(error.message || 'Login error. Please try again.');
      console.error('Login error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <PJDiamondIcon size={120} style={{ marginBottom: 24 }} />
      <TextInput
        label="Username"
        value={username}
        onChangeText={setUsername}
        style={{ width: 250, marginBottom: 12, backgroundColor: '#fff', color: 'red' }}
        autoCapitalize="none"
        left={<TextInput.Icon icon="account" />}
        underlineColor="#7c3aed"
        activeUnderlineColor="#7c3aed"
        theme={{ colors: { background: '#fff', surface: '#fff', primary: '#7c3aed', text: 'red', placeholder: '#888' } }}
        autoCorrect={false}
        autoComplete="username"
        textColor="black"
      />
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        style={{ width: 250, marginBottom: 12, backgroundColor: '#fff', color: 'red' }}
        secureTextEntry
        left={<TextInput.Icon icon="lock" />}
        underlineColor="#7c3aed"
        activeUnderlineColor="#7c3aed"
        theme={{ colors: { background: '#fff', surface: '#fff', primary: '#7c3aed', text: 'red', placeholder: '#888' } }}
        autoCorrect={false}
        autoComplete="current-password"
        textColor="black"
      />
      {error ? (
        <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text>
      ) : null}
      <Button mode="contained" onPress={handleLogin} style={{ marginTop: 16 }}>
        Login
      </Button>
      {/* <Button onPress={() => navigation.navigate('Signup')} style={{ marginTop: 8 }}>
        Don't have an account? Sign up
      </Button> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center', // Center horizontally
    padding: 24,
    backgroundColor: '#fff',
  },
});

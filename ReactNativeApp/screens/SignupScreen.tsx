import * as React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text, Button, Avatar } from 'react-native-paper';
import { useEffect } from 'react';
import WebNavBanner from '../components/WebNavBanner';

export default function SignupScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <Avatar.Icon size={80} icon="account-plus" style={{ marginBottom: 24 }} />
      {/* Add TextInput fields for registration here */}
      <Button mode="contained" onPress={() => navigation.navigate('Dashboard')} style={{ marginTop: 16 }}>
        Sign Up
      </Button>
      <Button onPress={() => navigation.navigate('Login')} style={{ marginTop: 8 }}>
        Already have an account? Login
      </Button>
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

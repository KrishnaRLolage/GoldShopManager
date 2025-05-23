import React, { useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Platform, View, Text, Button, ActivityIndicator } from 'react-native';

export function withAuthGuard<P extends object>(Component: React.ComponentType<P>) {
  return function GuardedComponent(props: P) {
    const { user, loading } = useAuth();
    const navigation = useNavigation();

    useEffect(() => {
      if (Platform.OS === 'web' && !loading && !user) {
        // Optionally, you could auto-redirect here
        // navigation.navigate('Login');
      }
    }, [user, loading, navigation]);

    if (Platform.OS === 'web' && loading) {
      // Show a loading spinner while checking session
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
          <Text>Checking session...</Text>
        </View>
      );
    }
    if (Platform.OS === 'web' && !user && !loading) {
      // Show a message and button to go to login
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Your session has expired or you are not logged in.</Text>
          <Button title="Go to Login" onPress={() => navigation.navigate('Login' as never)} />
        </View>
      );
    }
    return React.createElement(Component, props);
  };
}

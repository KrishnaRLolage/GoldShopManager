import React from 'react';
import { View, Text } from 'react-native';
import { Button } from 'react-native-paper';

export function SessionExpiredScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fffbe7' }}>
      <Text style={{ fontSize: 22, color: '#b45309', fontWeight: 'bold', marginBottom: 16 }}>Session Expired</Text>
      <Text style={{ color: '#b45309', marginBottom: 24 }}>Your session has expired. Please log in again.</Text>
      <Button mode="contained" onPress={onLogin}>
        Login Again
      </Button>
    </View>
  );
}
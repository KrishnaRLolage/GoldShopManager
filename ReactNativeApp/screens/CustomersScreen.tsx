import * as React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { useEffect } from 'react';
import WebNavBanner from '../components/WebNavBanner';
import { withAuthGuard } from '../withAuthGuard';

// TODO: Import and use API functions for customers when backend endpoints are ready
// import { apiGetCustomers, apiAddCustomer, apiDeleteCustomer } from '../db';

export default withAuthGuard(function CustomersScreen(props: any) {
  return (
    <View style={styles.container}>
      <WebNavBanner />
      <Avatar.Icon size={64} icon="account-group" style={{ marginBottom: 24 }} />
      {/* Add customers list here */}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'stretch',
    padding: 24,
    backgroundColor: '#fff',
  },
});

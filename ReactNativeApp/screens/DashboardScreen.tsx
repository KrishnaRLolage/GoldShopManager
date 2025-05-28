import * as React from 'react';
import { View, StyleSheet, ScrollView, Platform, Image } from 'react-native';
import { Text, Button, Card, Avatar } from 'react-native-paper';
import { useEffect } from 'react';

export default function DashboardScreen({ navigation }: any) {
  return (
    <ScrollView contentContainerStyle={[styles.container, { flexGrow: 1, alignItems: 'center' }]}> 
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
        <Image source={require('../assets/svg_shop_icon.jpg')} style={{ width: 100, height: 100, marginRight: 16, borderRadius: 12, resizeMode: 'contain' }} />
        <Text style={{ fontWeight: 'bold', fontSize: 28, color: '#7c3aed', textAlign: 'center' }}>Pallavi Jewellers</Text>
      </View>
      <Text style={{ color: '#444', fontSize: 12, textAlign: 'center' }}>Near Sai Baba Kaman, Nevasa Road, Newasa Phata, Taluka Nevasa-Pincode: 414603</Text>
      <Text style={{ color: '#444', fontSize: 12, textAlign: 'center', marginBottom: 16 }}>Phone: 9922881028 | GSTIN: 27ABCDE1234F1Z5</Text>
      <Card style={[styles.card, { backgroundColor: '#ede9fe', borderColor: '#7c3aed', borderWidth: 1 }]} onPress={() => navigation.navigate('Invoice')}>
        <Card.Title title="Create Invoice" left={props => <Avatar.Icon {...props} icon="file-document" style={{ backgroundColor: '#7c3aed' }} />} titleStyle={{ color: '#7c3aed', fontWeight: 'bold' }} />
      </Card>
      <Card style={[styles.card, { backgroundColor: '#fffbe7', borderColor: '#fbbf24', borderWidth: 1 }]} onPress={() => navigation.navigate('Inventory')}>
        <Card.Title title="Inventory" left={props => <Avatar.Icon {...props} icon="cube" style={{ backgroundColor: '#fbbf24' }} />} titleStyle={{ color: '#b45309', fontWeight: 'bold' }} />
      </Card>
      <Card style={[styles.card, { backgroundColor: '#e0e7ff', borderColor: '#6366f1', borderWidth: 1 }]} onPress={() => navigation.navigate('BillingHistory')}>
        <Card.Title title="Billing History" left={props => <Avatar.Icon {...props} icon="history" style={{ backgroundColor: '#6366f1' }} />} titleStyle={{ color: '#3730a3', fontWeight: 'bold' }} />
      </Card>
      <Card style={[styles.card, { backgroundColor: '#f0fdf4', borderColor: '#22c55e', borderWidth: 1 }]} onPress={() => navigation.navigate('Customers')}>
        <Card.Title title="Customers" left={props => <Avatar.Icon {...props} icon="account-group" style={{ backgroundColor: '#22c55e' }} />} titleStyle={{ color: '#166534', fontWeight: 'bold' }} />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'stretch',
    padding: 24,
    backgroundColor: '#fff',
  },
  card: {
    width: '90%',
    marginVertical: 10,
    alignSelf: 'center',
  },
});

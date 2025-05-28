import * as React from 'react';
import { View, StyleSheet, Platform, ScrollView } from 'react-native';
import { Text, Avatar, IconButton, TextInput } from 'react-native-paper';
import { useEffect, useState } from 'react';
import WebNavBanner from '../components/WebNavBanner';
import { apiGetCustomers, apiUpdateCustomer } from '../db';

export default function CustomersScreen(props: any) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    apiGetCustomers().then(setCustomers).catch(() => setCustomers([]));
  }, []);

  const handleEdit = (customer: any) => {
    setEditingId(customer.id);
    setEditData({ ...customer });
  };

  const handleEditChange = (field: string, value: string) => {
    setEditData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await apiUpdateCustomer(editData); // You must implement this in db.ts and backend
    setEditingId(null);
    setEditData({});
    apiGetCustomers().then(setCustomers).catch(() => setCustomers([]));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <WebNavBanner />
      <Avatar.Icon size={64} icon="account-group" style={{ marginBottom: 24, backgroundColor: '#7c3aed' }} />
      <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 16, color: '#222831' }}>Customers</Text>
      {customers.length === 0 ? (
        <Text style={{ color: '#7c3aed', fontWeight: 'bold' }}>No customers found.</Text>
      ) : (
        customers.map((c, idx) => (
          <View key={c.id || idx} style={{ marginBottom: 12, padding: 12, backgroundColor: '#f0f4f8', borderRadius: 8, borderWidth: 1, borderColor: '#7c3aed', flexDirection: 'row', alignItems: 'center' }}>
            {editingId === c.id ? (
              <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#7c3aed', padding: 8 }}>
                <TextInput
                  value={editData.name}
                  onChangeText={v => handleEditChange('name', v)}
                  label="Name"
                  style={{ marginBottom: 4, backgroundColor: '#f0f4f8', borderRadius: 6, borderColor: '#7c3aed', borderWidth: 1, color: '#222831' }}
                  theme={{ colors: { primary: '#7c3aed', text: '#222831', placeholder: '#7c3aed' } }}
                  underlineColor="#7c3aed"
                  selectionColor="#7c3aed"
                  textColor='black'
                />
                <TextInput
                  value={editData.phone}
                  onChangeText={v => handleEditChange('phone', v)}
                  label="Phone"
                  style={{ marginBottom: 4, backgroundColor: '#f0f4f8', borderRadius: 6, borderColor: '#7c3aed', borderWidth: 1, color: '#222831' }}
                  theme={{ colors: { primary: '#7c3aed', text: '#222831', placeholder: '#7c3aed' } }}
                  underlineColor="#7c3aed"
                  selectionColor="#7c3aed"
                  textColor='black'
                />
                <TextInput
                  value={editData.address}
                  onChangeText={v => handleEditChange('address', v)}
                  label="Address"
                  style={{ marginBottom: 4, backgroundColor: '#f0f4f8', borderRadius: 6, borderColor: '#7c3aed', borderWidth: 1, color: '#222831' }}
                  theme={{ colors: { primary: '#7c3aed', text: '#222831', placeholder: '#7c3aed' } }}
                  underlineColor="#7c3aed"
                  selectionColor="#7c3aed"
                  textColor='black'
                />
                <TextInput
                  value={editData.email}
                  onChangeText={v => handleEditChange('email', v)}
                  label="Email"
                  style={{ marginBottom: 4, backgroundColor: '#f0f4f8', borderRadius: 6, borderColor: '#7c3aed', borderWidth: 1, color: '#222831' }}
                  theme={{ colors: { primary: '#7c3aed', text: '#222831', placeholder: '#7c3aed' } }}
                  underlineColor="#7c3aed"
                  selectionColor="#7c3aed"
                  textColor='black'
                />
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <IconButton icon="content-save" iconColor="#7c3aed" onPress={handleSave} />
                  <IconButton icon="close" iconColor="#e11d48" onPress={() => setEditingId(null)} />
                </View>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 'bold', color: '#222831', fontSize: 16 }}>{c.name}</Text>
                <Text style={{ color: '#222831' }}>Phone: <Text style={{ color: '#7c3aed' }}>{c.phone || '-'}</Text></Text>
                <Text style={{ color: '#222831' }}>Address: <Text style={{ color: '#7c3aed' }}>{c.address || '-'}</Text></Text>
                <Text style={{ color: '#222831' }}>Email: <Text style={{ color: '#7c3aed' }}>{c.email || '-'}</Text></Text>
              </View>
            )}
            {editingId !== c.id && (
              <IconButton icon="pencil" iconColor="#7c3aed" onPress={() => handleEdit(c)} />
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'stretch',
    padding: 24,
    backgroundColor: '#fff',
  },
});

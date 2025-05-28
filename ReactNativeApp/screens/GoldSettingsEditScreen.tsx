import * as React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text, TextInput, Button, Card } from 'react-native-paper';
import { apiGetGoldSettings, apiUpdateGoldSettings } from '../db';
import { useEffect } from 'react';
import WebNavBanner from '../components/WebNavBanner';

export default function GoldSettingsEditScreen({ navigation }: any) {
  const [goldRate, setGoldRate] = React.useState('');
  const [gstRate, setGstRate] = React.useState('');
  const [makingCharge, setMakingCharge] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    (async () => {
      try {
        const settings = await apiGetGoldSettings();
        setGoldRate(settings.gold_rate.toString());
        setGstRate(settings.gst_rate.toString());
        setMakingCharge(settings.making_charge_per_gram.toString());
      } catch (e: any) {
        setError('Failed to load gold settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setError('');
    try {
      await apiUpdateGoldSettings({
        gold_rate: parseFloat(goldRate),
        gst_rate: parseFloat(gstRate),
        making_charge_per_gram: parseFloat(makingCharge)
      });
      navigation.goBack();
    } catch (e: any) {
      setError('Failed to update gold settings');
    }
  };

  if (loading) return <Text style={{ margin: 32 }}>Loading...</Text>;

  return (
    <View style={styles.container}>
      <WebNavBanner />
      <Card style={{ padding: 16 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Edit Gold Settings</Text>
        <TextInput
          label="Gold Rate (per gram)"
          value={goldRate}
          onChangeText={setGoldRate}
          keyboardType="numeric"
          style={{ marginBottom: 12 }}
        />
        <TextInput
          label="GST Rate (%)"
          value={gstRate}
          onChangeText={setGstRate}
          keyboardType="numeric"
          style={{ marginBottom: 12 }}
        />
        <TextInput
          label="Making Charges (per gram)"
          value={makingCharge}
          onChangeText={setMakingCharge}
          keyboardType="numeric"
          style={{ marginBottom: 12 }}
        />
        {error ? <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text> : null}
        <Button mode="contained" onPress={handleSave} style={{ marginTop: 8 }}>
          Save Changes
        </Button>
        <Button onPress={() => navigation.goBack()} style={{ marginTop: 8 }}>
          Cancel
        </Button>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
});

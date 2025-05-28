import * as React from 'react';
import { View, StyleSheet, ScrollView, Linking, Platform } from 'react-native';
import { Text, Avatar, DataTable, IconButton, ActivityIndicator, Card } from 'react-native-paper';
import { apiGetInvoices } from '../db';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useEffect } from 'react';
import WebNavBanner from '../components/WebNavBanner';
import { SessionExpiredScreen } from '../components/SessionExpiredScreen';

export default function BillingHistoryScreen(props: any) {
  const [loading, setLoading] = React.useState(true);
  const [history, setHistory] = React.useState<any[]>([]);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiGetInvoices();
        setHistory(data);
      } catch (e: any) {
        setError(e.message || 'Failed to fetch billing history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Helper: Download and open PDF or HTML blob from base64 in invoice
  const handleViewInvoice = async (invoice: any) => {
    if (invoice.pdf_blob_base64) {
      // Detect if base64 is HTML or PDF
      const decoded = atob(invoice.pdf_blob_base64);
      const isHTML = decoded.trim().startsWith('<!DOCTYPE html') || decoded.trim().startsWith('<html');
      if (isHTML) {
        // Handle HTML invoice
        if (Platform.OS === 'web') {
          // Convert base64 to Uint8Array for correct UTF-8/Unicode rendering
          function base64ToUint8Array(base64: string) {
            const binaryString = atob(base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes;
          }
          const utf8Bytes = base64ToUint8Array(invoice.pdf_blob_base64);
          const blob = new Blob([utf8Bytes], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } else {
          // On native, save and share as HTML
          const fileUri = `${FileSystem.cacheDirectory}invoice_${invoice.id}.html`;
          await FileSystem.writeAsStringAsync(fileUri, decoded, { encoding: FileSystem.EncodingType.UTF8 });
          await Sharing.shareAsync(fileUri, { mimeType: 'text/html', dialogTitle: 'View Invoice HTML' });
        }
      } else {
        // Handle PDF invoice
        const byteNumbers = new Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) byteNumbers[i] = decoded.charCodeAt(i);
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        if (Platform.OS === 'web') {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `invoice_${invoice.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }, 100);
        } else {
          const arrayBuffer = blob.arrayBuffer ? await blob.arrayBuffer() : null;
          if (arrayBuffer) {
            const fileUri = `${FileSystem.cacheDirectory}invoice_${invoice.id}.pdf`;
            await FileSystem.writeAsStringAsync(fileUri, Buffer.from(arrayBuffer).toString('base64'), { encoding: FileSystem.EncodingType.Base64 });
            await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', dialogTitle: 'View Invoice PDF' });
          } else {
            alert('Unable to process PDF blob.');
          }
        }
      }
    } else if (invoice.pdf_url) {
      // Fallback: fetch from URL if no base64 blob
      try {
        const response = await fetch(invoice.pdf_url);
        if (!response.ok) throw new Error('Failed to fetch PDF');
        const blob = await response.blob();
        if (Platform.OS === 'web') {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `invoice_${invoice.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }, 100);
        } else {
          const arrayBuffer = await blob.arrayBuffer();
          const fileUri = `${FileSystem.cacheDirectory}invoice_${invoice.id}.pdf`;
          await FileSystem.writeAsStringAsync(fileUri, Buffer.from(arrayBuffer).toString('base64'), { encoding: FileSystem.EncodingType.Base64 });
          await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', dialogTitle: 'View Invoice PDF' });
        }
      } catch (e: any) {
        alert('Failed to open PDF: ' + (e.message || e));
      }
    } else {
      alert('Invoice file not available for this invoice.');
    }
  };

  if (error && error.toLowerCase().includes('session expired')) {
    // Show SessionExpiredScreen if error is session expired
    return <SessionExpiredScreen onLogin={() => {
      if (props.navigation && props.navigation.reset) {
        props.navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    }} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <WebNavBanner />
      {/* <Avatar.Icon size={64} icon="history" style={{ marginBottom: 24, alignSelf: 'center', backgroundColor: '#ede9fe' }} /> */}
      <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 16, textAlign: 'center', color: '#7c3aed' }}>Billing History</Text>
      {loading ? (
        <ActivityIndicator animating size="large" style={{ marginTop: 32 }} color="#7c3aed" />
      ) : error ? (
        <Text style={{ color: 'red', textAlign: 'center' }}>{error}</Text>
      ) : history.length === 0 ? (
        <Text style={{ textAlign: 'center', color: '#888' }}>No billing history found.</Text>
      ) : (
        <View style={styles.tableWrapper}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, { flex: 1.1 }]}>Invoice #</Text>
            <Text style={[styles.headerCell, { flex: 1.5 }]}>Name</Text>
            <Text style={[styles.headerCell, { flex: 2 }]}>Address</Text>
            <Text style={[styles.headerCell, { flex: 1.2 }]}>Phone</Text>
            <Text style={[styles.headerCell, { flex: 1, textAlign: 'right' }]}>Total</Text>
            <Text style={[styles.headerCell, { flex: 0.7, textAlign: 'center' }]}>PDF</Text>
          </View>
          {history.map((inv, idx) => {
            // Detect if base64 is HTML or PDF for icon
            let isHTML = false;
            if (inv.pdf_blob_base64) {
              try {
                const decoded = atob(inv.pdf_blob_base64);
                isHTML = decoded.trim().startsWith('<!DOCTYPE html') || decoded.trim().startsWith('<html');
              } catch {}
            }
            return (
              <Card
                key={inv.id || idx}
                style={[
                  styles.rowCard,
                  { backgroundColor: idx % 2 === 0 ? '#f9fafb' : '#ede9fe', borderColor: '#e0e0e0' },
                ]}
                elevation={0}
              >
                <View style={styles.rowContent}>
                  <Text style={[styles.cell, { flex: 1.1, color: '#7c3aed', fontWeight: 'bold' }]}>{inv.number || `INV-${inv.id}`}</Text>
                  <Text style={[styles.cell, { flex: 1.5 }]}>{inv.customer_name || inv.customer?.name || ''}</Text>
                  <Text style={[styles.cell, { flex: 2 }]} numberOfLines={1} ellipsizeMode="tail">{inv.customer_address || inv.customer?.address || ''}</Text>
                  <Text style={[styles.cell, { flex: 1.2 }]}>{inv.customer_contact || inv.customer?.contact || ''}</Text>
                  <Text style={[styles.cell, { flex: 1, textAlign: 'right', fontWeight: 'bold', color: '#222831' }]}>{'\u20B9'}{inv.total?.toFixed ? inv.total.toFixed(2) : inv.total}</Text>
                  <View style={[styles.cell, { flex: 0.7, alignItems: 'center', justifyContent: 'center' }]}> 
                    <IconButton
                      icon={isHTML ? 'file-document' : 'file-pdf-box'}
                      size={22}
                      onPress={() => handleViewInvoice(inv)}
                      disabled={!inv.pdf_url && !inv.pdf_blob_base64}
                      iconColor={isHTML ? '#1976d2' : '#e53935'}
                      accessibilityLabel={isHTML ? 'View HTML Invoice' : 'View PDF'}
                      style={{ margin: 0 }}
                    />
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'stretch',
    padding: 24,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  tableWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 32,
    backgroundColor: '#ede9fe',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#7c3aed',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  headerCell: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    paddingHorizontal: 2,
  },
  rowCard: {
    borderBottomWidth: 1,
    borderRadius: 0,
    borderColor: '#e0e0e0',
    marginHorizontal: 0,
    marginVertical: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    backgroundColor: '#f9fafb',
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  cell: {
    fontSize: 14,
    color: '#222831',
    paddingHorizontal: 2,
  },
});

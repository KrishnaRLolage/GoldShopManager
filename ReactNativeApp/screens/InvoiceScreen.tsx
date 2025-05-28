import * as React from 'react';
import { View, StyleSheet, ScrollView, FlatList, TouchableOpacity, Modal, Platform, Linking } from 'react-native';
import { Text, Button, Avatar, TextInput, DataTable, Divider, Card, Portal } from 'react-native-paper';
import PJDiamondIcon from '../assets/PJDiamondIcon';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system';
import { WebView } from 'react-native-webview';
import { useEffect } from 'react';
import WebNavBanner from '../components/WebNavBanner';

// TODO: Import and use API functions for invoices when backend endpoints are ready
import { apiAddInvoice, apiGetGoldSettings, apiGetInventoryNames, apiAddOrGetCustomer, apiUploadInvoicePDF, apiGetInvoices, apiFindInventoryByName } from '../db';

// Set API base URL for all platforms
const API_BASE = typeof process !== 'undefined' && process.env && process.env.EXPO_PUBLIC_API_BASE
  ? process.env.EXPO_PUBLIC_API_BASE
  : 'https://192.168.29.102:4000/api';

// Type for item row
interface ItemRow {
  name: string;
  desc: string;
  purity: string;
  weight: string;
  rate: string;
  making: string; // per gram
  makingTotal?: string; // calculated total making charges
  gst: string;
  amount: string;
  showDropdown?: string; // for dropdown state
  inventory_id?: number; // add inventory_id for backend
}

// --- Extracted Components ---
function InvoiceHeader({ invoiceId }: { invoiceId: number | null }) {
  return (
    <>
      {/* <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12, width: '100%' }}>
        <PJDiamondIcon size={120} style={{ position: 'absolute', left: 0, marginTop: 40 }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#7c3aed', textAlign: 'center' }}>Pallavi Jewellers</Text>
        </View>
      </View> */}
      <Text style={{ color: '#222831', fontSize: 28, fontWeight: '600', textAlign: 'center', marginBottom: 20 }}>Invoice</Text>
      <Text style={{ color: '#444', fontSize: 12, textAlign: 'center' }}>Near Sai Baba Kaman, Nevasa Road, Newasa Phata, Taluka Nevasa-Pincode: 414603</Text>
      <Text style={{ color: '#444', fontSize: 12, textAlign: 'center' }}>Phone: 9922881028 | GSTIN: 27ABCDE1234F1Z5</Text>
      {invoiceId && (
        <Text style={{ color: '#7c3aed', fontWeight: 'bold', fontSize: 16, marginTop: 4 }}>Invoice No: INV-{invoiceId}</Text>
      )}
      <Divider style={{ marginVertical: 8 }} />
    </>
  );
}

function GoldSettingsCard({ goldSettings, onEdit }: { goldSettings: any, onEdit: () => void }) {
  if (!goldSettings) return null;
  return (
    <Card style={{ marginBottom: 16, padding: 12, backgroundColor: '#fffbe7', borderColor: '#fbbf24', borderWidth: 1, position: 'relative' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontWeight: 'bold', color: '#b45309', marginBottom: 4 }}>Gold Rate & Charges</Text>
        <Button onPress={onEdit} compact style={{ marginLeft: 8 }}>
          <Icon name="pencil" size={20} color="#b45309" />
        </Button>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
        <Text style={{ color: '#b45309' }}>Gold Rate (per gram):</Text>
        <Text style={{ color: '#b45309', fontWeight: 'bold' }}>₹{goldSettings.gold_rate}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
        <Text style={{ color: '#b45309' }}>GST Rate (%):</Text>
        <Text style={{ color: '#b45309', fontWeight: 'bold' }}>{goldSettings.gst_rate}%</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: '#b45309' }}>Making Charges (per gram):</Text>
        <Text style={{ color: '#b45309', fontWeight: 'bold' }}>₹{goldSettings.making_charge_per_gram}</Text>
      </View>
    </Card>
  );
}

function InvoiceCustomerDetails({ invoice, customer, setCustomer }: { invoice: any, customer: any, setCustomer: (c: any) => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
      <Card style={{ flex: 1, marginRight: 8, padding: 8, backgroundColor: '#ede9fe' }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 4, color: '#222831' }}>Invoice Details</Text>
        <TextInput label="Invoice No." value={invoice.number} editable={false} style={{ marginBottom: 4, backgroundColor: '#ede9fe' }} textColor="#222831" underlineColor="#7c3aed" activeUnderlineColor="#7c3aed" theme={{ colors: { primary: 'red' } }} />
        <TextInput label="Date" value={invoice.date} editable={false} style={{ marginBottom: 4, backgroundColor: '#ede9fe' }} textColor="#222831" underlineColor="#7c3aed" activeUnderlineColor="#7c3aed" theme={{ colors: { primary: '#007AFF' } }} />
      </Card>
      <Card style={{ flex: 1, marginLeft: 8, padding: 8, backgroundColor: '#ede9fe' }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 4, color: '#222831' }}>Customer Details</Text>
        <TextInput label="Name" value={customer.name} onChangeText={t => setCustomer({ ...customer, name: t })} style={{ marginBottom: 4, backgroundColor: '#ede9fe' }} textColor="#222831" underlineColor="#7c3aed" activeUnderlineColor="#7c3aed" theme={{ colors: { primary: '#007AFF' } }} />
        <TextInput label="Address" value={customer.address} onChangeText={t => setCustomer({ ...customer, address: t })} style={{ marginBottom: 4, backgroundColor: '#ede9fe' }} textColor="#222831" underlineColor="#7c3aed" activeUnderlineColor="#7c3aed" theme={{ colors: { primary: '#007AFF' } }} />
        <TextInput label="Contact" value={customer.contact} onChangeText={t => setCustomer({ ...customer, contact: t })} style={{ backgroundColor: '#ede9fe' }} textColor="#222831" underlineColor="#7c3aed" activeUnderlineColor="#7c3aed" theme={{ colors: { primary: '#007AFF' } }} />
      </Card>
    </View>
  );
}

export default function InvoiceScreen(props: any) {
  // Placeholder state for invoice fields
  const [customer, setCustomer] = React.useState({ name: '', address: '', contact: '' });
  const [invoice, setInvoice] = React.useState({ number: 'INV-001', date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }), });
  const [items, setItems] = React.useState<ItemRow[]>([
    { name: '', desc: '', purity: '', weight: '', rate: '', making: '', gst: '', amount: '' },
  ]);
  const [notes, setNotes] = React.useState('Thank you for your purchase!');
  const [invoiceId, setInvoiceId] = React.useState<number | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  // Gold settings state
  const [goldSettings, setGoldSettings] = React.useState<{ gold_rate: number; gst_rate: number; making_charge_per_gram: number } | null>(null);

  const navigation = useNavigation();
  const [showAuthPrompt, setShowAuthPrompt] = React.useState(false);
  const [authUsername, setAuthUsername] = React.useState('');
  const [authPassword, setAuthPassword] = React.useState('');
  const [authError, setAuthError] = React.useState('');

  const [inventoryNames, setInventoryNames] = React.useState<string[]>([]);

  const [showHtmlPreview, setShowHtmlPreview] = React.useState(false);
  const [htmlPreview, setHtmlPreview] = React.useState('');

  // Handler for edit gold settings
  const handleEditGoldSettings = () => {
    setShowAuthPrompt(true);
    setAuthUsername('');
    setAuthPassword('');
    setAuthError('');
  };

  // Simulate backend auth (replace with real API call)
  const handleGoldSettingsAuth = async () => {
    setAuthError('');
    try {
      // TODO: Replace with real API call
      if (authUsername === 'admin' && authPassword === 'Qwerty@123') {
        setShowAuthPrompt(false);
        // @ts-ignore
        navigation.navigate && navigation.navigate('GoldSettingsEdit');
      } else {
        setAuthError('Invalid credentials');
      }
    } catch (e) {
      setAuthError('Login failed');
    }
  };

  // Fetch gold settings on mount and when screen is focused
  React.useEffect(() => {
    const fetchGoldSettings = async () => {
      try {
        const settings = await apiGetGoldSettings();
        setGoldSettings(settings);
      } catch (e) {
        setGoldSettings({ gold_rate: 0, gst_rate: 0, making_charge_per_gram: 0 });
      }
    };
    fetchGoldSettings();
    const unsubscribe = navigation.addListener('focus', fetchGoldSettings);
    return unsubscribe;
  }, [navigation]);

  // Fetch inventory item names for dropdown on mount
  React.useEffect(() => {
    apiGetInventoryNames('').then(setInventoryNames).catch(() => setInventoryNames([]));
  }, []);

  // Calculate item amount and GST automatically when weight, rate, or making changes
  const recalcItem = (item: ItemRow): ItemRow => {
    const weight = parseFloat(item.weight) || 0;
    // Use goldSettings for rate and making if not manually set
    const rate = item.rate ? parseFloat(item.rate) : (goldSettings?.gold_rate || 0);
    const makingPerGram = item.making ? parseFloat(item.making) : (goldSettings?.making_charge_per_gram || 0);
    const gstRate = goldSettings?.gst_rate || 0;
    const base = weight * rate;
    const makingTotal = makingPerGram * weight; // making charges per gram * weight
    const subtotal = base + makingTotal;
    const gst = subtotal * (gstRate / 100);
    const amount = subtotal + gst;
    return {
      ...item,
      rate: rate ? rate.toString() : '',
      making: makingPerGram ? makingPerGram.toString() : '',
      makingTotal: makingTotal ? makingTotal.toFixed(2) : '',
      gst: gst ? gst.toFixed(2) : '',
      amount: amount ? amount.toFixed(2) : '',
    };
  };

  // Update item and recalculate when weight, rate, or making changes
  const handleItemChange = (idx: number, field: keyof ItemRow, value: string) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      newItems[idx] = { ...newItems[idx], [field]: value };
      // Only recalc if weight, rate, or making changes
      if (["weight", "rate", "making"].includes(field)) {
        newItems[idx] = recalcItem(newItems[idx]);
      }
      return newItems;
    });
  };

  const addItemRow = () => setItems([...items, { name: '', desc: '', purity: '', weight: '', rate: '', making: '', gst: '', amount: '' }]);
  const removeItemRow = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  // Calculate totals
  const subtotal = items.reduce((sum, i) => sum + ((parseFloat(i.weight ?? '0') * parseFloat(i.rate ?? '0')) || 0), 0);
  const totalGST = items.reduce((sum, i) => sum + (parseFloat(i.gst) || 0), 0);
  const totalMaking = items.reduce((sum, i) => sum + (parseFloat(i.makingTotal ?? '0') || 0), 0)
  const grandTotal = subtotal + totalGST + totalMaking;

  // Calculate item amount and GST automatically when items change
  React.useEffect(() => {
    setItems(prevItems => prevItems.map(item => {
      const weight = parseFloat(item.weight) || 0;
      const rate = parseFloat(item.rate) || 0;
      const making = parseFloat(item.making) || 0;
      const base = weight * rate;
      const makingTotal = making * weight;
      const subtotal = base + makingTotal;
      const gst = subtotal * 0.03;
      const amount = subtotal + gst;
      return {
        ...item,
        amount: amount ? amount.toFixed(2) : '',
        gst: gst ? gst.toFixed(2) : '',
      };
    }));
  }, [items.map(i => `${i.weight}|${i.rate}|${i.making}` ).join(',')]);

  // Helper: Generate invoice HTML for PDF
  const generateInvoiceHTML = () => {
    // Use a simple, stacked layout for totals (no float), for better PDF compatibility
    return `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background: #fff; color: #222831; padding: 24px; }
            .header { text-align: center; margin-bottom: 12px; }
            .brand { font-size: 28px; font-weight: bold; color: #7c3aed; }
            .subtitle { color: #222831; font-weight: 600; margin-bottom: 8px; }
            .address, .gst { color: #444; font-size: 12px; }
            .divider { border-bottom: 1px solid #e0e0e0; margin: 12px 0; }
            .section { margin-bottom: 18px; }
            .details-table { width: 100%; margin-bottom: 12px; }
            .details-table td { padding: 4px 8px; font-size: 14px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            .items-table th, .items-table td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 14px; }
            .items-table th { background: #e0e0e0; color: #222831; font-weight: bold; }
            .totals-table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; }
            .totals-table td { padding: 6px 8px; font-size: 15px; border: none; }
            .totals-table .label { color: #222831; }
            .totals-table .value { color: #222831; text-align: right; }
            .totals-table .grand { font-weight: bold; color: #7c3aed; }
            .card { background: #f0f4f8; padding: 8px; border-radius: 6px; margin-bottom: 8px; }
            .notes { font-size: 14px; color: #222831; }
            .terms { font-size: 12px; color: #444; margin-top: 4px; }
            .signature { margin-top: 48px; text-align: right; font-weight: bold; color: #222831; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">Pallavi Jewellers</div>
            <div class="subtitle">Invoice</div>
            <div class="address">Near Sai Baba Kaman, Nevasa Road, Newasa Phata, Taluka Nevasa-Pincode: 414603</div>
            <div class="gst">Phone: 9922881028 | GSTIN: 27ABCDE1234F1Z5</div>
          </div>
          <div class="divider"></div>
          <table class="details-table">
            <tr>
              <td><b>Invoice No:</b> ${invoice.number}</td>
              <td><b>Date:</b> ${invoice.date}</td>
            </tr>
            <tr>
              <td colspan="2"><b>Customer:</b> ${customer.name}, ${customer.address}, ${customer.contact}</td>
            </tr>
          </table>
          <div class="section">
            <table class="items-table">
              <tr>
                <th>Item</th>
                <th>Description</th>
                <th>Purity</th>
                <th>Weight</th>
                <th>Rate/Gram</th>
                <th>Making Total</th>
                <th>GST</th>
                <th>Amount</th>
              </tr>
              ${items.map(i => `<tr>
                <td>${i.name}</td>
                <td>${i.desc}</td>
                <td>${i.purity}</td>
                <td>${i.weight}</td>
                <td>${i.rate}</td>
                <td>${i.makingTotal || ''}</td>
                <td>${i.gst}</td>
                <td>${i.amount}</td>
              </tr>`).join('')}
            </table>
          </div>
          <table class="totals-table">
            <tr><td class="label">Subtotal:</td><td class="value">₹${subtotal.toFixed(2)}</td></tr>
            <tr><td class="label">Total Making Charges:</td><td class="value">₹${totalMaking.toFixed(2)}</td></tr>
            <tr><td class="label">${goldSettings?.gst_rate || 0}% GST:</td><td class="value">₹${totalGST.toFixed(2)}</td></tr>
            <tr><td class="label grand">Grand Total:</td><td class="value grand">₹${grandTotal.toFixed(2)}</td></tr>
          </table>
          <div class="card">
            <div style="font-weight:bold; margin-bottom:4px; color:#222831;">Payment Details</div>
            <div>Bank: HDFC Bank</div>
            <div>Account No: 1234567890</div>
            <div>IFSC: HDFC0001234</div>
            <div>UPI: pjdjewels@hdfcbank</div>
          </div>
          <div class="card">
            <div style="font-weight:bold; margin-bottom:4px; color:#222831;">Notes / Terms</div>
            <div class="notes">${notes}</div>
            <div class="terms">*Goods once sold will not be taken back or exchanged. Warranty as per product. Please retain this bill for future reference.</div>
          </div>
          <div class="signature">Authorized Signature</div>
        </body>
      </html>
    `;
  };

  // Save invoice handler
  const handleSaveInvoice = async () => {
    setSaving(true);
    setError('');
    // Fallback: ensure spinner never gets stuck (native)
    let timeoutId: any;
    if (Platform.OS !== 'web') {
      timeoutId = setTimeout(() => setSaving(false), 10000); // 10s fallback
    }
    try {
      // Add or get customer ID
      const customerId = await apiAddOrGetCustomer(customer);
      const payload = {
        customer_id: customerId,
        date: invoice.date,
        total: grandTotal,
        items: items.map(i => ({
          inventory_id: i.inventory_id && !isNaN(Number(i.inventory_id)) ? Number(i.inventory_id) : 1, // ensure number, fallback to 1
          quantity: parseFloat(i.weight) || 1,
          price: parseFloat(i.amount) || 0
        }))
      };
      const result = await apiAddInvoice(payload);
      setInvoiceId(result.id);
      setInvoice(inv => ({ ...inv, number: result.id ? `INV-${result.id}` : inv.number }));
      // Generate and print/share PDF after saving
      const html = generateInvoiceHTML();
      if (Platform.OS === 'web') {
        // On web, open in new tab and print
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
          // Ensure loading spinner disappears when print dialog is closed
          printWindow.onafterprint = () => {
            setSaving(false);
          };
        } else {
          setError('Unable to open print window. Please allow popups and try again.');
          setSaving(false);
        }
        // Fallback: just in case onafterprint doesn't fire, set a timeout
        setTimeout(() => setSaving(false), 3000);
        // --- Save PDF blob to backend in web mode ---
        try {
          // Use html2pdf.js or similar to generate a real PDF from HTML for production
          // For now, upload the HTML as a PDF blob (backend will store as BLOB)
          const pdfBlob = new Blob([html], { type: 'application/pdf' });
          await fetch(`${API_BASE}/upload-invoice-pdf`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/pdf',
              'x-invoice-id': result.id,
            },
            body: pdfBlob,
          });
        } catch (err) {
          setError('Invoice saved, but failed to upload PDF (web mode).');
        }
        return;
      }
      let pdfResult;
      try {
        pdfResult = await Print.printToFileAsync({ html, base64: false });
      } catch (pdfErr) {
        setError('Failed to generate PDF. Please check invoice details and try again.');
        return;
      }
      if (!pdfResult || !pdfResult.uri) {
        setError('PDF generation failed. Please try again.');
        return;
      }
      // Upload PDF to backend and link to invoice
      try {
        await apiUploadInvoicePDF(result.id, pdfResult.uri);
      } catch (uploadErr) {
        setError('Invoice saved, but failed to upload PDF.');
      }
      if (await Sharing.isAvailableAsync()) {
        try {
          await Sharing.shareAsync(pdfResult.uri, { mimeType: 'application/pdf', dialogTitle: 'Share Invoice PDF' });
        } catch (shareErr) {
          setError('PDF generated but could not be shared.');
        }
      }
    } catch (e: any) {
      setError(e.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
      if (timeoutId) clearTimeout(timeoutId);
    }
  };

  React.useEffect(() => {
    // Fetch last invoice number from DB and set as default
    (async () => {
      try {
        const invoices = await apiGetInvoices();
        let nextNumber = 'INV-001';
        if (Array.isArray(invoices) && invoices.length > 0) {
          // Find max invoice number (assume format INV-<number> or just id)
          const last = invoices.reduce((a, b) => (Number((a.id || '').toString().replace(/[^\d]/g, '')) > Number((b.id || '').toString().replace(/[^\d]/g, '')) ? a : b));
          const lastNum = Number((last.number || last.id || '').toString().replace(/[^\d]/g, ''));
          if (!isNaN(lastNum)) {
            nextNumber = `INV-${(lastNum + 1).toString().padStart(3, '0')}`;
          }
        }
        setInvoice(inv => ({ ...inv, number: nextNumber }));
      } catch {
        setInvoice(inv => ({ ...inv, number: 'INV-001' }));
      }
    })();
  }, []);

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { flexGrow: 1 }]}
      keyboardShouldPersistTaps="handled"
    >
      <WebNavBanner />
      <InvoiceHeader invoiceId={invoiceId} />
      <GoldSettingsCard goldSettings={goldSettings} onEdit={handleEditGoldSettings} />
      {/* Gold Settings Auth Prompt remains as is */}
      {showAuthPrompt && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
          <Card style={{ width: 320, padding: 16 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Admin Login</Text>
            <TextInput label="Username" value={authUsername} onChangeText={setAuthUsername} style={{ marginBottom: 8 }} />
            <TextInput label="Password" value={authPassword} onChangeText={setAuthPassword} secureTextEntry style={{ marginBottom: 8 }} />
            {authError ? <Text style={{ color: 'red', marginBottom: 8 }}>{authError}</Text> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Button onPress={() => setShowAuthPrompt(false)} style={{ marginRight: 8 }}>Cancel</Button>
              <Button mode="contained" onPress={handleGoldSettingsAuth}>Login</Button>
            </View>
          </Card>
        </View>
      )}
      <InvoiceCustomerDetails invoice={invoice} customer={customer} setCustomer={setCustomer} />
      {/* Item Table */}
      <Text style={{ fontWeight: 'bold', fontSize: 16, marginTop: 16, marginBottom: 4, color: '#222831' }}>Items</Text>
      <DataTable style={{ width: '100%' }}>
        <DataTable.Header style={{ backgroundColor: '#e0e0e0' }}>
          <DataTable.Title textStyle={{ color: '#222831', fontWeight: 'bold' }}>Item</DataTable.Title>
          <DataTable.Title textStyle={{ color: '#222831', fontWeight: 'bold' }}>Description</DataTable.Title>
          <DataTable.Title textStyle={{ color: '#222831', fontWeight: 'bold' }}>Purity</DataTable.Title>
          <DataTable.Title textStyle={{ color: '#222831', fontWeight: 'bold' }}>Weight</DataTable.Title>
          <DataTable.Title textStyle={{ color: '#222831', fontWeight: 'bold' }}>Rate/Gram</DataTable.Title>
          <DataTable.Title textStyle={{ color: '#222831', fontWeight: 'bold' }}>Making Total</DataTable.Title>
          <DataTable.Title textStyle={{ color: '#222831', fontWeight: 'bold' }}>GST</DataTable.Title>
          <DataTable.Title textStyle={{ color: '#222831', fontWeight: 'bold' }}>Amount</DataTable.Title>
          <DataTable.Title> </DataTable.Title>
        </DataTable.Header>
        {items.map((item, idx) => (
          <DataTable.Row key={idx}>
            <DataTable.Cell style={{ minWidth: 80 }} textStyle={{ color: '#222831' }}>
              <View style={{ position: 'relative' }}>
                <TextInput
                  value={item.name}
                  onChangeText={t => handleItemChange(idx, 'name', t)}
                  placeholder="Name"
                  style={{ backgroundColor: 'transparent', minWidth: 60, color: '#222831' }}
                  textColor="#222831"
                  underlineColor="#7c3aed"
                  activeUnderlineColor="#7c3aed"
                  onFocus={() => handleItemChange(idx, 'showDropdown', 'true')}
                  onBlur={() => setTimeout(() => handleItemChange(idx, 'showDropdown', ''), 200)}
                />
                {/* Portal-based dropdown overlay for robust stacking */}
                <Portal>
                  {item.showDropdown === 'true' && inventoryNames.length > 0 && item.name && (
                    <View
                      style={{
                        position: 'absolute',
                        // Use getBoundingClientRect for web, fallback for native
                        top: (() => {
                          if (typeof window !== 'undefined' && Platform.OS === 'web') {
                            const el = document.activeElement as HTMLElement | null;
                            if (el) {
                              const rect = el.getBoundingClientRect();
                              return rect.bottom + window.scrollY;
                            }
                          }
                          return 180 + idx * 56; // fallback: estimate position
                        })(),
                        left: (() => {
                          if (typeof window !== 'undefined' && Platform.OS === 'web') {
                            const el = document.activeElement as HTMLElement | null;
                            if (el) {
                              const rect = el.getBoundingClientRect();
                              return rect.left + window.scrollX;
                            }
                          }
                          return 100; // fallback
                        })(),
                        width: 240,
                        backgroundColor: '#fff',
                        borderWidth: 1,
                        borderColor: '#7c3aed',
                        borderRadius: 6,
                        zIndex: 99999,
                        maxHeight: 180,
                        boxShadow: Platform.OS === 'web' ? '0 4px 16px rgba(0,0,0,0.18)' : undefined,
                        elevation: 12,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.18,
                        shadowRadius: 8,
                        cursor: Platform.OS === 'web' ? 'pointer' : undefined,
                        overflow: 'visible',
                      }}
                    >
                      <FlatList
                        data={inventoryNames.filter(n => {
                          const nNorm = n.trim().toLowerCase();
                          const inputNorm = (item.name || '').trim().toLowerCase();
                          return nNorm.includes(inputNorm);
                        })}
                        keyExtractor={item => item}
                        renderItem={({ item: name }) => (
                          <TouchableOpacity
                            onPress={async () => {
                              try {
                                const found = await apiFindInventoryByName(name);
                                if (found) {
                                  handleItemChange(idx, 'name', found.ItemName);
                                  handleItemChange(idx, 'desc', found.Description || '');
                                  handleItemChange(idx, 'weight', found.WeightPerPiece ? found.WeightPerPiece.toString() : '');
                                  handleItemChange(idx, 'inventory_id', found.id ? String(found.id) : '');
                                } else {
                                  handleItemChange(idx, 'name', name);
                                  handleItemChange(idx, 'inventory_id', '');
                                }
                              } catch {
                                handleItemChange(idx, 'name', name);
                                handleItemChange(idx, 'inventory_id', '');
                              }
                              handleItemChange(idx, 'showDropdown', '');
                            }}
                            style={{ padding: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' }}
                            activeOpacity={0.7}
                          >
                            <Text style={{ color: '#222831', fontSize: 17 }}>{name}</Text>
                          </TouchableOpacity>
                        )}
                        keyboardShouldPersistTaps="always"
                        style={{ maxHeight: 180 }}
                      />
                    </View>
                  )}
                </Portal>
              </View>
            </DataTable.Cell>
            <DataTable.Cell style={{ minWidth: 100 }} textStyle={{ color: '#222831' }}>
              <TextInput value={item.desc} onChangeText={t => handleItemChange(idx, 'desc', t)} placeholder="Desc" style={{ backgroundColor: 'transparent', minWidth: 80, color: '#222831' }} textColor="#222831" underlineColor="#7c3aed" activeUnderlineColor="#7c3aed" />
            </DataTable.Cell>
            <DataTable.Cell style={{ minWidth: 60 }} textStyle={{ color: '#222831' }}>
              <TextInput value={item.purity} onChangeText={t => handleItemChange(idx, 'purity', t)} placeholder="22K" style={{ backgroundColor: 'transparent', minWidth: 40, color: '#222831' }} textColor="#222831" underlineColor="#7c3aed" activeUnderlineColor="#7c3aed" />
            </DataTable.Cell>
            <DataTable.Cell style={{ minWidth: 60 }} textStyle={{ color: '#222831' }}>
              <TextInput value={item.weight} onChangeText={t => handleItemChange(idx, 'weight', t)} placeholder="gms" style={{ backgroundColor: 'transparent', minWidth: 40, color: '#222831' }} keyboardType="numeric" textColor="#222831" underlineColor="#7c3aed" activeUnderlineColor="#7c3aed" />
            </DataTable.Cell>
            <DataTable.Cell style={{ minWidth: 60 }} textStyle={{ color: '#222831' }}>
              <TextInput value={item.rate} editable={false} placeholder="Rate" style={{ backgroundColor: 'transparent', minWidth: 40, color: '#222831' }} keyboardType="numeric" textColor="#222831" underlineColor="#7c3aed" activeUnderlineColor="#7c3aed" />
            </DataTable.Cell>
            <DataTable.Cell style={{ minWidth: 60 }} textStyle={{ color: '#222831' }}>
              <TextInput value={item.makingTotal || ''} editable={false} placeholder="Making Total" style={{ backgroundColor: 'transparent', minWidth: 40, color: '#222831' }} keyboardType="numeric" textColor="#222831" underlineColor="#7c3aed" activeUnderlineColor="#7c3aed" />
            </DataTable.Cell>
            <DataTable.Cell style={{ minWidth: 60 }} textStyle={{ color: '#222831' }}>
              <TextInput value={item.gst} editable={false} placeholder="GST" style={{ backgroundColor: 'transparent', minWidth: 40, color: '#222831' }} keyboardType="numeric" textColor="#222831" underlineColor="#7c3aed" activeUnderlineColor="#7c3aed" />
            </DataTable.Cell>
            <DataTable.Cell style={{ minWidth: 80 }} textStyle={{ color: '#222831' }}>
              <TextInput value={item.amount} editable={false} placeholder="Amount" style={{ backgroundColor: 'transparent', minWidth: 60, color: '#222831' }} keyboardType="numeric" textColor="#222831" underlineColor="#7c3aed" activeUnderlineColor="#7c3aed" />
            </DataTable.Cell>
            <DataTable.Cell>
              <Button icon="delete" onPress={() => removeItemRow(idx)} compact color="#c00">Delete</Button>
            </DataTable.Cell>
          </DataTable.Row>
        ))}
        <DataTable.Row>
          <DataTable.Cell style={{ justifyContent: 'center' }} textStyle={{ color: '#222831' }}>
            <Button icon="plus" onPress={addItemRow} mode="outlined" textColor="#7c3aed" style={{ borderColor: '#7c3aed' }}>Add Item</Button>
          </DataTable.Cell>
        </DataTable.Row>
      </DataTable>
      {/* Totals Section */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
        <View style={{ minWidth: 220 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#222831' }}>₹{subtotal.toFixed(2)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#222831' }}>₹{totalMaking.toFixed(2)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#222831' }}>₹{totalGST.toFixed(2)}</Text>
          </View>
          <Divider style={{ marginVertical: 4 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: 'bold', color: '#7c3aed' }}>₹{grandTotal.toFixed(2)}</Text>
          </View>
        </View>
      </View>
      {/* Payment Details & Notes */}
      <Card style={{ marginTop: 16, padding: 8, backgroundColor: '#f0f4f8' }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 4, color: '#222831' }}>Payment Details</Text>
        <Text style={{ color: '#222831' }}>Bank: HDFC Bank</Text>
        <Text style={{ color: '#222831' }}>Account No: 1234567890</Text>
        <Text style={{ color: '#222831' }}>IFSC: HDFC0001234</Text>
        <Text style={{ color: '#222831' }}>UPI: pjdjewels@hdfcbank</Text>
      </Card>
      <Card style={{ marginTop: 12, padding: 8, backgroundColor: '#f0f4f8' }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 4, color: '#222831' }}>Notes / Terms</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          style={{ backgroundColor: 'transparent', minHeight: 40, color: '#222831' }}
          textColor="#222831"
          underlineColor="#7c3aed"
          activeUnderlineColor="#7c3aed"
        />
        <Text style={{ fontSize: 12, color: '#444', marginTop: 4 }}>
          *Goods once sold will not be taken back or exchanged. Warranty as per product. Please retain this bill for future reference.
        </Text>
      </Card>
      {/* Signature */}
      <View style={{ alignItems: 'flex-end', marginTop: 24 }}>
        <Text style={{ fontWeight: 'bold', marginBottom: 32, color: '#222831' }}>Authorized Signature</Text>
      </View>
      {error ? <Text style={{ color: 'red', marginTop: 8 }}>{error}</Text> : null}
      <Button mode="contained" style={{ marginTop: 16, marginBottom: 32, backgroundColor: '#7c3aed' }} labelStyle={{ color: '#fff', fontWeight: 'bold' }} onPress={handleSaveInvoice} loading={saving} disabled={saving}>
        Print & Save Invoice
      </Button>
      {/* Debug: Preview generated HTML in modal WebView to ensure PDF matches HTML exactly. */}
      <Button mode="outlined" style={{ marginBottom: 32, borderColor: '#7c3aed' }} labelStyle={{ color: '#7c3aed', fontWeight: 'bold' }} onPress={() => {
        const html = generateInvoiceHTML();
        if (Platform.OS === 'web') {
          // Open in new tab as data URL for web
          const blob = new Blob([html], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
        } else {
          setHtmlPreview(html);
          setShowHtmlPreview(true);
        }
      }}>
        Preview Invoice HTML
      </Button>
      {Platform.OS !== 'web' && (
        <Modal visible={showHtmlPreview} animationType="slide" onRequestClose={() => setShowHtmlPreview(false)}>
          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <Button onPress={() => setShowHtmlPreview(false)} style={{ margin: 16 }} mode="contained">Close Preview</Button>
            <WebView
              originWhitelist={["*"]}
              source={{ html: htmlPreview }}
              style={{ flex: 1 }}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
            />
          </View>
        </Modal>
      )}
      {/* Note: The PDF/printout will match the generated HTML, not the React Native UI. */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    // flex: 1, // Remove this line to allow ScrollView to size content properly
    alignItems: 'stretch',
    padding: 24,
    backgroundColor: '#fff',
  },
});

import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { useAuth } from './AuthContext';

const API_BASE = Platform.OS === 'web' ? 'https://localhost:4000/api' : 'https://192.168.29.102:4000/api';

// Remove all direct SQLite usage from frontend
let db: any = null;

// Create all required tables for the app
export async function initializeDatabase() {
  // No-op: DB is managed by backend now
}

// --- JWT fetch wrapper ---
export async function apiFetch(url: string, options: any = {}, tokenOverride?: string) {
  // For login endpoint, do not send Authorization header
  const isLogin = url.includes('/login');
  let headers = options.headers || {};
  if (!isLogin && tokenOverride) {
    headers['Authorization'] = `Bearer ${tokenOverride}`;
  }
  // Always send credentials for cookie-based auth
  const res = await fetch(url, { ...options, headers, credentials: 'include' });
  if (res.status === 401) {
    throw new Error('Session expired. Please log in again.');
  }
  return res;
}

export async function apiLogin(username: string, password: string) {
  const res = await apiFetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
  return res.json();
}

export async function apiGetInventory() {
  const res = await apiFetch(`${API_BASE}/inventory`);
  if (!res.ok) throw new Error('Failed to fetch inventory');
  return res.json();
}

export async function apiAddInventory(item: { ItemName: string, Description: string, Quantity: number, WeightPerPiece: number }) {
  const res = await apiFetch(`${API_BASE}/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  if (!res.ok) throw new Error('Failed to add inventory');
  return res.json();
}

export async function apiDeleteInventory(id: number) {
  const res = await apiFetch(`${API_BASE}/inventory/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete inventory');
  return res.json();
}

export async function apiAddInvoice(invoice: {
  customer_id: number;
  date: string;
  total: number;
  items: Array<{ inventory_id: number; quantity: number; price: number }>;
}) {
  const res = await apiFetch(`${API_BASE}/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice)
  });
  if (!res.ok) throw new Error('Failed to create invoice');
  return res.json();
}

export async function apiGetGoldSettings() {
  const res = await apiFetch(`${API_BASE}/gold-settings`);
  if (!res.ok) throw new Error('Failed to fetch gold settings');
  return res.json();
}

// Add API function to update gold settings
export async function apiUpdateGoldSettings({ gold_rate, gst_rate, making_charge_per_gram }: { gold_rate: number; gst_rate: number; making_charge_per_gram: number }) {
  const res = await apiFetch(`${API_BASE}/gold-settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gold_rate, gst_rate, making_charge_per_gram })
  });
  if (!res.ok) throw new Error('Failed to update gold settings');
  return res.json();
}

export async function apiGetInventoryNames(q: string) {
  const res = await apiFetch(`${API_BASE}/inventory-names?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('Failed to fetch inventory names');
  return res.json();
}

export async function apiAddOrGetCustomer(customer: { name: string; contact?: string; address?: string }) {
  const res = await apiFetch(`${API_BASE}/add-or-get-customer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer)
  });
  if (!res.ok) throw new Error('Failed to add or get customer');
  const data = await res.json();
  return data.id;
}

export async function apiGetInvoices() {
  const res = await apiFetch(`${API_BASE}/invoices`);
  if (!res.ok) throw new Error('Failed to fetch invoices');
  return res.json();
}

/**
 * Uploads a PDF file for an invoice to the backend and links it to the invoice.
 * @param {number} invoiceId - The ID of the invoice to link the PDF to.
 * @param {string} pdfUri - The local URI of the PDF file to upload.
 * @returns {Promise<Response>} The fetch response from the backend.
 */
export async function apiUploadInvoicePDF(invoiceId: number, pdfUri: string) {
  const formData = new FormData();
  formData.append('invoice_id', String(invoiceId));
  formData.append('pdf', {
    uri: pdfUri,
    name: `invoice_${invoiceId}.pdf`,
    type: 'application/pdf',
  } as any);
  
  return apiFetch(`${API_BASE}/upload-invoice-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    body: formData,
  });
}

export async function apiFindInventoryByName(name: string) {
  // Fetch all inventory and find by ItemName (case-insensitive, trimmed)
  const all = await apiGetInventory();
  const found = all.find((inv: any) =>
    (inv.ItemName || '').trim().toLowerCase() === name.trim().toLowerCase()
  );
  return found;
}

export async function apiUpdateInventoryQuantity({ ItemName, WeightPerPiece, QuantityToAdd }: { ItemName: string, WeightPerPiece: number, QuantityToAdd: number }) {
  const res = await apiFetch(`${API_BASE}/inventory/update-quantity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ItemName, WeightPerPiece, QuantityToAdd })
  });
  if (!res.ok) throw new Error('Failed to update inventory quantity');
  return res.json();
}

export async function apiUpdateInventory(item: { id: number, ItemName: string, Description: string, Quantity: number, WeightPerPiece: number }) {
  const res = await apiFetch(`${API_BASE}/inventory/${item.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
  if (!res.ok) throw new Error('Failed to update inventory');
  return res.json();
}

export default db;
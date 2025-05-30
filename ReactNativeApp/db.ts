import { Platform } from 'react-native';
import { useState } from 'react';

// Use Render URL for production, localhost for local development
const API_BASE = Platform.OS === 'web'
  ? (window.location.hostname === 'localhost' ? 'http://localhost:4000/api' : 'https://goldshopmanager.onrender.com/api')
  : 'https://goldshopmanager.onrender.com/api';

// --- WebSocket setup ---
const WS_URL = Platform.OS === 'web'
  ? (window.location.hostname === 'localhost' ? 'ws://localhost:4000' : 'wss://goldshopmanager.onrender.com')
  : 'wss://goldshopmanager.onrender.com';

let ws: WebSocket | null = null;
let wsReady: Promise<void> | null = null;
let wsToken: string | null = null;
let wsReqId = 1;
const wsPending: Record<number, { resolve: Function, reject: Function }> = {};
let sessionExpiredCallbacks: (() => void)[] = [];

export function onSessionExpired(cb: () => void) {
  sessionExpiredCallbacks.push(cb);
}

// --- Session ID persistence (not JWT) ---
const SESSION_ID_KEY = 'session_id';

function getSessionId() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage.getItem(SESSION_ID_KEY);
  }
  return null;
}

function setSessionId(id: string | null) {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (id) window.localStorage.setItem(SESSION_ID_KEY, id);
    else window.localStorage.removeItem(SESSION_ID_KEY);
  }
}

function ensureWS() {
  if (ws && ws.readyState === 1) return Promise.resolve();
  if (wsReady) return wsReady;
  ws = new WebSocket(WS_URL);
  wsReady = new Promise((resolve, reject) => {
    ws!.onopen = () => resolve();
    ws!.onerror = (e) => reject(e);
    ws!.onclose = () => {
      wsReady = null;
      ws = null;
    };
    ws!.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.action === 'sessionExpired') {
          setSessionId(null); // Clear sessionId on session expiration
          sessionExpiredCallbacks.forEach(cb => cb());
          sessionExpiredCallbacks = [];
          return;
        }
        if (msg.reqId && wsPending[msg.reqId]) {
          if (msg.status === 'success') wsPending[msg.reqId].resolve(msg.data);
          else wsPending[msg.reqId].reject(new Error(msg.error || 'WebSocket error'));
          delete wsPending[msg.reqId];
        }
      } catch {}
    };
  });
  return wsReady;
}

function wsSend(action: string, payload: any = {}, tokenOverride?: string): Promise<any> {
  return ensureWS().then(() => {
    return new Promise((resolve, reject) => {
      const reqId = wsReqId++;
      wsPending[reqId] = { resolve, reject };
      // Always send the latest wsToken and sessionId in every API call
      const sessionId = getSessionId();
      ws!.send(JSON.stringify({ action, payload, token: wsToken, sessionId, reqId }));
      // Timeout after 10s
      setTimeout(() => {
        if (wsPending[reqId]) {
          wsPending[reqId].reject(new Error('WebSocket timeout'));
          delete wsPending[reqId];
        }
      }, 10000);
    });
  });
}

// --- API functions using WebSocket ---
export async function apiLogin(username: string, password: string) {
  const resp = await wsSend('login', { username, password });
  wsToken = resp.token || (resp.data && resp.data.token) || null;
  // Store sessionId if provided by backend
  const sessionId = resp.sessionId || (resp.data && resp.data.sessionId) || null;
  setSessionId(sessionId);
  return resp;
}

// On app start, if sessionId exists, try to resume session
(async function tryResumeSession() {
  const sessionId = getSessionId();
  if (sessionId) {
    try {
      // Ask backend to resume session and get a new JWT
      const resp = await wsSend('resumeSession', { sessionId });
      wsToken = resp.token || (resp.data && resp.data.token) || null;
      if (!wsToken) setSessionId(null); // Remove invalid sessionId
    } catch {
      setSessionId(null);
    }
  }
})();

export async function apiGetInventory() {
  return wsSend('getInventory');
}

export async function apiAddInventory(item: { ItemName: string, Description: string, Quantity: number, WeightPerPiece: number }) {
  return wsSend('addInventory', item);
}

export async function apiDeleteInventory(id: number) {
  return wsSend('deleteInventory', { id });
}

// Remove all direct SQLite usage from frontend
let db: any = null;

// Create all required tables for the app
export async function initializeDatabase() {
  // No-op: DB is managed by backend now
}

// --- The following REST-based API functions are not yet migrated to WebSocket ---
function notYetMigrated(name: string): never {
  throw new Error(`${name} is not yet supported via WebSocket. Please migrate this endpoint.`);
}

export async function apiAddInvoice(invoice: any) {
  return wsSend('addInvoice', invoice);
}
export async function apiGetGoldSettings() {
  return wsSend('getGoldSettings');
}
export async function apiUpdateGoldSettings({ gold_rate, gst_rate, making_charge_per_gram }: { gold_rate: number, gst_rate: number, making_charge_per_gram: number }) {
  return wsSend('updateGoldSettings', { gold_rate, gst_rate, making_charge_per_gram });
}
export async function apiGetInventoryNames(query: string) {
  return wsSend('getInventoryNames', { query });
}
export async function apiAddOrGetCustomer(customer: any) {
  return wsSend('addOrGetCustomer', customer);
}
export async function apiGetInvoices() {
  return wsSend('getInvoices');
}
export async function apiUploadInvoicePDF(invoiceId: number, pdfBase64: string) {
  return wsSend('uploadInvoicePDF', { invoiceId, pdfBase64 });
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
  return wsSend('updateInventoryQuantity', { ItemName, WeightPerPiece, QuantityToAdd });
}

// --- API function for getting all customers ---
export async function apiGetCustomers() {
  return wsSend('getCustomers');
}

export async function apiUpdateCustomer(customer: any) {
  return wsSend('updateCustomer', customer);
}
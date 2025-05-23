import React from 'react';
import { View, Platform } from 'react-native';

const NAV_LINKS = [
  { label: 'Dashboard', screen: '/dashboard' },
  { label: 'Invoices', screen: '/invoice' },
  { label: 'Billing History', screen: '/billing-history' },
  { label: 'Inventory', screen: '/inventory' },
  { label: 'Customers', screen: '/customers' },
  { label: 'Gold Settings', screen: '/gold-settings' },
  { label: 'Login', screen: '/login' },
];

export default function WebNavBanner() {
  if (Platform.OS !== 'web') return null;
  return (
    <View style={{
      width: '100%',
      backgroundColor: '#ede9fe',
      padding: 12,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderColor: '#d1c4e9',
      marginBottom: 18,
      zIndex: 100,
    }}>
      {NAV_LINKS.map(({ label, screen }, idx) => (
        <a
          key={label}
          href={screen}
          style={{
            color: '#7c3aed',
            fontWeight: 'bold',
            fontSize: 16,
            marginRight: idx !== NAV_LINKS.length - 1 ? 24 : 0,
            textDecoration: 'none',
            padding: '4px 10px',
            borderRadius: 6,
            background: window.location.pathname === screen ? '#d1c4e9' : 'transparent',
            transition: 'background 0.2s',
          }}
        >
          {label}
        </a>
      ))}
    </View>
  );
}

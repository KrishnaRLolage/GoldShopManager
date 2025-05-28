import React from 'react';
import { View, Platform } from 'react-native';
import PJDiamondIcon from '../assets/PJDiamondIcon';

const NAV_LINKS = [
  { label: 'Dashboard', screen: '/dashboard' },
  { label: 'Invoices', screen: '/invoice' },
  { label: 'Billing History', screen: '/billing-history' },
  { label: 'Inventory', screen: '/inventory' },
  { label: 'Customers', screen: '/customers' },
  // { label: 'Gold Settings', screen: '/gold-settings' },
  // { label: 'Login', screen: '/login' },
];

export default function WebNavBanner() {
  if (Platform.OS !== 'web') return null;
  return (
    <View style={{
      width: '100%',
      backgroundColor: '#ede9fe',
      padding: 0,
      borderBottomWidth: 1,
      borderColor: '#d1c4e9',
      marginBottom: 18,
      zIndex: 100,
    }}>
      {/* Top row: Date/Time left, Shop name/logo center */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 18, width: '100%' }}>
        {/* Date/Time left */}
        <div style={{ position: 'absolute', left: 24, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', height: '100%' }}>
          <DateTimeDisplay />
        </div>
        {/* Shop name and logo center */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
          <PJDiamondIcon size={140} style={{ marginRight: 16 }} />
          <span style={{ fontWeight: 'bold', fontSize: 28, color: '#7c3aed', textAlign: 'center', fontFamily: 'inherit' }}>Pallavi Jewellers</span>
        </div>
      </View>
      {/* Navigation links */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ede9fe',
        padding: 12,
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
    </View>
  );
}

// DateTimeDisplay component for left side
function DateTimeDisplay() {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const day = now.toLocaleDateString(undefined, { weekday: 'long' });
  const date = now.toLocaleDateString();
  const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', color: '#7c3aed', fontWeight: 600, fontSize: 22, lineHeight: 1.25 }}>
      <span>{day}</span>
      <span>{date}</span>
      <span>{time}</span>
    </div>
  );
}

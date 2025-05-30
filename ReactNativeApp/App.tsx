import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, Appbar } from 'react-native-paper';
import * as React from 'react';

import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import DashboardScreen from './screens/DashboardScreen';
import InvoiceScreen from './screens/InvoiceScreen';
import InventoryScreen from './screens/InventoryScreen';
import BillingHistoryScreen from './screens/BillingHistoryScreen';
import CustomersScreen from './screens/CustomersScreen';
import { SessionExpiredScreen } from './components/SessionExpiredScreen';
import { onSessionExpired } from './db';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: [Platform.OS === 'web' ? window.location.origin + '/#' : ''],
  config: {
    screens: {
      Login: 'login',
      Signup: 'signup',
      Dashboard: 'dashboard',
      Invoice: 'invoice',
      Inventory: 'inventory',
      BillingHistory: 'billing-history',
      Customers: 'customers',
    },
  },
};

function withAppBar(ScreenComponent: React.ComponentType<any>, title: string) {
  return function WrappedScreen(props: any) {
    const navigation = props.navigation;
    return (
      <>
        {Platform.OS !== 'web' && (
          <Appbar.Header style={{ width: '100%', backgroundColor: '#7c3aed' }}>
            {navigation && navigation.canGoBack && navigation.canGoBack() && (
              <Appbar.BackAction onPress={() => navigation.goBack()} />
            )}
            <Appbar.Content title={title} titleStyle={{ color: '#fff', fontWeight: 'bold' }} />
          </Appbar.Header>
        )}
        <ScreenComponent {...props} />
      </>
    );
  };
}

export default function App() {
  const [sessionExpired, setSessionExpired] = React.useState(false);
  const navigationRef = React.useRef<any>(null);

  React.useEffect(() => {
    onSessionExpired(() => {
      setSessionExpired(true);
      navigationRef.current?.navigate('SessionExpired');
    });
  }, []);

  // Handler for 'Login Again' button
  function handleSessionExpiredLoginAgain() {
    setSessionExpired(false);
    navigationRef.current?.reset({ index: 0, routes: [{ name: 'Login' }] });
  }

  return (
    <PaperProvider>
      <NavigationContainer linking={linking} ref={navigationRef}>
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="SessionExpired">
            {props => <SessionExpiredScreen {...props} onLogin={handleSessionExpiredLoginAgain} />}
          </Stack.Screen>
          <Stack.Screen name="Login" component={withAppBar(LoginScreen, 'Login')} />
          <Stack.Screen name="Signup" component={withAppBar(SignupScreen, 'Sign Up')} />
          <Stack.Screen name="Dashboard" component={withAppBar(DashboardScreen, 'Dashboard')} />
          <Stack.Screen name="Invoice" component={withAppBar(InvoiceScreen, 'Create Invoice')} />
          <Stack.Screen name="Inventory" component={withAppBar(InventoryScreen, 'Inventory')} />
          <Stack.Screen name="BillingHistory" component={withAppBar(BillingHistoryScreen, 'Billing History')} />
          <Stack.Screen name="Customers" component={withAppBar(CustomersScreen, 'Customers')} />
          <Stack.Screen name="GoldSettingsEdit" component={withAppBar(require('./screens/GoldSettingsEditScreen').default, 'Edit Gold Settings')} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

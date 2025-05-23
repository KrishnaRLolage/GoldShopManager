import * as React from 'react';
import { View, StyleSheet, ScrollView, Keyboard, FlatList, TouchableOpacity, Platform } from 'react-native';
import { Text, Button, Avatar } from 'react-native-paper';
import { useState, useEffect } from 'react';
import { DataTable, TextInput, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { apiGetInventory, apiAddInventory, apiDeleteInventory, apiGetInventoryNames, apiUpdateInventoryQuantity } from '../db';
import WebNavBanner from '../components/WebNavBanner';
import { withAuthGuard } from '../withAuthGuard';

type InventoryItem = {
  id?: number;
  ItemName: string;
  Description: string;
  Quantity: string;
  WeightPerPiece: string;
  TotalWeight: string;
};

export default withAuthGuard(function InventoryScreen(props: any) {
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]); // For non-editable table
  const [addItem, setAddItem] = useState<InventoryItem>({ ItemName: '', Description: '', Quantity: '', WeightPerPiece: '', TotalWeight: '' });
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [nameQuery, setNameQuery] = useState('');
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [allItemNames, setAllItemNames] = useState<string[]>([]); // For dropdown filter
  const [selectedItemName, setSelectedItemName] = useState<string>('All Items');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const navigation = useNavigation();

  // Load all inventory item names for dropdown filter
  useEffect(() => {
    apiGetInventoryNames('').then(names => {
      setAllItemNames(names);
    });
  }, []);

  // Load inventory items from backend API, optionally filtered by item name
  const loadInventory = async (filterName?: string) => {
    try {
      const all = await apiGetInventory();
      const mapped = all.map((row: any) => ({
        id: row.id,
        ItemName: row.ItemName || '',
        Description: row.Description || '',
        Quantity: row.Quantity?.toString() || '',
        WeightPerPiece: row.WeightPerPiece?.toString() || '',
        TotalWeight: row.TotalWeight?.toString() || '',
      }));
      if (filterName && filterName !== 'All Items') {
        setInventoryList(mapped.filter((item: InventoryItem) => item.ItemName === filterName));
      } else {
        setInventoryList(mapped);
      }
    } catch (e) {
      console.error('Failed to load inventory:', e);
    }
  };

  useEffect(() => {
    loadInventory(selectedItemName);
  }, [selectedItemName]);

  useEffect(() => {
    // Enable keyboard navigation for web: left/right arrow to move between pages
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        // Go back if possible
        if (navigation.canGoBack && navigation.canGoBack()) {
          navigation.goBack();
        }
      } else if (e.key === 'ArrowRight') {
        // Go to Dashboard screen by key (for web navigation)
        // @ts-ignore
        navigation.navigate && navigation.navigate('Dashboard');
      }
    };
    // Only add event listener if running on web
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [navigation]);

  // Autocomplete: fetch suggestions as user types
  useEffect(() => {
    let active = true;
    if (nameQuery.length > 0) {
      apiGetInventoryNames(nameQuery).then(suggestions => {
        if (active) setNameSuggestions(suggestions);
      }).catch(() => setNameSuggestions([]));
    } else {
      setNameSuggestions([]);
    }
    return () => { active = false; };
  }, [nameQuery]);

  const handleChange = (field: keyof InventoryItem, value: string) => {
    let newItem = { ...addItem, [field]: value };
    if (field === 'Quantity' || field === 'WeightPerPiece') {
      const qty = parseInt(field === 'Quantity' ? value : newItem.Quantity) || 0;
      const wpp = parseFloat(field === 'WeightPerPiece' ? value : newItem.WeightPerPiece) || 0;
      newItem.TotalWeight = (qty * wpp).toString();
    }
    setAddItem(newItem);
  };

  const handleAddRow = async () => {
    Keyboard.dismiss();
    setTimeout(async () => {
      const newItem = { ...addItem };
      try {
        // Check if item with same name and weight per piece exists
        const all = await apiGetInventory();
        const match = all.find((inv: any) =>
          (inv.ItemName || '').trim().toLowerCase() === newItem.ItemName.trim().toLowerCase() &&
          parseFloat(inv.WeightPerPiece) === parseFloat(newItem.WeightPerPiece)
        );
        if (match) {
          // Update quantity
          await apiUpdateInventoryQuantity({
            ItemName: newItem.ItemName,
            WeightPerPiece: parseFloat(newItem.WeightPerPiece),
            QuantityToAdd: newItem.Quantity ? parseInt(newItem.Quantity) : 0
          });
        } else {
          // Add new entry
          await apiAddInventory({
            ItemName: newItem.ItemName,
            Description: newItem.Description,
            Quantity: newItem.Quantity ? parseInt(newItem.Quantity) : 0,
            WeightPerPiece: newItem.WeightPerPiece ? parseFloat(newItem.WeightPerPiece) : 0
          });
        }
        setAddItem({ ItemName: '', Description: '', Quantity: '', WeightPerPiece: '', TotalWeight: '' });
        await loadInventory();
      } catch (e) {
        console.error('Failed to add or update inventory item:', e);
      }
    }, 0);
  };

  // Delete inventory item by row index (using id as identifier)
  const handleDeleteRow = async (item: InventoryItem) => {
    if (!item.id) return;
    try {
      await apiDeleteInventory(item.id);
      await loadInventory();
    } catch (e) {
      console.error('Failed to delete inventory item:', e);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <WebNavBanner />
      {/* Dropdown for filtering inventory by item name */}
      <View style={{ marginBottom: 16, zIndex: 20 }}>
        <TouchableOpacity
          style={{ borderWidth: 2, borderColor: '#7c3aed', borderRadius: 6, padding: 10, backgroundColor: '#f0f4f8' }}
          onPress={() => setShowItemDropdown(!showItemDropdown)}
        >
          <Text style={{ color: '#222831', fontWeight: '600' }}>{selectedItemName || 'All Items'}</Text>
        </TouchableOpacity>
        {showItemDropdown && (
          <View style={{ position: 'absolute', top: 48, left: 0, right: 0, backgroundColor: '#fff', borderWidth: 1, borderColor: '#7c3aed', borderRadius: 6, zIndex: 30, maxHeight: 200 }}>
            <FlatList
              data={['All Items', ...allItemNames]}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedItemName(item);
                    setShowItemDropdown(false);
                  }}
                  style={{ padding: 12, backgroundColor: item === selectedItemName ? '#e0e7ff' : '#fff' }}
                >
                  <Text style={{ color: '#222831' }}>{item}</Text>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}
      </View>
      {/* Editable Table: Only one row for adding inventory */}
      <DataTable style={{ width: '100%', zIndex: 1 }}>
        <DataTable.Header style={{ backgroundColor: '#222831' }}>
          <DataTable.Title style={{ flex: 2 }} textStyle={{ color: '#fff', fontWeight: 'bold' }}>Item Name</DataTable.Title>
          <DataTable.Title style={{ flex: 2 }} textStyle={{ color: '#fff', fontWeight: 'bold' }}>Description</DataTable.Title>
          <DataTable.Title style={{ flex: 1 }} textStyle={{ color: '#fff', fontWeight: 'bold' }}>Quantity</DataTable.Title>
          <DataTable.Title style={{ flex: 1 }} textStyle={{ color: '#fff', fontWeight: 'bold' }}>Weight/Pc</DataTable.Title>
          <DataTable.Title style={{ flex: 1 }} textStyle={{ color: '#fff', fontWeight: 'bold' }}>Total Weight</DataTable.Title>
          <DataTable.Title style={{ flex: 0.7 }} textStyle={{ color: '#fff', fontWeight: 'bold' }}>Action</DataTable.Title>
        </DataTable.Header>
        <DataTable.Row style={{ backgroundColor: '#f0f4f8' }}>
          <DataTable.Cell style={{ flex: 2, position: 'relative', zIndex: 200 }} textStyle={{ color: '#222831', fontWeight: '600' }}>
            <View style={{ flex: 1, position: 'relative' }}>
              <TextInput
                value={addItem.ItemName}
                onChangeText={text => {
                  setNameQuery(text);
                  handleChange('ItemName', text);
                  setShowNameDropdown(true);
                }}
                placeholder="Item Name"
                style={{ flex: 1, width: '100%', backgroundColor: 'transparent', height: 40, color: '#222831', fontWeight: '600', borderWidth: 2, borderColor: 'green', borderRadius: 6 }}
                placeholderTextColor="#888"
                theme={{ colors: { onSurface: '#222831', text: '#222831' } }}
                onBlur={() => setTimeout(() => setShowNameDropdown(false), 200)}
                onFocus={() => setShowNameDropdown(true)}
                autoCapitalize="words"
              />
              {showNameDropdown && nameSuggestions.length > 0 && (
                <View style={{
                  position: 'absolute',
                  top: 44,
                  left: 0,
                  right: 0,
                  backgroundColor: '#fff',
                  borderWidth: 1,
                  borderColor: '#7c3aed',
                  borderRadius: 6,
                  zIndex: 9999,
                  maxHeight: 150,
                  overflow: 'scroll', // Use 'scroll' for RN web compatibility
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.18,
                  shadowRadius: 8,
                  elevation: 10,
                }}>
                  <FlatList
                    data={nameSuggestions}
                    keyExtractor={item => item}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => {
                          handleChange('ItemName', item);
                          setNameQuery(item);
                          setShowNameDropdown(false);
                        }}
                        style={{ padding: 10 }}
                      >
                        <Text style={{ color: '#222831' }}>{item}</Text>
                      </TouchableOpacity>
                    )}
                    keyboardShouldPersistTaps="handled"
                  />
                </View>
              )}
            </View>
          </DataTable.Cell>
          <DataTable.Cell style={{ flex: 2 }} textStyle={{ color: '#222831', fontWeight: '600' }}>
            <TextInput
              value={addItem.Description}
              onChangeText={text => handleChange('Description', text)}
              placeholder="Description"
              style={{ flex: 1, width: '100%', backgroundColor: 'transparent', height: 40, color: '#222831', fontWeight: '600', borderWidth: 2, borderColor: 'green', borderRadius: 6 }}
              placeholderTextColor="#888"
              theme={{ colors: { onSurface: '#222831', text: '#222831' } }}
            />
          </DataTable.Cell>
          <DataTable.Cell style={{ flex: 1 }} textStyle={{ color: '#222831', fontWeight: '600' }}>
            <TextInput
              value={addItem.Quantity}
              onChangeText={text => handleChange('Quantity', text)}
              placeholder="Qty"
              keyboardType="numeric"
              style={{ flex: 1, width: '100%', backgroundColor: 'transparent', height: 40, minWidth: 60, color: '#222831', fontWeight: '600', borderWidth: 2, borderColor: 'green', borderRadius: 6 }}
              placeholderTextColor="#888"
              theme={{ colors: { onSurface: '#222831', text: '#222831' } }}
            />
          </DataTable.Cell>
          <DataTable.Cell style={{ flex: 1 }} textStyle={{ color: '#222831', fontWeight: '600' }}>
            <TextInput
              value={addItem.WeightPerPiece}
              onChangeText={text => handleChange('WeightPerPiece', text)}
              placeholder="Wt/Pc"
              keyboardType="numeric"
              style={{ flex: 1, width: '100%', backgroundColor: 'transparent', height: 40, minWidth: 60, color: '#222831', fontWeight: '600', borderWidth: 2, borderColor: 'green', borderRadius: 6 }}
              placeholderTextColor="#888"
              theme={{ colors: { onSurface: '#222831', text: '#222831' } }}
            />
          </DataTable.Cell>
          <DataTable.Cell style={{ flex: 1 }} textStyle={{ color: '#222831', fontWeight: '600' }}>
            <TextInput
              value={addItem.TotalWeight}
              editable={false}
              placeholder="Total Wt"
              keyboardType="numeric"
              style={{ flex: 1, width: '100%', backgroundColor: 'transparent', height: 40, minWidth: 60, color: '#222831', fontWeight: '600', borderWidth: 2, borderColor: 'green', borderRadius: 6 }}
              placeholderTextColor="#888"
              theme={{ colors: { onSurface: '#222831', text: '#222831' } }}
            />
          </DataTable.Cell>
          <DataTable.Cell style={{ flex: 0.7 }}>
            <Button mode="contained" onPress={handleAddRow} style={{ minWidth: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#7c3aed' }} labelStyle={{ color: '#fff', fontWeight: 'bold' }}>
              Add
            </Button>
          </DataTable.Cell>
        </DataTable.Row>
      </DataTable>
      {/* Non-editable Inventory List Table */}
      <Text style={{ marginTop: 32, marginBottom: 8, fontWeight: 'bold', fontSize: 18, color: '#222831' }}>All Inventory Items</Text>
      <DataTable style={{ width: '100%' }}>
        <DataTable.Header style={{ backgroundColor: '#e0e0e0' }}>
          <DataTable.Title style={{ flex: 2 }} textStyle={{ color: '#222831', fontWeight: 'bold' }}>Item Name</DataTable.Title>
          <DataTable.Title style={{ flex: 2 }} textStyle={{ color: '#222831', fontWeight: 'bold' }}>Description</DataTable.Title>
          <DataTable.Title style={{ flex: 1 }} textStyle={{ color: '#222831', fontWeight: 'bold' }}>Quantity</DataTable.Title>
          <DataTable.Title style={{ flex: 1 }} textStyle={{ color: '#222831', fontWeight: 'bold' }}>Weight/Pc</DataTable.Title>
          <DataTable.Title style={{ flex: 1 }} textStyle={{ color: '#222831', fontWeight: 'bold' }}>Total Weight</DataTable.Title>
          <DataTable.Title style={{ flex: 0.7 }} textStyle={{ color: '#222831', fontWeight: 'bold' }}>Delete</DataTable.Title>
        </DataTable.Header>
        {inventoryList.map((item, idx) => (
          <DataTable.Row
            key={item.id || idx}
            style={{ backgroundColor: idx % 2 === 0 ? '#f9fafb' : '#f0f4f8' }}
          >
            <DataTable.Cell style={{ flex: 2 }} textStyle={{ color: '#222831' }}>{item.ItemName}</DataTable.Cell>
            <DataTable.Cell style={{ flex: 2 }} textStyle={{ color: '#222831' }}>{item.Description}</DataTable.Cell>
            <DataTable.Cell style={{ flex: 1 }} textStyle={{ color: '#222831' }}>{item.Quantity}</DataTable.Cell>
            <DataTable.Cell style={{ flex: 1 }} textStyle={{ color: '#222831' }}>{item.WeightPerPiece}</DataTable.Cell>
            <DataTable.Cell style={{ flex: 1 }} textStyle={{ color: '#222831' }}>{item.TotalWeight}</DataTable.Cell>
            <DataTable.Cell style={{ flex: 0.7 }}>
              <IconButton icon="delete" onPress={() => handleDeleteRow(item)} theme={{ colors: { onSurface: '#c00' } }} />
            </DataTable.Cell>
          </DataTable.Row>
        ))}
      </DataTable>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'stretch',
    padding: 24,
    backgroundColor: '#fff',
  },
});

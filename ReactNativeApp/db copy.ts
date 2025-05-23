import * as SQLite from 'expo-sqlite';

// Use openDatabase for cross-platform (iOS, Android, Web) support
const db = SQLite.openDatabaseSync('jewelleryshop.db');

// Create all required tables for the app
export function initializeDatabase() {
  db.withExclusiveTransactionAsync(async tx => {
    // Users table
    tx.execAsync(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT
      );`
    );
    // Inventory table
    tx.execAsync(
      `CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        image TEXT
      );`
    );
    // Customers table
    tx.execAsync(
      `CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT
      );`
    );
    // Invoices table
    tx.execAsync(
      `CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        date TEXT NOT NULL,
        total REAL NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      );`
    );
    // Invoice Items table
    tx.execAsync(
      `CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER,
        inventory_id INTEGER,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id),
        FOREIGN KEY (inventory_id) REFERENCES inventory(id)
      );`
    );
    // Billing History table
    tx.execAsync(
      `CREATE TABLE IF NOT EXISTS billing_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER,
        payment_date TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id)
      );`
    );
  });
}

export default db;
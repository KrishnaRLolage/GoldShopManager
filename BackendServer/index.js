// BackendServer/index.js
const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const https = require("https");
const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "your-very-secret-key";
const JWT_EXPIRES_IN = 5 * 60; // 5 minutes (in seconds)

app.use(
  cors({
    origin: [
      "https://localhost:9443",
      "https://localhost:4000",
      "http://localhost:19006",
      "http://localhost:8081",
      "http://localhost:4000",
      "http://192.168.29.102:4000",
      "http://192.168.29.102:8081",
    ],
    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(cookieParser());

// SQLite DB setup
const db = new sqlite3.Database("./jewelleryshop.db", (err) => {
  if (err) {
    console.error("Could not connect to database", err);
  } else {
    console.log("Connected to SQLite database");
  }
});

// Create tables if not exist
const createTables = () => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'user'
    );`);
    db.run(`CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ItemName TEXT NOT NULL,
      Description TEXT,
      Quantity INTEGER NOT NULL,
      WeightPerPiece REAL NOT NULL,
      TotalWeight REAL NOT NULL
    );`);
    db.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT
    );`);
    db.run(`CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      date TEXT NOT NULL,
      total REAL NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );`);
    db.run(`CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER,
      inventory_id INTEGER,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id),
      FOREIGN KEY (inventory_id) REFERENCES inventory(id)
    );`);
    db.run(`CREATE TABLE IF NOT EXISTS billing_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER,
      payment_date TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    );`);
    db.run(`CREATE TABLE IF NOT EXISTS invoice_pdfs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      pdf_blob BLOB NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    );`);
    db.run(
      `INSERT OR IGNORE INTO users (username, password, name, role) VALUES ('admin', 'Qwerty@123', 'Administrator', 'admin');`
    );
    db.run(
      `CREATE TABLE IF NOT EXISTS gold_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gold_rate REAL NOT NULL,
      gst_rate REAL NOT NULL,
      making_charge_per_gram REAL NOT NULL,
      updated_at TEXT NOT NULL
    );`,
      () => {
        db.get("SELECT COUNT(*) as count FROM gold_settings", (err, row) => {
          if (!err && row.count === 0) {
            db.run(
              "INSERT INTO gold_settings (gold_rate, gst_rate, making_charge_per_gram, updated_at) VALUES (?, ?, ?, ?)",
              [
                9000,
                3,
                500,
                new Date().toLocaleString("en-IN", { hour12: false }),
              ]
            );
          }
        });
      }
    );
  });
};
createTables();

// Ensure invoice_pdfs directory exists
const pdfDir = path.join(__dirname, "invoice_pdfs");
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir);
}

// Set up storage for PDF uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "invoice_pdfs"));
  },
  filename: function (req, file, cb) {
    const invoiceId = req.body.invoice_id || "unknown";
    cb(null, `invoice_${invoiceId}_${Date.now()}.pdf`);
  },
});
const upload = multer({ storage });

// --- Gold Rate Settings Table and API ---
// API to get gold settings
app.get("/api/gold-settings", (req, res) => {
  db.get("SELECT * FROM gold_settings ORDER BY id DESC LIMIT 1", (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

// API to update gold settings
app.post("/api/gold-settings", (req, res) => {
  const { gold_rate, gst_rate, making_charge_per_gram } = req.body;
  if (
    typeof gold_rate !== "number" ||
    typeof gst_rate !== "number" ||
    typeof making_charge_per_gram !== "number"
  ) {
    return res.status(400).json({ error: "Invalid input types" });
  }
  const updated_at = new Date().toLocaleString("en-IN", { hour12: false });
  db.run(
    "INSERT INTO gold_settings (gold_rate, gst_rate, making_charge_per_gram, updated_at) VALUES (?, ?, ?, ?)",
    [gold_rate, gst_rate, making_charge_per_gram, updated_at],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    }
  );
});

// --- Backend: Use httpOnly, secure cookie for JWT session management ---
// Login endpoint: set JWT as httpOnly, secure cookie and return token in response for SPA/mobile
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  db.get(
    "SELECT * FROM users WHERE username = ? AND password = ?",
    [username, password],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(401).json({ error: "Invalid credentials" });
      // Issue JWT
      const token = jwt.sign(
        { id: row.id, username: row.username, role: row.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      // Set cookie (httpOnly, secure, sameSite=none)
      res.cookie("token", token, {
        httpOnly: true,
        secure: true, // Always true for SameSite=None
        sameSite: "none",
        maxAge: JWT_EXPIRES_IN * 1000,
      });
      const { password, ...userWithoutPassword } = row;
      res.json({ user: userWithoutPassword, token }); // <-- Return token in response for SPA/mobile
    }
  );
});

// JWT auth middleware (reads from cookie)
function authenticateJWT(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "No token provided" });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
}

// Protect all API routes except /api/login
app.use("/api", (req, res, next) => {
  if (req.path === "/login") return next();
  authenticateJWT(req, res, next);
});

// Logout endpoint: clear cookie
app.post("/api/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "none",
    secure: true,
  });
  res.json({ success: true });
});

// --- Add /api/session endpoint to check session from cookie ---
app.get("/api/session", (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "No session" });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: "Invalid or expired token" });
    res.json({ user });
  });
});

// --- API Endpoints ---
// Inventory CRUD
app.get("/api/inventory", (req, res) => {
  db.all("SELECT * FROM inventory", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/inventory", (req, res) => {
  const { ItemName, Description, Quantity, WeightPerPiece } = req.body;
  const TotalWeight =
    (parseFloat(WeightPerPiece) || 0) * (parseInt(Quantity) || 0);
  db.run(
    "INSERT INTO inventory (ItemName, Description, Quantity, WeightPerPiece, TotalWeight) VALUES (?, ?, ?, ?, ?)",
    [ItemName, Description, Quantity, WeightPerPiece, TotalWeight],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

app.delete("/api/inventory/:id", (req, res) => {
  db.run("DELETE FROM inventory WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// API to get inventory item names for autocomplete
app.get("/api/inventory-names", (req, res) => {
  const { q } = req.query;
  db.all(
    "SELECT DISTINCT ItemName FROM inventory WHERE ItemName LIKE ? ORDER BY ItemName LIMIT 10",
    [`%${q || ""}%`],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.map((r) => r.ItemName));
    }
  );
});

// Update inventory quantity for an item with same name and weight per piece
app.post("/api/inventory/update-quantity", (req, res) => {
  const { ItemName, WeightPerPiece, QuantityToAdd } = req.body;
  if (
    !ItemName ||
    typeof WeightPerPiece !== "number" ||
    typeof QuantityToAdd !== "number"
  ) {
    return res.status(400).json({ error: "Missing or invalid fields" });
  }
  db.get(
    "SELECT * FROM inventory WHERE ItemName = ? AND WeightPerPiece = ?",
    [ItemName, WeightPerPiece],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: "Item not found" });
      const newQty = row.Quantity + QuantityToAdd;
      const newTotalWeight = newQty * WeightPerPiece;
      db.run(
        "UPDATE inventory SET Quantity = ?, TotalWeight = ? WHERE id = ?",
        [newQty, newTotalWeight, row.id],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, id: row.id, newQty, newTotalWeight });
        }
      );
    }
  );
});

// Invoice creation endpoint
app.post("/api/invoices", (req, res) => {
  const { customer_id, date, total, items } = req.body;
  if (
    !customer_id ||
    !date ||
    !total ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return res
      .status(400)
      .json({ error: "Missing required invoice fields or items" });
  }
  db.run(
    "INSERT INTO invoices (customer_id, date, total) VALUES (?, ?, ?)",
    [customer_id, date, total],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      const invoiceId = this.lastID;
      // Insert invoice items
      const stmt = db.prepare(
        "INSERT INTO invoice_items (invoice_id, inventory_id, quantity, price) VALUES (?, ?, ?, ?)"
      );
      for (const item of items) {
        stmt.run(invoiceId, item.inventory_id, item.quantity, item.price);
      }
      stmt.finalize((err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: invoiceId });
      });
    }
  );
});

// Get all invoices with customer info for billing history
app.get("/api/invoices", (req, res) => {
  db.all(
    `SELECT invoices.id, invoices.date, invoices.total, 
            customers.name as customer_name, customers.address as customer_address, customers.phone as customer_contact,
            (SELECT id FROM invoice_pdfs WHERE invoice_id = invoices.id ORDER BY created_at DESC LIMIT 1) as pdf_id,
            (SELECT pdf_blob FROM invoice_pdfs WHERE invoice_id = invoices.id ORDER BY created_at DESC LIMIT 1) as pdf_blob
     FROM invoices
     LEFT JOIN customers ON invoices.customer_id = customers.id
     ORDER BY invoices.id DESC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      rows.forEach((row) => {
        row.has_pdf = !!row.pdf_id;
        row.pdf_url = row.pdf_id ? `/api/invoice-pdf/${row.pdf_id}` : null;
        // Convert pdf_blob to base64 if present
        if (row.pdf_blob) {
          row.pdf_blob_base64 = Buffer.from(row.pdf_blob).toString("base64");
        } else {
          row.pdf_blob_base64 = null;
        }
        // Remove raw binary from response for safety
        delete row.pdf_blob;
      });
      res.json(rows);
    }
  );
});

// Serve PDF blob from DB
app.get("/api/invoice-pdf/:id", (req, res) => {
  db.get(
    "SELECT pdf_blob FROM invoice_pdfs WHERE id = ?",
    [req.params.id],
    (err, row) => {
      if (err || !row) return res.status(404).json({ error: "PDF not found" });
      res.setHeader("Content-Type", "application/pdf");
      res.send(row.pdf_blob);
    }
  );
});

// Add or get customer by info (name/contact/address)
app.post("/api/add-or-get-customer", (req, res) => {
  const { name, contact, address } = req.body;
  if (!name || (!contact && !address)) {
    return res
      .status(400)
      .json({ error: "Name and at least one of contact or address required" });
  }
  db.get(
    `SELECT * FROM customers WHERE name = ? AND (phone = ? OR address = ?)`,
    [name, contact || "", address || ""],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row) {
        // Customer exists
        return res.json({ id: row.id });
      } else {
        // Insert new customer
        db.run(
          `INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)`,
          [name, contact || "", address || ""],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });
            return res.json({ id: this.lastID });
          }
        );
      }
    }
  );
});

// Endpoint to upload invoice PDF and link to invoice
app.post("/api/upload-invoice-pdf", async (req, res) => {
  // Support both multipart (file) and direct binary/base64 body
  if (req.is("multipart/form-data")) {
    upload.single("pdf")(req, res, function (err) {
      if (err) return res.status(400).json({ error: "File upload error" });
      const invoiceId = req.body.invoice_id;
      if (!invoiceId || !req.file) {
        return res
          .status(400)
          .json({ error: "Missing invoice_id or PDF file" });
      }
      const createdAt = new Date().toISOString();
      fs.readFile(req.file.path, (err, data) => {
        if (err)
          return res.status(500).json({ error: "Failed to read PDF file" });
        db.run(
          "INSERT INTO invoice_pdfs (invoice_id, pdf_blob, created_at) VALUES (?, ?, ?)",
          [invoiceId, data, createdAt],
          function (err) {
            fs.unlink(req.file.path, () => {});
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
          }
        );
      });
    });
  } else if (req.is("application/pdf")) {
    // Accept raw PDF binary in body
    const invoiceId = req.headers["x-invoice-id"] || req.query.invoice_id;
    if (!invoiceId)
      return res.status(400).json({ error: "Missing invoice_id" });
    let chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const buffer = Buffer.concat(chunks);
      const createdAt = new Date().toISOString();
      db.run(
        "INSERT INTO invoice_pdfs (invoice_id, pdf_blob, created_at) VALUES (?, ?, ?)",
        [invoiceId, buffer, createdAt],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, id: this.lastID });
        }
      );
    });
  } else if (req.is("application/json")) {
    // Accept base64 PDF in JSON body: { invoice_id, pdf_base64 }
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        const { invoice_id, pdf_base64 } = parsed;
        if (!invoice_id || !pdf_base64)
          return res
            .status(400)
            .json({ error: "Missing invoice_id or pdf_base64" });
        const buffer = Buffer.from(pdf_base64, "base64");
        const createdAt = new Date().toISOString();
        db.run(
          "INSERT INTO invoice_pdfs (invoice_id, pdf_blob, created_at) VALUES (?, ?, ?)",
          [invoice_id, buffer, createdAt],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
          }
        );
      } catch (e) {
        res.status(400).json({ error: "Invalid JSON or base64" });
      }
    });
  } else {
    res.status(415).json({ error: "Unsupported Content-Type" });
  }
});

// Add more endpoints for customers, invoices, billing_history as needed

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, "certs/server.key")),
  cert: fs.readFileSync(path.join(__dirname, "certs/server.cert")),
};

https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`Backend server running securely on https://localhost:${PORT}`);
});
// (Remove or comment out the old app.listen)
// app.listen(PORT, () => {
//   console.log(`Backend server running on port ${PORT}`);
// });

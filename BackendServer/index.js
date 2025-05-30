// --- JWT secret and expiry config (must be at the top before any usage) ---
const JWT_SECRET =
  process.env.JWT_SECRET || "u7!$2kLz9@#1pQwX8#@4fdS4!^&bR3sT0zV6mN4c";
const JWT_EXPIRES_IN = 5 * 60; // 5 minutes (in seconds)
const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const http = require("http");
const { WebSocketServer } = require("ws");
const crypto = require("crypto");
const app = express();

// --- CORS setup for production ---
app.use(
  cors({
    origin: [
      "https://goldshopmanager.onrender.com", // Render backend
      "http://localhost:19006", // Expo local dev
      "http://localhost:8081", // Expo local dev
      "https://<your-frontend-gh-pages-url>", // <-- Replace with your actual Expo web deploy URL
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

// Update inventory item by id
app.put("/api/inventory/:id", (req, res) => {
  const { id } = req.params;
  const { ItemName, Description, Quantity, WeightPerPiece } = req.body;
  if (
    !ItemName ||
    typeof Quantity !== "number" ||
    typeof WeightPerPiece !== "number"
  ) {
    return res.status(400).json({ error: "Missing or invalid fields" });
  }
  const TotalWeight =
    (parseFloat(WeightPerPiece) || 0) * (parseInt(Quantity) || 0);
  db.run(
    "UPDATE inventory SET ItemName = ?, Description = ?, Quantity = ?, WeightPerPiece = ?, TotalWeight = ? WHERE id = ?",
    [ItemName, Description, Quantity, WeightPerPiece, TotalWeight, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id });
    }
  );
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

// --- HTTP server setup ---
// const certPath = path.join(__dirname, "certs", "server.cert");
// const keyPath = path.join(__dirname, "certs", "server.key");
// const server = https.createServer(
//   {
//     cert: fs.readFileSync(certPath),
//     key: fs.readFileSync(keyPath),
//   },
//   app
// );
const server = http.createServer(app);

// --- In-memory session store and sessionId generator ---
const sessionStore = {};
const SESSION_ID_BYTES = 32;
function generateSessionId() {
  return crypto.randomBytes(SESSION_ID_BYTES).toString("hex");
}

// --- WebSocket server setup ---
const wss = new WebSocketServer({ server });
wss.on("connection", (ws) => {
  console.log("WebSocket client connected");

  ws.on("message", async (message) => {
    let msg;
    try {
      msg = JSON.parse(message.toString());
    } catch (e) {
      ws.send(
        JSON.stringify({
          action: "error",
          status: "error",
          error: "Invalid JSON",
        })
      );
      return;
    }
    const { action, payload, token, sessionId, reqId } = msg;

    // Helper to send response with reqId
    const send = (resp) => ws.send(JSON.stringify({ ...resp, reqId }));

    // Helper to verify JWT (except for login)
    function verifyJWT() {
      if (!token) return null;
      try {
        return jwt.verify(token, JWT_SECRET);
      } catch (e) {
        return null;
      }
    }

    // Handle actions
    if (action === "login") {
      const { username, password } = payload || {};
      db.get(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        [username, password],
        (err, row) => {
          if (err || !row) {
            send({
              action: "login",
              status: "error",
              error: "Invalid credentials",
            });
          } else {
            const token = jwt.sign(
              { id: row.id, username: row.username, role: row.role },
              JWT_SECRET,
              { expiresIn: JWT_EXPIRES_IN }
            );
            // Generate a sessionId and store mapping to user and token
            const sessionId = generateSessionId();
            sessionStore[sessionId] = {
              userId: row.id,
              username: row.username,
              role: row.role,
              token,
              expiresAt: Date.now() + JWT_EXPIRES_IN * 1000,
            };
            ws.sessionId = sessionId; // Attach sessionId to ws connection
            const { password, ...userWithoutPassword } = row;
            send({
              action: "login",
              status: "success",
              data: { user: userWithoutPassword, token, sessionId },
            });
          }
        }
      );
    } else if (action === "resumeSession") {
      // Resume session using sessionId, issue new JWT if valid
      const { sessionId } = payload || {};
      const session = sessionStore[sessionId];
      if (!session || session.expiresAt < Date.now()) {
        // Session not found or expired
        send({
          action: "resumeSession",
          status: "error",
          error: "Session expired",
        });
        if (sessionId) delete sessionStore[sessionId];
        return;
      }
      // Issue new JWT and update session expiry
      const token = jwt.sign(
        { id: session.userId, username: session.username, role: session.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      session.token = token;
      session.expiresAt = Date.now() + JWT_EXPIRES_IN * 1000;
      ws.sessionId = sessionId; // Attach sessionId to ws connection
      send({ action: "resumeSession", status: "success", data: { token } });
    } else if (
      [
        "getInventory",
        "addInventory",
        "deleteInventory",
        "updateInventory",
        "updateInventoryQuantity",
        "getInvoices",
        "getInventoryNames",
        "getCustomers",
        "updateCustomer",
        "getGoldSettings",
        "updateGoldSettings",
        "addOrGetCustomer",
        "addInvoice",
        "uploadInvoicePDF", // <-- Add this line
      ].includes(action)
    ) {
      // --- Use sessionId for all WebSocket API actions ---
      let user = null;
      let jwtToVerify = token;
      // If sessionId is provided, look up session and get its JWT
      if (sessionId && sessionStore[sessionId]) {
        const session = sessionStore[sessionId];
        // Check if session expired
        if (session.expiresAt < Date.now()) {
          console.log(
            `Session expired for sessionId: ${sessionId}, deleting session`
          );
          send({
            action: "sessionExpired",
            status: "error",
            error: "Session expired",
          });
          delete sessionStore[sessionId];
          ws.close();
          return;
        }
        jwtToVerify = session.token;
      }
      // Validate JWT (from session or direct)
      try {
        user = jwt.verify(jwtToVerify, JWT_SECRET);
      } catch (e) {
        send({
          action: "sessionExpired",
          status: "error",
          error: "Session expired",
        });
        if (sessionId) delete sessionStore[sessionId];
        ws.close();
        return;
      }
      // ...existing code for each action...
      if (action === "getInventory") {
        db.all("SELECT * FROM inventory", [], (err, rows) => {
          if (err) send({ action, status: "error", error: err.message });
          else send({ action, status: "success", data: rows });
        });
      } else if (action === "uploadInvoicePDF") {
        // Accept base64 PDF via WebSocket: payload = { invoiceId, pdfBase64 }
        const { invoiceId, pdfBase64 } = payload || {};
        if (!invoiceId || !pdfBase64) {
          send({
            action,
            status: "error",
            error: "Missing invoiceId or pdfBase64",
          });
          return;
        }
        const buffer = Buffer.from(pdfBase64, "base64");
        const createdAt = new Date().toISOString();
        db.run(
          "INSERT INTO invoice_pdfs (invoice_id, pdf_blob, created_at) VALUES (?, ?, ?)",
          [invoiceId, buffer, createdAt],
          function (err) {
            if (err) send({ action, status: "error", error: err.message });
            else send({ action, status: "success", data: { id: this.lastID } });
          }
        );
      } else if (action === "addInvoice") {
        const { customer_id, date, total, items } = payload || {};
        if (
          !customer_id ||
          !date ||
          !total ||
          !Array.isArray(items) ||
          items.length === 0
        ) {
          send({
            action,
            status: "error",
            error: "Missing required invoice fields or items",
          });
          return;
        }
        db.run(
          "INSERT INTO invoices (customer_id, date, total) VALUES (?, ?, ?)",
          [customer_id, date, total],
          function (err) {
            if (err)
              return send({ action, status: "error", error: err.message });
            const invoiceId = this.lastID;
            // Insert invoice items
            const stmt = db.prepare(
              "INSERT INTO invoice_items (invoice_id, inventory_id, quantity, price) VALUES (?, ?, ?, ?)"
            );
            for (const item of items) {
              stmt.run(invoiceId, item.inventory_id, item.quantity, item.price);
            }
            stmt.finalize((err) => {
              if (err)
                return send({ action, status: "error", error: err.message });
              // --- Update inventory quantities ---
              let updateCount = 0;
              let updateError = null;
              if (items.length === 0) {
                send({ action, status: "success", data: { id: invoiceId } });
                return;
              }
              items.forEach((item) => {
                db.run(
                  "UPDATE inventory SET Quantity = Quantity - ? WHERE id = ?",
                  [item.quantity, item.inventory_id],
                  function (err) {
                    updateCount++;
                    if (err && !updateError) updateError = err;
                    if (updateCount === items.length) {
                      if (updateError) {
                        send({
                          action,
                          status: "error",
                          error: updateError.message,
                        });
                      } else {
                        send({
                          action,
                          status: "success",
                          data: { id: invoiceId },
                        });
                      }
                    }
                  }
                );
              });
            });
          }
        );
      } else if (action === "addOrGetCustomer") {
        const { name, contact, address } = payload || {};
        if (!name || (!contact && !address)) {
          send({
            action,
            status: "error",
            error: "Name and at least one of contact or address required",
          });
          return;
        }
        db.get(
          `SELECT * FROM customers WHERE name = ? AND (phone = ? OR address = ?)`,
          [name, contact || "", address || ""],
          (err, row) => {
            if (err) send({ action, status: "error", error: err.message });
            else if (row) {
              send({ action, status: "success", data: { id: row.id } });
            } else {
              db.run(
                `INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)`,
                [name, contact || "", address || ""],
                function (err) {
                  if (err)
                    send({ action, status: "error", error: err.message });
                  else
                    send({
                      action,
                      status: "success",
                      data: { id: this.lastID },
                    });
                }
              );
            }
          }
        );
      } else if (action === "getGoldSettings") {
        db.get(
          "SELECT * FROM gold_settings ORDER BY id DESC LIMIT 1",
          (err, row) => {
            if (err) send({ action, status: "error", error: err.message });
            else send({ action, status: "success", data: row });
          }
        );
      } else if (action === "updateGoldSettings") {
        const { gold_rate, gst_rate, making_charge_per_gram } = payload || {};
        if (
          typeof gold_rate !== "number" ||
          typeof gst_rate !== "number" ||
          typeof making_charge_per_gram !== "number"
        ) {
          send({ action, status: "error", error: "Invalid input types" });
          return;
        }
        const updated_at = new Date().toLocaleString("en-IN", {
          hour12: false,
        });
        db.run(
          "INSERT INTO gold_settings (gold_rate, gst_rate, making_charge_per_gram, updated_at) VALUES (?, ?, ?, ?)",
          [gold_rate, gst_rate, making_charge_per_gram, updated_at],
          function (err) {
            if (err) send({ action, status: "error", error: err.message });
            else send({ action, status: "success", data: { id: this.lastID } });
          }
        );
      } else if (action === "updateCustomer") {
        const { id, name, phone, address, email } = payload || {};
        if (!id || !name) {
          send({ action, status: "error", error: "Missing id or name" });
          return;
        }
        db.run(
          "UPDATE customers SET name = ?, phone = ?, address = ?, email = ? WHERE id = ?",
          [name, phone || "", address || "", email || "", id],
          function (err) {
            if (err) send({ action, status: "error", error: err.message });
            else send({ action, status: "success", data: { id } });
          }
        );
      } else if (action === "getCustomers") {
        db.all("SELECT * FROM customers ORDER BY id DESC", [], (err, rows) => {
          if (err) send({ action, status: "error", error: err.message });
          else send({ action, status: "success", data: rows });
        });
      } else if (action === "getInvoices") {
        db.all(
          `SELECT invoices.id, invoices.date, invoices.total, 
            customers.name as customer_name, customers.address as customer_address, customers.phone as customer_contact,
            (SELECT id FROM invoice_pdfs WHERE invoice_id = invoices.id ORDER BY created_at DESC LIMIT 1) as pdf_id,
            (SELECT pdf_blob FROM invoice_pdfs WHERE invoice_id = invoices.id ORDER BY created_at DESC LIMIT 1) as pdf_blob
     FROM invoices
     LEFT JOIN customers ON invoices.customer_id = customers.id
     ORDER BY invoices.id DESC`,
          (err, rows) => {
            if (err)
              return send({ action, status: "error", error: err.message });
            rows.forEach((row) => {
              row.has_pdf = !!row.pdf_id;
              row.pdf_url = row.pdf_id
                ? `/api/invoice-pdf/${row.pdf_id}`
                : null;
              // Convert pdf_blob to base64 if present
              if (row.pdf_blob) {
                row.pdf_blob_base64 = Buffer.from(row.pdf_blob).toString(
                  "base64"
                );
              } else {
                row.pdf_blob_base64 = null;
              }
              // Remove raw binary from response for safety
              delete row.pdf_blob;
            });
            send({ action, status: "success", data: rows });
          }
        );
      } else if (action === "addInventory") {
        const { ItemName, Description, Quantity, WeightPerPiece } =
          payload || {};
        const TotalWeight =
          (parseFloat(WeightPerPiece) || 0) * (parseInt(Quantity) || 0);
        db.run(
          "INSERT INTO inventory (ItemName, Description, Quantity, WeightPerPiece, TotalWeight) VALUES (?, ?, ?, ?, ?)",
          [ItemName, Description, Quantity, WeightPerPiece, TotalWeight],
          function (err) {
            if (err) send({ action, status: "error", error: err.message });
            else send({ action, status: "success", data: { id: this.lastID } });
          }
        );
      } else if (action === "deleteInventory") {
        const { id } = payload || {};
        db.run("DELETE FROM inventory WHERE id = ?", [id], function (err) {
          if (err) send({ action, status: "error", error: err.message });
          else
            send({
              action,
              status: "success",
              data: { deleted: this.changes },
            });
        });
      } else if (action === "updateInventory") {
        const { id, ItemName, Description, Quantity, WeightPerPiece } =
          payload || {};
        if (
          !id ||
          !ItemName ||
          typeof Quantity !== "number" ||
          typeof WeightPerPiece !== "number"
        ) {
          send({ action, status: "error", error: "Missing or invalid fields" });
          return;
        }
        const TotalWeight =
          (parseFloat(WeightPerPiece) || 0) * (parseInt(Quantity) || 0);
        db.run(
          "UPDATE inventory SET ItemName = ?, Description = ?, Quantity = ?, WeightPerPiece = ?, TotalWeight = ? WHERE id = ?",
          [ItemName, Description, Quantity, WeightPerPiece, TotalWeight, id],
          function (err) {
            if (err) send({ action, status: "error", error: err.message });
            else send({ action, status: "success", data: { id } });
          }
        );
      } else if (action === "updateInventoryQuantity") {
        const { ItemName, WeightPerPiece, QuantityToAdd } = payload || {};
        if (
          !ItemName ||
          typeof WeightPerPiece !== "number" ||
          typeof QuantityToAdd !== "number"
        ) {
          send({ action, status: "error", error: "Missing or invalid fields" });
          return;
        }
        db.get(
          "SELECT * FROM inventory WHERE ItemName = ? AND WeightPerPiece = ?",
          [ItemName, WeightPerPiece],
          (err, row) => {
            if (err) send({ action, status: "error", error: err.message });
            else if (!row)
              send({ action, status: "error", error: "Item not found" });
            else {
              const newQty = row.Quantity + QuantityToAdd;
              const newTotalWeight = newQty * WeightPerPiece;
              db.run(
                "UPDATE inventory SET Quantity = ?, TotalWeight = ? WHERE id = ?",
                [newQty, newTotalWeight, row.id],
                function (err) {
                  if (err)
                    send({ action, status: "error", error: err.message });
                  else
                    send({
                      action,
                      status: "success",
                      data: { id: row.id, newQty, newTotalWeight },
                    });
                }
              );
            }
          }
        );
      } else if (action === "getInventoryNames") {
        // Implement getInventoryNames WebSocket action
        const { query } = payload || {};
        db.all(
          "SELECT DISTINCT ItemName FROM inventory WHERE ItemName LIKE ? ORDER BY ItemName LIMIT 10",
          [`%${query || ""}%`],
          (err, rows) => {
            if (err) send({ action, status: "error", error: err.message });
            else
              send({
                action,
                status: "success",
                data: rows.map((r) => r.ItemName),
              });
          }
        );
      } else {
        send({ action: "error", status: "error", error: "Unknown action" });
      }
    } else {
      send({ action: "error", status: "error", error: "Unknown action" });
    }
  });

  ws.send(
    JSON.stringify({
      type: "welcome",
      data: "Secure WebSocket connection established.",
    })
  );
});

// --- Periodic session expiration check ---
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of Object.entries(sessionStore)) {
    if (session.expiresAt < now) {
      // Find all connected WebSocket clients with this sessionId
      wss.clients.forEach((client) => {
        if (client.readyState === 1 && client.sessionId === sessionId) {
          client.send(
            JSON.stringify({
              action: "sessionExpired",
              status: "error",
              error: "Session expired",
            })
          );
          client.close();
        }
      });
      delete sessionStore[sessionId];
      console.log(`Session expired (timer) for sessionId: ${sessionId}`);
    }
  }
}, 10000); // Check every 10 seconds

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT} or your Render public URL`
  );
});

// --- DEV ONLY: API to reset (empty and recreate) the database ---
app.post("/api/dev/reset-db", (req, res) => {
  // List of tables to drop
  const tables = [
    "users",
    "inventory",
    "customers",
    "invoices",
    "invoice_items",
    "billing_history",
    "invoice_pdfs",
    "gold_settings",
  ];
  db.serialize(() => {
    tables.forEach((table) => {
      db.run(`DROP TABLE IF EXISTS ${table}`);
    });
    // Remove all files in invoice_pdfs directory
    const pdfDir = path.join(__dirname, "invoice_pdfs");
    if (fs.existsSync(pdfDir)) {
      fs.readdirSync(pdfDir).forEach((file) => {
        fs.unlinkSync(path.join(pdfDir, file));
      });
    }
    // Recreate tables
    createTables();
    res.json({ success: true, message: "Database reset and recreated." });
  });
});

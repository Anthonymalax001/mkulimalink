console.log("✅ THIS IS THE ACTIVE SERVER FILE");
console.log("🔥 MKULIMALINK SERVER RUNNING 🔥");

const express = require("express");
const cors = require("cors");
const pool = require("./db");
const africastalking = require("africastalking");

const app = express();
app.use(cors());
app.use(express.json());

/* ================= ROOT ROUTE ================= */
app.get("/", (req, res) => {
  res.send("✅ MkulimaLink Backend is Running");
});

/* ================= PHONE NORMALIZER ================= */
function normalizePhone(phone) {
  if (!phone) return null;

  phone = phone.toString().trim().replace(/\s+/g, "");

  if (phone.startsWith("+254")) return phone;
  if (phone.startsWith("254")) return "+" + phone;
  if (phone.startsWith("07")) return "+254" + phone.substring(1);
  if (phone.startsWith("7")) return "+254" + phone;

  return null;
}

/* ================= AFRICASTALKING SETUP ================= */
const AT = africastalking({
  apiKey: "YOUR_API_KEY_HERE",   // ✅ Put your real API key
  username: "InuaMkulimaApp",    // ✅ Keep the exact username from Africa's Talking dashboard
});

const sms = AT.SMS;

const DEFAULT_ADMIN = {
  name: "System Admin",
  phone: "0796244313",
  email: "admin@mkulima.com",
  password: "Malax001",
  role: "Admin",
  location: "Nairobi"
};

async function initializeDatabase() {
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS users (
         id SERIAL PRIMARY KEY,
         name TEXT NOT NULL,
         phone TEXT NOT NULL UNIQUE,
         email TEXT,
         password TEXT NOT NULL,
         role TEXT NOT NULL,
         location TEXT,
         idnumber TEXT,
         croptype TEXT,
         approved BOOLEAN NOT NULL DEFAULT false,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       )`
    );

    await pool.query(
      `CREATE TABLE IF NOT EXISTS produce (
         id SERIAL PRIMARY KEY,
         farmer_phone TEXT NOT NULL,
         croptype TEXT NOT NULL,
         quantity INTEGER NOT NULL,
         price INTEGER NOT NULL,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       )`
    );

    await pool.query(
      `CREATE TABLE IF NOT EXISTS orders (
         id SERIAL PRIMARY KEY,
         buyer_name TEXT NOT NULL,
         buyer_national_id TEXT,
         buyer_phone TEXT NOT NULL,
         farmer_phone TEXT NOT NULL,
         croptype TEXT NOT NULL,
         quantity INTEGER NOT NULL,
         status TEXT NOT NULL DEFAULT 'PENDING',
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       )`
    );

    const existingAdmin = await pool.query(
      "SELECT 1 FROM users WHERE role='Admin' LIMIT 1"
    );

    if (!existingAdmin.rows.length) {
      const normalizedAdminPhone = normalizePhone(DEFAULT_ADMIN.phone);

      if (!normalizedAdminPhone) {
        throw new Error("Invalid default admin phone format");
      }

      await pool.query(
        `INSERT INTO users (name, phone, email, password, role, location, approved)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          DEFAULT_ADMIN.name,
          normalizedAdminPhone,
          DEFAULT_ADMIN.email,
          DEFAULT_ADMIN.password,
          DEFAULT_ADMIN.role,
          DEFAULT_ADMIN.location,
          true
        ]
      );

      console.log("✅ Default admin user seeded");
    }

    console.log("✅ Database initialization complete");
  } catch (err) {
    console.error("DATABASE INIT ERROR:", err);
    throw err;
  }
}

/* ================= REGISTER ================= */
app.post("/api/register", async (req, res) => {
  try {
    let { name, phone, email, password, role, location, idNumber, cropType } = req.body;

    if (!name || !phone || !password || !role)
      return res.status(400).json({ message: "Missing required fields" });

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone)
      return res.status(400).json({ message: "Invalid phone format" });

    const existing = await pool.query("SELECT 1 FROM users WHERE phone=$1", [normalizedPhone]);
    if (existing.rows.length)
      return res.status(400).json({ message: "Phone already registered" });

    const approved = role === "Farmer" ? false : true;

    await pool.query(
      `INSERT INTO users (name, phone, email, password, role, location, idnumber, croptype, approved)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [name, normalizedPhone, email || null, password, role, location || null, idNumber || null, cropType || null, approved]
    );

    res.json({
      message: role === "Farmer"
        ? "Registration successful. Waiting for admin approval."
        : "Registration successful. You can now login."
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: "Registration error" });
  }
});

/* ================= LOGIN ================= */
app.post("/api/login", async (req, res) => {
  try {
    let { phone, password } = req.body;

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone)
      return res.status(400).json({ message: "Invalid phone format" });

    const result = await pool.query(
      "SELECT * FROM users WHERE phone=$1 AND password=$2",
      [normalizedPhone, password]
    );

    if (!result.rows.length)
      return res.status(401).json({ message: "Invalid credentials" });

    const user = result.rows[0];

    if (user.role === "Farmer" && !user.approved)
      return res.status(403).json({ message: "Waiting for admin approval" });

    res.json({ user });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});

/* ================= ADMIN ================= */
app.get("/api/admin/pending-farmers", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE role='Farmer' AND approved=false");
    res.json({ farmers: result.rows });
  } catch (err) {
    console.error("PENDING FARMERS ERROR:", err);
    res.status(500).json({ message: "Error loading pending farmers" });
  }
});

app.post("/api/admin/approve-farmer", async (req, res) => {
  try {
    const normalizedPhone = normalizePhone(req.body.phone);

    await pool.query("UPDATE users SET approved=true WHERE phone=$1", [normalizedPhone]);

    const message =
      "🎉 Your MkulimaLink account has been approved! You can now login and start selling.";

    await sms.send({
      to: [normalizedPhone],
      message,
    });

    console.log("SMS SENT TO:", normalizedPhone);

    res.json({ message: "Farmer approved and SMS sent" });

  } catch (err) {
    console.error("APPROVAL ERROR:", err);
    res.status(500).json({ message: "Approval done but SMS failed" });
  }
});

app.get("/api/admin/approved-users", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT name, phone, email, role, location FROM users WHERE approved=true ORDER BY name"
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error("APPROVED USERS ERROR:", err);
    res.status(500).json({ message: "Error loading approved users" });
  }
});

/* ================= ADD PRODUCE ================= */
app.post("/api/farmer/add-produce", async (req, res) => {
  try {
    const normalizedPhone = normalizePhone(req.body.phone);

    await pool.query(
      "INSERT INTO produce (farmer_phone, croptype, quantity, price) VALUES ($1,$2,$3,$4)",
      [normalizedPhone, req.body.cropType, parseInt(req.body.quantity), parseInt(req.body.price)]
    );

    res.json({ message: "Produce added successfully" });

  } catch (err) {
    console.error("ADD PRODUCE ERROR:", err);
    res.status(500).json({ message: "Error adding produce" });
  }
});

/* ================= MARKETPLACE ================= */
app.get("/api/produce", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM produce ORDER BY id DESC");
    res.json({ produce: result.rows });
  } catch (err) {
    console.error("PRODUCE ERROR:", err);
    res.status(500).json({ message: "Error loading produce" });
  }
});

/* ================= ORDERS ================= */
app.post("/api/orders", async (req, res) => {
  try {
    const normalizedBuyer = normalizePhone(req.body.buyerPhone);
    const normalizedFarmer = normalizePhone(req.body.farmerPhone);

    await pool.query(
      `INSERT INTO orders (buyer_name,buyer_national_id,buyer_phone,farmer_phone,croptype,quantity,status)
       VALUES ($1,$2,$3,$4,$5,$6,'PENDING')`,
      [
        req.body.buyerName,
        req.body.buyerNationalId,
        normalizedBuyer,
        normalizedFarmer,
        req.body.cropType,
        req.body.quantity
      ]
    );

    res.json({ message: "Order placed" });

  } catch (err) {
    console.error("ORDER ERROR:", err);
    res.status(500).json({ message: "Error placing order" });
  }
});

app.get("/api/buyer/orders/:phone", async (req, res) => {
  try {
    const normalized = normalizePhone(req.params.phone);
    const result = await pool.query("SELECT * FROM orders WHERE buyer_phone=$1 ORDER BY id DESC", [normalized]);
    res.json({ orders: result.rows });
  } catch (err) {
    console.error("BUYER ORDERS ERROR:", err);
    res.status(500).json({ message: "Error loading buyer orders" });
  }
});

app.get("/api/farmer/orders/:phone", async (req, res) => {
  try {
    const normalized = normalizePhone(req.params.phone);
    const result = await pool.query("SELECT * FROM orders WHERE farmer_phone=$1 ORDER BY id DESC", [normalized]);
    res.json({ orders: result.rows });
  } catch (err) {
    console.error("FARMER ORDERS ERROR:", err);
    res.status(500).json({ message: "Error loading farmer orders" });
  }
});

app.put("/api/farmer/order-status", async (req, res) => {
  try {
    await pool.query("UPDATE orders SET status=$1 WHERE id=$2", [req.body.status, req.body.orderId]);
    res.json({ message: "Order updated" });
  } catch (err) {
    console.error("UPDATE ORDER ERROR:", err);
    res.status(500).json({ message: "Error updating order" });
  }
});

/* ================= START SERVER ================= */
async function startServer() {
  try {
    await initializeDatabase();

    app.listen(3000, () => {
      console.log("✅ Server running on http://localhost:3000");
    });
  } catch (err) {
    console.error("STARTUP ERROR:", err);
    process.exit(1);
  }
}

startServer();

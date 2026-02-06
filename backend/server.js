console.log("🔥 MKULIMALINK SERVER RUNNING 🔥");

const express = require("express");
const cors = require("cors");
const pool = require("./db");
const africastalking = require("africastalking");

const app = express();
app.use(cors());
app.use(express.json());

/* ================= PHONE NORMALIZER ================= */
function normalizePhone(phone) {
  if (!phone) return null;

  phone = phone.replace(/\s+/g, "");

  if (phone.startsWith("+")) return phone;
  if (phone.startsWith("07")) return "+254" + phone.substring(1);
  if (phone.startsWith("7")) return "+254" + phone;
  if (phone.startsWith("254")) return "+" + phone;

  return null;
}

/* ================= AFRICASTALKING SETUP ================= */
const AT = africastalking({
  apiKey: "atsk_2b66062377fe5a3c088391c577b3c6b12592ad3a26e09b1562c61b31f6ba74dfb126a72a",
  username: "InuaMkulimaApp",
});

const sms = AT.SMS;

/* ================= REGISTER ================= */
app.post("/api/register", async (req, res) => {
  try {
    const { name, phone, email, password, role, location, idNumber, cropType } = req.body;

    if (!name || !phone || !password || !role)
      return res.status(400).json({ message: "Missing required fields" });

    const existing = await pool.query("SELECT 1 FROM users WHERE phone=$1", [phone]);
    if (existing.rows.length)
      return res.status(400).json({ message: "Phone already registered" });

    const approved = role === "Farmer" ? false : true;

    await pool.query(
      `INSERT INTO users (name, phone, email, password, role, location, idnumber, croptype, approved)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [name, phone, email || null, password, role, location || null, idNumber || null, cropType || null, approved]
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
  const { phone, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE phone=$1 AND password=$2",
      [phone, password]
    );

    if (!result.rows.length)
      return res.status(401).json({ message: "Invalid credentials" });

    const user = result.rows[0];

    if (user.role === "Farmer" && !user.approved)
      return res.status(403).json({ message: "Waiting for admin approval" });

    res.json({ user });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: "Login error" });
  }
});

/* ================= ADMIN ================= */
app.get("/api/admin/pending-farmers", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM users WHERE role='Farmer' AND approved=false"
  );
  res.json({ farmers: result.rows });
});

app.post("/api/admin/approve-farmer", async (req, res) => {
  const { phone } = req.body;

  try {
    await pool.query("UPDATE users SET approved=true WHERE phone=$1", [phone]);

    const normalizedPhone = normalizePhone(phone);

    if (normalizedPhone) {
      const message =
        "🎉 Congratulations! Your MkulimaLink farmer account has been APPROVED. You can now log in and add produce.";

      await sms.send({
        to: [normalizedPhone],
        message,
      });

      console.log("SMS SENT TO:", normalizedPhone);
    } else {
      console.error("INVALID PHONE FORMAT:", phone);
    }

    res.json({ message: "Farmer approved successfully" });

  } catch (err) {
    console.error("APPROVAL/SMS ERROR:", err);
    res.status(500).json({ message: "Approval completed but SMS failed" });
  }
});

app.get("/api/admin/approved-users", async (req, res) => {
  const result = await pool.query(
    "SELECT name, phone, email, role, location FROM users WHERE approved=true ORDER BY name"
  );
  res.json({ users: result.rows });
});

/* ================= ADD PRODUCE ================= */
app.post("/api/farmer/add-produce", async (req, res) => {
  try {
    const { phone, cropType, quantity, price } = req.body;

    if (!phone || !cropType || !quantity || !price)
      return res.status(400).json({ message: "All fields required" });

    await pool.query(
      "INSERT INTO produce (farmer_phone, croptype, quantity, price) VALUES ($1,$2,$3,$4)",
      [phone, cropType, parseInt(quantity), parseInt(price)]
    );

    res.json({ message: "Produce added successfully" });

  } catch (err) {
    console.error("ADD PRODUCE ERROR:", err);
    res.status(500).json({ message: "Error adding produce" });
  }
});

/* ================= MARKETPLACE ================= */
app.get("/api/produce", async (req, res) => {
  const result = await pool.query("SELECT * FROM produce ORDER BY id DESC");
  res.json({ produce: result.rows });
});

/* ================= ORDERS ================= */
app.post("/api/orders", async (req, res) => {
  try {
    const { buyerName, buyerNationalId, buyerPhone, farmerPhone, cropType, quantity } = req.body;

    await pool.query(
      `INSERT INTO orders (buyer_name, buyer_national_id, buyer_phone, farmer_phone, croptype, quantity, status)
       VALUES ($1,$2,$3,$4,$5,$6,'PENDING')`,
      [buyerName, buyerNationalId, buyerPhone, farmerPhone, cropType, quantity]
    );

    res.json({ message: "Order placed" });

  } catch (err) {
    console.error("ORDER ERROR:", err);
    res.status(500).json({ message: "Error placing order" });
  }
});

app.get("/api/buyer/orders/:phone", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM orders WHERE buyer_phone=$1 ORDER BY id DESC",
    [req.params.phone]
  );
  res.json({ orders: result.rows });
});

app.get("/api/farmer/orders/:phone", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM orders WHERE farmer_phone=$1 ORDER BY id DESC",
    [req.params.phone]
  );
  res.json({ orders: result.rows });
});

app.put("/api/farmer/order-status", async (req, res) => {
  const { orderId, status } = req.body;
  await pool.query("UPDATE orders SET status=$1 WHERE id=$2", [status, orderId]);
  res.json({ message: "Order updated" });
});

/* ================= START SERVER ================= */
app.listen(3000, () =>
  console.log("✅ Server running on http://localhost:3000")
);

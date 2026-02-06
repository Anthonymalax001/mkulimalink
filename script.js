const API = "http://localhost:3000";

/* ================= AUTH CHECK ================= */
const currentUser = JSON.parse(localStorage.getItem("user"));
if (
  (window.location.pathname.includes("farmer.html") ||
    window.location.pathname.includes("buyer.html") ||
    window.location.pathname.includes("admin.html")) &&
  !currentUser
) {
  alert("Please login first");
  window.location.href = "login.html";
}

/* ================= SHOW FARMER EXTRA FIELDS ================= */
const roleSelect = document.getElementById("reg-role");
if (roleSelect) {
  roleSelect.addEventListener("change", function () {
    const extra = document.getElementById("farmer-extra");
    if (extra) extra.style.display = this.value === "Farmer" ? "block" : "none";
  });
}

/* ================= REGISTER ================= */
const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      name: document.getElementById("reg-name").value.trim(),
      phone: document.getElementById("reg-phone").value.trim(),
      email: document.getElementById("reg-email").value.trim(),
      password: document.getElementById("reg-password").value.trim(),
      role: document.getElementById("reg-role").value,
      location: document.getElementById("reg-location").value.trim(),
      idNumber: document.getElementById("reg-idNumber")?.value.trim() || null,
      cropType: document.getElementById("reg-cropType")?.value.trim() || null,
    };

    try {
      const res = await fetch(`${API}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      alert(data.message);
      if (res.ok) window.location.href = "login.html";
    } catch (err) {
      console.error("REGISTER ERROR:", err);
      alert("Server error during registration");
    }
  });
}

/* ================= LOGIN ================= */
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: document.getElementById("login-phone").value.trim(),
          password: document.getElementById("login-password").value.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) return alert(data.message);

      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.role === "Farmer") window.location.href = "farmer.html";
      else if (data.user.role === "Admin") window.location.href = "admin.html";
      else window.location.href = "buyer.html";

    } catch (err) {
      console.error("LOGIN ERROR:", err);
      alert("Server error during login");
    }
  });
}

/* ================= ADD PRODUCE ================= */
const farmerForm = document.getElementById("farmer-form");
if (farmerForm) {
  farmerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem("user"));

    try {
      const res = await fetch(`${API}/api/farmer/add-produce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: user.phone,
          cropType: document.getElementById("cropType").value,
          quantity: document.getElementById("quantity").value,
          price: document.getElementById("price").value,
        }),
      });

      const data = await res.json();
      alert(data.message);
      farmerForm.reset();
    } catch (err) {
      console.error("ADD PRODUCE ERROR:", err);
      alert("Error adding produce");
    }
  });
}

/* ================= LOAD MARKETPLACE (BUYER) ================= */
async function loadMarketplace() {
  const table = document.getElementById("market-table");
  if (!table) return;

  const res = await fetch(`${API}/api/produce`);
  const data = await res.json();

  table.innerHTML = "";

  if (!data.produce.length) {
    table.innerHTML = "<tr><td colspan='5'>No produce available</td></tr>";
    return;
  }

  data.produce.forEach(item => {
    table.innerHTML += `
      <tr>
        <td>${item.farmer_phone}</td>
        <td>${item.croptype}</td>
        <td>${item.quantity}</td>
        <td>KES ${item.price}</td>
        <td>
          <button onclick="placeOrderPrompt('${item.farmer_phone}','${item.croptype}')">
            Order
          </button>
        </td>
      </tr>`;
  });
}
/* ================= BUYER ORDERS ================= */
async function loadBuyerOrders() {
  const user = JSON.parse(localStorage.getItem("user"));
  const table = document.getElementById("my-orders-table");
  if (!user || !table) return;

  const res = await fetch(`${API}/api/buyer/orders/${user.phone}`);
  const data = await res.json();

  table.innerHTML = "";

  if (!data.orders.length) {
    table.innerHTML = "<tr><td colspan='5'>No orders yet</td></tr>";
    return;
  }

  data.orders.forEach(order => {
    table.innerHTML += `
      <tr>
        <td>${order.id}</td>
        <td>${order.croptype}</td>
        <td>${order.quantity}</td>
        <td>${order.farmer_phone}</td>
        <td>${order.status}</td>
      </tr>`;
  });
}

async function placeOrderPrompt(farmerPhone, cropType) {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return alert("Login required");

  const buyerName = prompt("Enter your FULL NAME:");
  const buyerNationalId = prompt("Enter your NATIONAL ID:");
  const quantity = prompt("Enter quantity:");

  if (!buyerName || !buyerNationalId || !quantity) return alert("All fields required");

  const res = await fetch(`${API}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      buyerName,
      buyerNationalId,
      buyerPhone: user.phone,
      farmerPhone,
      cropType,
      quantity
    })
  });

  const data = await res.json();
  alert(data.message);
}

/* ================= FARMER ORDERS ================= */
async function loadFarmerOrders() {
  const table = document.getElementById("orders-table");
  const user = JSON.parse(localStorage.getItem("user"));
  if (!table || !user) return;

  const res = await fetch(`${API}/api/farmer/orders/${user.phone}`);
  const data = await res.json();

  table.innerHTML = "";

  if (!data.orders.length) {
    table.innerHTML = "<tr><td colspan='7'>No orders yet</td></tr>";
    return;
  }

  data.orders.forEach(order => {
    table.innerHTML += `
      <tr>
        <td>${order.id}</td>
        <td>${order.buyer_name}</td>
        <td>${order.buyer_phone}</td>
        <td>${order.croptype}</td>
        <td>${order.quantity}</td>
        <td>${order.status}</td>
        <td>
          ${
            order.status === "PENDING"
              ? `<button onclick="updateOrderStatus(${order.id}, 'ACCEPTED')">Accept</button>
                 <button onclick="updateOrderStatus(${order.id}, 'REJECTED')">Reject</button>`
              : "—"
          }
        </td>
      </tr>`;
  });
}

async function updateOrderStatus(orderId, status) {
  await fetch(`${API}/api/farmer/order-status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, status }),
  });

  loadFarmerOrders();   // refresh farmer side
  loadBuyerOrders();    // refresh buyer side
}


/* ================= ADMIN ================= */
async function loadPendingFarmers() {
  const table = document.getElementById("pending-farmers-table");
  if (!table) return;

  const res = await fetch(`${API}/api/admin/pending-farmers`);
  const data = await res.json();

  table.innerHTML = "";
  data.farmers.forEach(farmer => {
    table.innerHTML += `
      <tr>
        <td>${farmer.name}</td>
        <td>${farmer.phone}</td>
        <td>${farmer.location || ""}</td>
        <td>${farmer.idnumber || ""}</td>
        <td>${farmer.croptype || ""}</td>
        <td><button onclick="approveFarmer('${farmer.phone}')">Approve</button></td>
      </tr>`;
  });
}

async function loadApprovedUsers() {
  const table = document.getElementById("approved-users-table");
  if (!table) return;

  const res = await fetch(`${API}/api/admin/approved-users`);
  const data = await res.json();

  table.innerHTML = "";
  data.users.forEach(user => {
    table.innerHTML += `
      <tr>
        <td>${user.name}</td>
        <td>${user.phone}</td>
        <td>${user.email || ""}</td>
        <td>${user.role}</td>
        <td>${user.location || ""}</td>
      </tr>`;
  });
}

async function approveFarmer(phone) {
  await fetch(`${API}/api/admin/approve-farmer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  loadPendingFarmers();
  loadApprovedUsers();
}

/* ================= LOGOUT ================= */
function logout() {
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

/* ================= AUTO LOAD ================= */
window.onload = () => {
  loadPendingFarmers();
  loadApprovedUsers();
  loadFarmerOrders();
  loadMarketplace();
  loadBuyerOrders();   
};

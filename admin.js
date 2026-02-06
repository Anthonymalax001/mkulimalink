const API = "http://localhost:3000";

// ===============================
// LOAD APPROVED USERS
// ===============================
async function loadUsers() {
  const table = document.getElementById("users-table");

  try {
    const res = await fetch(`${API}/api/admin/users`);
    const data = await res.json();

    table.innerHTML = "";

    if (data.users.length === 0) {
      table.innerHTML = "<tr><td colspan='5'>No users found</td></tr>";
      return;
    }

    data.users.forEach(u => {
      table.innerHTML += `
        <tr>
          <td>${u.name}</td>
          <td>${u.phone}</td>
          <td>${u.email || "-"}</td>
          <td>${u.role}</td>
          <td>${u.location}</td>
        </tr>
      `;
    });

  } catch (err) {
    table.innerHTML = "<tr><td colspan='5'>Error loading users</td></tr>";
  }
}

// ===============================
// LOAD PENDING FARMERS
// ===============================
async function loadPendingFarmers() {
  const table = document.getElementById("farmers-table");

  try {
    const res = await fetch(`${API}/api/admin/pending-farmers`);
    const data = await res.json();

    table.innerHTML = "";

    if (data.farmers.length === 0) {
      table.innerHTML = `
        <tr>
          <td colspan="6" class="text-center">No pending farmers 🎉</td>
        </tr>
      `;
      return;
    }

    data.farmers.forEach(f => {
      table.innerHTML += `
        <tr>
          <td>${f.name}</td>
          <td>${f.phone}</td>
          <td>${f.location}</td>
          <td>${f.idNumber}</td>
          <td>${f.cropType}</td>
          <td>
            <button class="btn btn-success btn-sm" onclick="approveFarmer('${f.phone}')">
              Approve
            </button>
          </td>
        </tr>
      `;
    });

  } catch (err) {
    table.innerHTML =
      "<tr><td colspan='6'>Error loading farmers</td></tr>";
  }
}

// ===============================
// APPROVE FARMER
// ===============================
async function approveFarmer(phone) {
  if (!confirm("Approve this farmer?")) return;

  try {
    const res = await fetch(`${API}/api/admin/approve-farmer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone })
    });

    const data = await res.json();
    alert(data.message);

    loadPendingFarmers();
    loadUsers();

  } catch (err) {
    alert("Approval failed");
  }
}

// ===============================
// ADMIN AUTH CHECK
// ===============================
function logout() {
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const admin = JSON.parse(localStorage.getItem("user"));

  if (!admin || admin.role !== "Admin") {
    alert("Access denied");
    window.location.href = "login.html";
    return;
  }

  loadPendingFarmers();
  loadUsers();
});

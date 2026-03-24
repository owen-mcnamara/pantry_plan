<template>
  <div class="container">
    <!-- Sidebar -->
    <aside class="sidebar">
      <h2 class="logo">🍎 PantryPlan</h2>
      <nav>
        <a href="/dashboard" class="active">🏠 Dashboard</a>
        <a href="/recipes">🍜 Recipes</a>
        <a href="/settings">⚙️ Settings</a>
        <a href="/history">🕘 History</a>
        <button class="logout-btn" @click="logout">🚪 Logout</button>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="main">
      <div class="top-bar">
        <h1>My Pantry</h1>
        <button class="add-btn" @click="showModal = true">+ Add Item</button>
      </div>

      <p v-if="loading">Loading...</p>

      <div class="items" v-else>
        <div v-if="products.length === 0" class="empty-state">
          <p>No active items in your pantry yet!</p>
        </div>

        <div class="item-card" v-for="product in products" :key="product.id">
          <div class="item-info">
            <div>
              <h3>{{ product.name }}</h3>
              <p>Expires: {{ product.expiryDate }}</p>
            </div>
          </div>

          <span :class="['time', expiryClass(product.expiryDate)]">
            {{ daysUntilExpiry(product.expiryDate) }}
          </span>

          <div class="actions">
            <button class="use-btn" @click="markUsed(product.id)">✅ Use</button>
            <button class="waste-btn" @click="confirmWaste(product.id)">🗑️ Waste</button>
            <button class="delete-btn" @click="deleteItem(product.id)">❌ Delete</button>
          </div>
        </div>
      </div>

      <div class="graph-card">
        <h3>Weekly Waste Insights (Last 4 Weeks)</h3>
        <p>Waste Rate: <strong>{{ wasteRatePercent }}</strong></p>

        <Bar v-if="analytics.labels.length" :data="chartData" :options="chartOptions" />
        <div v-else class="graph-placeholder">No analytics data yet.</div>
      </div>

      <div v-if="undo.visible" class="undo-toast">
        Marked as {{ undo.action }}.
        <button @click="undoLastAction">Undo</button>
      </div>
    </main>

    <!-- Add Item Modal -->
    <div class="modal" v-if="showModal">
      <div class="modal-content">
        <span class="close" @click="showModal = false">&times;</span>
        <h2>Add New Item</h2>

        <form @submit.prevent="addItem">
          <div class="form-group">
            <label>Item Name:</label>
            <input type="text" v-model="newItem.name" required />
          </div>

          <div class="form-group">
            <label>Expiry Date:</label>
            <input type="date" v-model="newItem.expiryDate" required />
          </div>

          <button type="submit" class="submit-btn">Add Item</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { auth } from '../firebaseConfig.js';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'vue-router';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const router = useRouter();
const products = ref([]);
const loading = ref(true);
const showModal = ref(false);
const newItem = ref({ name: '', expiryDate: '' });
const userId = ref(null);

const analytics = ref({ labels: [], used: [], wasted: [], wasteRate: 0 });
const undo = ref({ visible: false, productId: null, action: '', timer: null });

const chartData = computed(() => ({
  labels: analytics.value.labels,
  datasets: [
    { label: 'Used', data: analytics.value.used, backgroundColor: '#2f855a' },
    { label: 'Wasted', data: analytics.value.wasted, backgroundColor: '#e53e3e' }
  ]
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' }
  }
};

const wasteRatePercent = computed(() =>
  `${Math.round((analytics.value.wasteRate || 0) * 100)}%`
);

onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      userId.value = user.uid;
      await Promise.all([fetchProducts(), fetchAnalytics()]);
    } else {
      router.push('/login');
    }
  });
});

async function fetchProducts() {
  loading.value = true;
  try {
    const res = await fetch(`https://getproducts-moat6vqvca-uc.a.run.app?userId=${userId.value}`);
    const data = await res.json();
    products.value = data.products || [];
  } finally {
    loading.value = false;
  }
}

async function fetchAnalytics() {
  const res = await fetch(
    `https://getweeklyanalytics-moat6vqvca-uc.a.run.app?userId=${userId.value}&weeks=4`
  );
  const data = await res.json();
  analytics.value = data.success
    ? data
    : { labels: [], used: [], wasted: [], wasteRate: 0 };
}

async function addItem() {
  await fetch('https://addproduct-moat6vqvca-uc.a.run.app', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: userId.value,
      name: newItem.value.name,
      expiryDate: newItem.value.expiryDate,
      expiryTimestampUtc: new Date(newItem.value.expiryDate).toISOString(),
      status: 'active'
    })
  });

  newItem.value = { name: '', expiryDate: '' };
  showModal.value = false;
  await Promise.all([fetchProducts(), fetchAnalytics()]);
}

async function deleteItem(productId) {
  await fetch('https://deleteproduct-moat6vqvca-uc.a.run.app', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId })
  });
  await Promise.all([fetchProducts(), fetchAnalytics()]);
}

async function markUsed(productId) {
  await updateStatus(productId, 'used');
}

async function confirmWaste(productId) {
  if (!confirm('Mark this item as wasted?')) return;
  await updateStatus(productId, 'wasted');
}

async function updateStatus(productId, status) {
  await fetch('https://updateproductstatus-moat6vqvca-uc.a.run.app', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, status })
  });

  showUndo(productId, status);
  await Promise.all([fetchProducts(), fetchAnalytics()]);
}

function showUndo(productId, action) {
  if (undo.value.timer) clearTimeout(undo.value.timer);

  undo.value.visible = true;
  undo.value.productId = productId;
  undo.value.action = action;
  undo.value.timer = setTimeout(() => {
    undo.value.visible = false;
  }, 8000);
}

async function undoLastAction() {
  if (!undo.value.productId) return;

  await fetch('https://undoproductstatus-moat6vqvca-uc.a.run.app', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: undo.value.productId })
  });

  clearTimeout(undo.value.timer);
  undo.value.visible = false;
  await Promise.all([fetchProducts(), fetchAnalytics()]);
}

async function logout() {
  await signOut(auth);
  router.push('/login');
}

function daysUntilExpiry(expiryDate) {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Expired';
  if (diffDays === 0) return 'Expires today';
  if (diffDays === 1) return '1 day left';
  return `${diffDays} days left`;
}

function expiryClass(expiryDate) {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'critical';
  if (diffDays <= 2) return 'warn';
  return 'okay';
}
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: "Inter", sans-serif;
}

body {
  background: #edf2f7;
}

.container {
  display: flex;
}

.sidebar {
  width: 250px;
  background: white;
  height: 100vh;
  padding: 25px;
  border-right: 1px solid #e0e0e0;
}

.logo {
  margin-bottom: 30px;
  font-size: 22px;
  font-weight: 600;
}

.sidebar nav a {
  display: block;
  padding: 14px 0;
  font-size: 16px;
  color: #555;
  cursor: pointer;
  text-decoration: none;
  transition: 0.2s;
}

.sidebar nav a:hover,
.sidebar nav a.active {
  color: #2c7a7b;
  font-weight: bold;
}

.main {
  flex: 1;
  padding: 40px;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.add-btn {
  padding: 10px 20px;
  background: #2f855a;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
}

.items {
  margin-top: 20px;
}

.item-card {
  background: white;
  padding: 15px 20px;
  border-radius: 12px;
  margin-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.item-info {
  display: flex;
  align-items: center;
  gap: 15px;
  min-width: 220px;
}

.item-card h3 {
  font-size: 18px;
}

.item-card p {
  font-size: 14px;
  color: #777;
}

.time {
  font-size: 16px;
  font-weight: bold;
  min-width: 110px;
}

.critical {
  color: #c53030;
}

.warn {
  color: #e53e3e;
}

.okay {
  color: #dd6b20;
}

.actions {
  display: flex;
  gap: 8px;
}

.use-btn,
.waste-btn,
.delete-btn {
  border: none;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}

.use-btn {
  background: #e6fffa;
  color: #2f855a;
}

.waste-btn {
  background: #fff5f5;
  color: #c53030;
}

.delete-btn {
  background: #edf2f7;
  color: #4a5568;
}

.graph-card {
  margin-top: 30px;
  background: white;
  padding: 25px;
  border-radius: 16px;
  min-height: 320px;
}

.graph-card canvas {
  max-height: 240px;
}

.graph-placeholder {
  margin-top: 20px;
  height: 250px;
  background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%);
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #718096;
  font-size: 16px;
  border: 2px dashed #cbd5e0;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #94a3b8;
  background: white;
  border-radius: 12px;
  margin-top: 20px;
}

.modal {
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
}

.modal-content {
  background-color: white;
  margin: 5% auto;
  padding: 30px;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-content h2 {
  margin-bottom: 20px;
  color: #2d3748;
  font-size: 24px;
}

.close {
  position: absolute;
  right: 25px;
  top: 20px;
  font-size: 28px;
  font-weight: bold;
  cursor: pointer;
  color: #a0aec0;
}

.close:hover {
  color: #4a5568;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #4a5568;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  font-size: 15px;
  background: #f8fafc;
}

.form-group input:focus {
  outline: none;
  border-color: #2f855a;
  background: white;
}

.submit-btn {
  background: #2f855a;
  color: white;
  padding: 14px 20px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  width: 100%;
  font-size: 16px;
  font-weight: 600;
  margin-top: 10px;
}

.submit-btn:hover {
  background: #276749;
}

.logout-btn {
  display: block;
  width: 100%;
  padding: 14px 0;
  font-size: 16px;
  color: #e53e3e;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  margin-top: 20px;
}

.logout-btn:hover {
  font-weight: bold;
}

.undo-toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  background: #2d3748;
  color: white;
  padding: 12px 14px;
  border-radius: 10px;
  display: flex;
  gap: 10px;
  align-items: center;
  z-index: 1500;
}

.undo-toast button {
  background: #fff;
  color: #2d3748;
  border: none;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
}
</style>
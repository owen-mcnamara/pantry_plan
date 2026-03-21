<template>
  <div class="container">
    <!-- Sidebar -->
    <aside class="sidebar">
      <h2 class="logo">🍎 PantryPlan</h2>
      <nav>
        <a href="#" class="active">🏠 Dashboard</a>
        <a href="#">🍜 Recipes</a>
        <a href="#">⚙️ Settings</a>
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
          <p>No items in your pantry yet!</p>
        </div>
        <div class="item-card" v-for="product in products" :key="product.id">
          <div class="item-info">
            <div>
              <h3>{{ product.name }}</h3>
              <p>Expires: {{ product.expiryDate }}</p>
            </div>
          </div>
          <span class="time warn">{{ product.status }}</span>
          <button class="delete-btn" @click="deleteItem(product.id)">🗑️</button>
        </div>
      </div>

      <div class="graph-card">
        <h3>Weekly Waste Savings</h3>
        <div class="graph-placeholder">Graph goes here</div>
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
import { ref, onMounted } from 'vue';
import { auth } from '../firebaseConfig.js';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'vue-router';

const router = useRouter();
const products = ref([]);
const loading = ref(true);
const showModal = ref(false);
const newItem = ref({ name: '', expiryDate: '' });
const userId = ref(null);

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      userId.value = user.uid;
      fetchProducts();
    } else {
      router.push('/login');
    }
  });
});

async function fetchProducts() {
  loading.value = true;
  const res = await fetch(
    `https://getproducts-moat6vqvca-uc.a.run.app?userId=${userId.value}`
  );
  const data = await res.json();
  products.value = data.products;
  loading.value = false;
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
  await fetchProducts();
}

async function deleteItem(productId) {
  await fetch('https://deleteproduct-moat6vqvca-uc.a.run.app', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId })
  });
  await fetchProducts();
}

async function logout() {
  await signOut(auth);
  router.push('/login');
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
}

.item-card h3 {
    font-size: 18px;
}

.item-card p {
    font-size: 14px;
    color: #777;
}

.time {
    font-size: 20px;
    font-weight: bold;
}

.warn {
    color: #e53e3e;
}

.okay {
    color: #dd6b20;
}

.graph-card {
    margin-top: 30px;
    background: white;
    padding: 25px;
    border-radius: 16px;
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
    background-color: rgba(0,0,0,0.5);
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

.delete-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.3s ease;
}

.item-card:hover .delete-btn {
    opacity: 1;
}
</style>
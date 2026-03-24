<template>
  <div class="container">
    <aside class="sidebar">
      <h2 class="logo">🍎 PantryPlan</h2>
      <nav>
        <a href="/dashboard">🏠 Dashboard</a>
        <a href="/recipes">🍜 Recipes</a>
        <a href="/history" class="active">🕘 History</a>
        <a href="/settings">⚙️ Settings</a>
        <button class="logout-btn" @click="logout">🚪 Logout</button>
      </nav>
    </aside>

    <main class="main">
      <h1>Item History</h1>
      <p class="sub">Used, wasted, and deleted item activity.</p>

      <p v-if="loading">Loading...</p>
      <p v-else-if="error" class="error">{{ error }}</p>

      <div v-else>
        <div v-if="items.length === 0" class="empty-state">
          No history yet.
        </div>

        <div v-for="item in items" :key="item.id" class="history-card">
          <div>
            <h3>{{ item.name }}</h3>
            <p class="meta">Expires: {{ item.expiryDate || '-' }}</p>
            <p class="meta">Updated: {{ formatDate(item.updatedAt) }}</p>
          </div>

          <div class="right">
            <span class="badge" :class="item.status">{{ item.status }}</span>

            <button
              v-if="item.status === 'used' || item.status === 'wasted'"
              class="undo-btn"
              @click="undoFromHistory(item.id)"
            >
              Undo
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { auth } from '../firebaseConfig.js';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'vue-router';

const router = useRouter();
const userId = ref(null);
const loading = ref(true);
const items = ref([]);
const error = ref('');

// Keep lowercase if that is what your deployed URL actually is.
const GET_HISTORY_URL = 'https://gethistory-moat6vqvca-uc.a.run.app';
const UNDO_STATUS_URL = 'https://undoproductstatus-moat6vqvca-uc.a.run.app';

onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return router.push('/login');
    userId.value = user.uid;
    await fetchHistory();
  });
});

async function fetchHistory() {
  loading.value = true;
  error.value = '';

  try {
    const res = await fetch(`${GET_HISTORY_URL}?userId=${userId.value}&limit=50`);
    const data = await res.json();

    if (!res.ok || data.success === false) {
      error.value = data.message || 'Failed to load history.';
      items.value = [];
      return;
    }

    items.value = data.items || [];
  } catch (e) {
    error.value = e.message || 'Failed to load history.';
    items.value = [];
  } finally {
    loading.value = false;
  }
}

async function undoFromHistory(productId) {
  try {
    const res = await fetch(UNDO_STATUS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId })
    });

    const data = await res.json();
    if (!res.ok || data.success === false) {
      alert(data.message || 'Undo failed');
      return;
    }

    await fetchHistory();
  } catch (e) {
    alert(e.message || 'Undo failed');
  }
}

function formatDate(v) {
  if (!v) return '-';
  return new Date(v).toLocaleString();
}

async function logout() {
  await signOut(auth);
  router.push('/login');
}
</script>

<style scoped>
.container { display: flex; }
.sidebar { width: 250px; background: white; height: 100vh; padding: 25px; border-right: 1px solid #e0e0e0; }
.main { flex: 1; padding: 40px; background: #edf2f7; min-height: 100vh; }
.sub { color: #718096; margin-top: 8px; margin-bottom: 20px; }
.error { color: #c53030; margin-bottom: 16px; }

.history-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.meta { color: #718096; font-size: 14px; }

.right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.badge {
  text-transform: capitalize;
  padding: 6px 10px;
  border-radius: 999px;
  color: white;
  font-weight: 600;
  font-size: 12px;
}
.badge.used { background: #2f855a; }
.badge.wasted { background: #e53e3e; }
.badge.deleted { background: #718096; }

.undo-btn {
  border: none;
  border-radius: 8px;
  padding: 6px 10px;
  background: #edf2f7;
  color: #2d3748;
  cursor: pointer;
}

.empty-state { background: white; border-radius: 12px; padding: 24px; color: #718096; }
.sidebar nav a { display: block; padding: 14px 0; color: #555; text-decoration: none; }
.sidebar nav a.active { color: #2c7a7b; font-weight: bold; }
.logout-btn { margin-top: 20px; border: none; background: none; color: #e53e3e; cursor: pointer; }
</style>
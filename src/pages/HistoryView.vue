<template>
  <div class="history-layout">
    <aside class="sidebar" aria-label="Primary">
      <h2 class="logo">PantryPlan</h2>
      <nav>
        <RouterLink to="/dashboard" class="nav-link">Dashboard</RouterLink>
        <RouterLink to="/recipes" class="nav-link">Recipes</RouterLink>
        <RouterLink to="/history" class="nav-link" active-class="active">History</RouterLink>
        <RouterLink to="/settings" class="nav-link">Settings</RouterLink>
        <button type="button" class="logout-btn" @click="logout">Logout</button>
      </nav>
    </aside>

    <main class="main">
      <header class="top-bar">
        <h1>Item History</h1>
      </header>
      <p class="sub">Used, wasted, and deleted item activity.</p>

      <p v-if="loading" class="muted">Loading...</p>
      <p v-else-if="error" class="error">{{ error }}</p>

      <section v-else>
        <div v-if="items.length === 0" class="empty-state">
          No history yet.
        </div>

        <article v-for="item in items" :key="item.id" class="history-card">
          <div>
            <h3>{{ item.name }}</h3>
            <p class="meta">Expires: {{ item.expiryDate || '-' }}</p>
            <p class="meta">Updated: {{ formatDate(item.updatedAt) }}</p>
          </div>

          <div class="right">
            <span class="badge" :class="item.status">{{ item.status }}</span>

            <button
              v-if="item.status === 'used' || item.status === 'wasted'"
              type="button"
              class="undo-btn"
              :disabled="undoingId === item.id"
              @click="undoFromHistory(item.id)"
            >
              {{ undoingId === item.id ? 'Undoing...' : 'Undo' }}
            </button>
          </div>
        </article>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { auth } from '../firebaseConfig.js';
import { signOut, onAuthStateChanged } from 'firebase/auth';

const router = useRouter();
const userId = ref(null);
const loading = ref(true);
const items = ref([]);
const error = ref('');
const undoingId = ref(null);

// Use the same run.app URLs pattern as your Dashboard functions calls
const GET_HISTORY_URL = 'https://gethistory-moat6vqvca-uc.a.run.app';
const UNDO_STATUS_URL = 'https://undoproductstatus-moat6vqvca-uc.a.run.app';

onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      router.push('/login');
      return;
    }

    userId.value = user.uid;
    await fetchHistory();
  });
});

async function fetchHistory() {
  loading.value = true;
  error.value = '';

  try {
    const res = await fetch(`${GET_HISTORY_URL}?userId=${encodeURIComponent(userId.value)}&limit=50`);
    const data = await res.json();

    if (!res.ok || data.success === false) {
      error.value = data.message || 'Failed to load history.';
      items.value = [];
      return;
    }

    items.value = data.items || [];
  } catch (e) {
    error.value = e.message || 'Failed to fetch';
    items.value = [];
  } finally {
    loading.value = false;
  }
}

async function undoFromHistory(productId) {
  undoingId.value = productId;
  error.value = '';

  try {
    const res = await fetch(UNDO_STATUS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId })
    });

    const data = await res.json();
    if (!res.ok || data.success === false) {
      error.value = data.message || 'Undo failed.';
      return;
    }

    await fetchHistory();
  } catch (e) {
    error.value = e.message || 'Undo failed.';
  } finally {
    undoingId.value = null;
  }
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

async function logout() {
  await signOut(auth);
  router.push('/login');
}
</script>

<style scoped>
.history-layout {
  display: flex;
}

.sidebar {
  width: 250px;
  background: #fff;
  height: 100vh;
  padding: 25px;
  border-right: 1px solid #e0e0e0;
}

.logo {
  margin-bottom: 30px;
  font-size: 22px;
  font-weight: 600;
}

.nav-link {
  display: block;
  padding: 14px 0;
  font-size: 16px;
  color: #555;
  text-decoration: none;
  transition: 0.2s;
}

.nav-link:hover,
.nav-link.active {
  color: #2c7a7b;
  font-weight: 700;
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
  font-weight: 700;
}

.main {
  flex: 1;
  padding: 40px;
  background: #edf2f7;
  min-height: 100vh;
}

.sub {
  color: #718096;
  margin-top: 8px;
  margin-bottom: 20px;
}

.muted {
  color: #718096;
}

.error {
  color: #c53030;
  margin-bottom: 16px;
}

.history-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.history-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.history-card h3 {
  font-size: 18px;
  margin-bottom: 4px;
}

.meta {
  color: #718096;
  font-size: 14px;
}

.right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.badge {
  text-transform: capitalize;
  padding: 6px 10px;
  border-radius: 999px;
  color: #fff;
  font-weight: 600;
  font-size: 12px;
}

.badge.used {
  background: #2f855a;
}

.badge.wasted {
  background: #e53e3e;
}

.badge.deleted {
  background: #718096;
}

.undo-btn {
  border: none;
  border-radius: 8px;
  padding: 6px 10px;
  background: #edf2f7;
  color: #2d3748;
  cursor: pointer;
}

.undo-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.empty-state {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  color: #718096;
}

@media (max-width: 900px) {
  .history-layout {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    height: auto;
  }

  .main {
    padding: 20px;
  }

  .history-card {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
<template>
  <div class="container-fluid pp-shell">
    <div class="row g-0">
      <aside class="col-12 col-md-3 col-xl-2 pp-sidebar p-3 p-md-4" aria-label="Primary">
        <div class="pp-logo mb-3">PantryPlan</div>
        <nav class="d-flex flex-column gap-1">
          <RouterLink to="/dashboard" class="pp-nav-link">Dashboard</RouterLink>
          <RouterLink to="/recipes" class="pp-nav-link">Recipes</RouterLink>
          <RouterLink to="/history" class="pp-nav-link" active-class="active">History</RouterLink>
          <RouterLink to="/settings" class="pp-nav-link">Settings</RouterLink>
          <button type="button" class="btn btn-outline-danger btn-sm mt-3 text-start" @click="logout">Logout</button>
        </nav>
      </aside>

      <main class="col-12 col-md-9 col-xl-10 p-3 p-md-4">
        <h1 class="h3 mb-1">Item History</h1>
        <p class="text-muted mb-3">Used, wasted, and deleted item activity.</p>

        <p v-if="loading" class="text-muted">Loading...</p>
        <p v-else-if="error" class="text-danger">{{ error }}</p>

        <section v-else>
          <div v-if="items.length === 0" class="pp-card p-4 text-muted">No history yet.</div>

          <article v-for="item in items" :key="item.id" class="pp-card p-3 mb-3 d-flex justify-content-between align-items-center gap-3">
            <div>
              <h3 class="h6 mb-1">{{ item.name }}</h3>
              <p class="text-muted small mb-1">Expires: {{ item.expiryDate || '-' }}</p>
              <p class="text-muted small mb-0">Updated: {{ formatDate(item.updatedAt) }}</p>
            </div>

            <div class="d-flex align-items-center gap-2">
              <span class="badge text-capitalize" :class="badgeClass(item.status)">{{ item.status }}</span>

              <button
                v-if="item.status === 'used' || item.status === 'wasted'"
                type="button"
                class="btn btn-sm btn-outline-secondary"
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { auth } from '../firebaseConfig.js'
import { signOut, onAuthStateChanged } from 'firebase/auth'

const router = useRouter()
const userId = ref(null)
const loading = ref(true)
const items = ref([])
const error = ref('')
const undoingId = ref(null)

const GET_HISTORY_URL = 'https://gethistory-moat6vqvca-uc.a.run.app'
const UNDO_STATUS_URL = 'https://undoproductstatus-moat6vqvca-uc.a.run.app'

onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      router.push('/login')
      return
    }

    userId.value = user.uid
    await fetchHistory()
  })
})

async function fetchHistory() {
  loading.value = true
  error.value = ''

  try {
    const res = await fetch(`${GET_HISTORY_URL}?userId=${encodeURIComponent(userId.value)}&limit=50`)
    const data = await res.json()

    if (!res.ok || data.success === false) {
      error.value = data.message || 'Failed to load history.'
      items.value = []
      return
    }

    items.value = data.items || []
  } catch (e) {
    error.value = e.message || 'Failed to fetch'
    items.value = []
  } finally {
    loading.value = false
  }
}

async function undoFromHistory(productId) {
  undoingId.value = productId
  error.value = ''

  try {
    const res = await fetch(UNDO_STATUS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId })
    })

    const data = await res.json()
    if (!res.ok || data.success === false) {
      error.value = data.message || 'Undo failed.'
      return
    }

    await fetchHistory()
  } catch (e) {
    error.value = e.message || 'Undo failed.'
  } finally {
    undoingId.value = null
  }
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function badgeClass(status) {
  if (status === 'used') return 'text-bg-success'
  if (status === 'wasted') return 'text-bg-danger'
  return 'text-bg-secondary'
}

async function logout() {
  await signOut(auth)
  router.push('/login')
}
</script>

<style scoped>
.pp-shell {
  min-height: 100vh;
  background: #f8fafc;
}

.pp-sidebar {
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
}

.pp-logo {
  font-size: 1.3rem;
  font-weight: 700;
  color: #0f172a;
}

.pp-nav-link {
  display: block;
  padding: 0.55rem 0.75rem;
  border-radius: 0.5rem;
  text-decoration: none;
  color: #475569;
  font-weight: 500;
  transition: all 0.15s ease;
}

.pp-nav-link:hover,
.pp-nav-link.active {
  color: #0f172a;
  background: #e2e8f0;
}

.pp-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 0.9rem;
}

@media (max-width: 767px) {
  .pp-sidebar {
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }
}
</style>
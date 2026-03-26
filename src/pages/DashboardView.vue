<template>
  <div class="container-fluid pp-shell">
    <div class="row g-0">
      <!-- Sidebar -->
      <aside class="col-12 col-md-3 col-xl-2 pp-sidebar">
        <div class="pp-logo">PantryPlan</div>
        <nav class="d-flex flex-column gap-1">
          <a href="/dashboard" class="pp-nav-link active">Dashboard</a>
          <a href="/recipes" class="pp-nav-link">Recipes</a>
          <a href="/history" class="pp-nav-link">History</a>
          <a href="/settings" class="pp-nav-link">Settings</a>
          <button class="btn btn-outline-danger btn-sm mt-3 text-start" @click="logout">Logout</button>
        </nav>
      </aside>

      <!-- Main -->
      <main class="col-12 col-md-9 col-xl-10 p-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h1 class="h3 mb-0">My Pantry</h1>
          <button class="btn btn-primary" @click="showModal = true">Add Item</button>
        </div>

        <p v-if="loading" class="text-muted">Loading...</p>

        <div v-else>
          <div v-if="products.length === 0" class="pp-card p-4 text-muted mb-3">
            No active items in your pantry yet.
          </div>

          <TransitionGroup name="fade-slide" tag="div">
            <div class="pp-card pp-hover p-3 mb-3 d-flex justify-content-between align-items-center"
                 v-for="product in products" :key="product.id">
              <div>
                <h3 class="h6 mb-1">{{ product.name }}</h3>
                <p class="mb-1 text-muted">Expires: {{ product.expiryDate }}</p>
                <small :class="expiryTextClass(product.expiryDate)">{{ daysUntilExpiry(product.expiryDate) }}</small>
              </div>

              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-success" @click="markUsed(product.id)">Use</button>
                <button class="btn btn-sm btn-outline-danger" @click="confirmWaste(product.id)">Waste</button>
                <button class="btn btn-sm btn-outline-secondary" @click="deleteItem(product.id)">Delete</button>
              </div>
            </div>
          </TransitionGroup>
        </div>

        <div class="pp-card p-4 mt-4" style="min-height:320px;">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h2 class="h5 mb-0">Weekly Waste Insights</h2>
            <span class="badge text-bg-light">Waste Rate: {{ wasteRatePercent }}</span>
          </div>

          <Bar v-if="analytics.labels.length" :data="chartData" :options="chartOptions" />
          <div v-else class="text-muted">No analytics data yet.</div>
        </div>

        <div v-if="undo.visible" class="position-fixed bottom-0 end-0 m-4 p-3 rounded bg-dark text-white d-flex gap-2 align-items-center" style="z-index:1200;">
          Marked as {{ undo.action }}.
          <button class="btn btn-sm btn-light" @click="undoLastAction">Undo</button>
        </div>
      </main>
    </div>

    <!-- Add Item Modal -->
    <div class="modal fade" :class="{ show: showModal }" :style="{ display: showModal ? 'block' : 'none' }" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content pp-card">
          <div class="modal-header border-0">
            <h5 class="modal-title">Add New Item</h5>
            <button type="button" class="btn-close" @click="showModal = false"></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="addItem">
              <div class="mb-3">
                <label class="form-label">Item Name</label>
                <input class="form-control" type="text" v-model="newItem.name" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Expiry Date</label>
                <input class="form-control" type="date" v-model="newItem.expiryDate" required />
              </div>
              <button class="btn btn-primary w-100" type="submit">Add Item</button>
            </form>
          </div>
        </div>
      </div>
    </div>
    <div v-if="showModal" class="modal-backdrop fade show"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { auth } from '../firebaseConfig.js'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'vue-router'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const router = useRouter()
const products = ref([])
const loading = ref(true)
const showModal = ref(false)
const newItem = ref({ name: '', expiryDate: '' })
const userId = ref(null)

const analytics = ref({ labels: [], used: [], wasted: [], wasteRate: 0 })
const undo = ref({ visible: false, productId: null, action: '', timer: null })

const chartData = computed(() => ({
  labels: analytics.value.labels,
  datasets: [
    { label: 'Used', data: analytics.value.used, backgroundColor: '#16a34a' },
    { label: 'Wasted', data: analytics.value.wasted, backgroundColor: '#dc2626' }
  ]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' } }
}

const wasteRatePercent = computed(() => `${Math.round((analytics.value.wasteRate || 0) * 100)}%`)

onMounted(() => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return router.push('/login')
    userId.value = user.uid
    await Promise.all([fetchProducts(), fetchAnalytics()])
  })
})

async function fetchProducts() {
  loading.value = true
  try {
    const res = await fetch(`https://getproducts-moat6vqvca-uc.a.run.app?userId=${userId.value}`)
    const data = await res.json()
    products.value = data.products || []
  } finally {
    loading.value = false
  }
}

async function fetchAnalytics() {
  const res = await fetch(`https://getweeklyanalytics-moat6vqvca-uc.a.run.app?userId=${userId.value}&weeks=4`)
  const data = await res.json()
  analytics.value = data.success ? data : { labels: [], used: [], wasted: [], wasteRate: 0 }
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
  })

  newItem.value = { name: '', expiryDate: '' }
  showModal.value = false
  await Promise.all([fetchProducts(), fetchAnalytics()])
}

async function deleteItem(productId) {
  await fetch('https://deleteproduct-moat6vqvca-uc.a.run.app', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId })
  })
  await Promise.all([fetchProducts(), fetchAnalytics()])
}

async function markUsed(productId) {
  await updateStatus(productId, 'used')
}

async function confirmWaste(productId) {
  if (!confirm('Mark this item as wasted?')) return
  await updateStatus(productId, 'wasted')
}

async function updateStatus(productId, status) {
  await fetch('https://updateproductstatus-moat6vqvca-uc.a.run.app', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, status })
  })
  showUndo(productId, status)
  await Promise.all([fetchProducts(), fetchAnalytics()])
}

function showUndo(productId, action) {
  if (undo.value.timer) clearTimeout(undo.value.timer)
  undo.value.visible = true
  undo.value.productId = productId
  undo.value.action = action
  undo.value.timer = setTimeout(() => (undo.value.visible = false), 8000)
}

async function undoLastAction() {
  if (!undo.value.productId) return
  await fetch('https://undoproductstatus-moat6vqvca-uc.a.run.app', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId: undo.value.productId })
  })
  clearTimeout(undo.value.timer)
  undo.value.visible = false
  await Promise.all([fetchProducts(), fetchAnalytics()])
}

function daysUntilExpiry(expiryDate) {
  const today = new Date()
  const expiry = new Date(expiryDate)
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'Expired'
  if (diffDays === 0) return 'Expires today'
  if (diffDays === 1) return '1 day left'
  return `${diffDays} days left`
}

function expiryTextClass(expiryDate) {
  const today = new Date()
  const expiry = new Date(expiryDate)
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'text-danger'
  if (diffDays <= 2) return 'text-warning'
  return 'text-success'
}

async function logout() {
  await signOut(auth)
  router.push('/login')
}
</script>
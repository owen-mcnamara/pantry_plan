<template>
    < class="container-fluid pp-shell">
    <div class="row g-0">
        <aside class="col-12 col-md-3 col-xl-2 pp-sidebar p-3 p-md-4">
        <div class="pp-logo mb-3">PantryPlan</div>
        <nav class="d-flex flex-column gap-1">
            <a href="/dashboard" class="pp-nav-link active">Dashboard</a>
            <a href="/recipes" class="pp-nav-link">Recipes</a>
            <a href="/history" class="pp-nav-link">History</a>
            <a href="/settings" class="pp-nav-link">Settings</a>
            <button class="btn btn-outline-danger btn-sm mt-3 text-start" @click="logout">Logout</button>
        </nav>
        </aside>

        <main class="col-12 col-md-9 col-xl-10 p-3 p-md-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h1 class="h3 mb-0">My Pantry</h1>
            <div class="d-flex gap-2">
            <button class="btn btn-outline-primary" @click="openScannerModal">Scan Item</button>
            <button class="btn btn-primary" @click="showModal = true">Add Item</button>
            </div>
        </div>

        <p v-if="loading" class="text-muted">Loading...</p>

        <div v-else>
            <div v-if="products.length === 0" class="pp-card p-4 text-muted mb-3">
            No active items in your pantry yet.
            </div>

            <TransitionGroup name="fade-slide" tag="div">
            <div
                v-for="product in products"
                :key="product.id"
                class="pp-card pp-hover p-3 mb-3 d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3"
            >
                <div>
                <h3 class="h6 mb-1">{{ product.name }}</h3>
                <p class="mb-1 text-muted">
                    {{ formatQty(product.quantity, product.unit) }} • Expires: {{ product.expiryDate }}
                </p>
                <small :class="expiryTextClass(product.expiryDate)">{{ daysUntilExpiry(product.expiryDate) }}</small>
                </div>

                <div class="d-flex flex-wrap gap-2">
                <button class="btn btn-sm btn-outline-primary" @click="openEditModal(product)">Edit</button>
                <button class="btn btn-sm btn-outline-success" @click="markUsed(product.id)">Use</button>
                <button class="btn btn-sm btn-outline-danger" @click="confirmWaste(product.id)">Waste</button>
                <button class="btn btn-sm btn-outline-secondary" @click="deleteItem(product.id)">Delete</button>
                </div>
            </div>
            </TransitionGroup>
        </div>

        <div class="row g-3 mt-1">
        <div class="col-12 col-xl-6">
            <section class="pp-card p-3 p-md-4 h-100">
                <h2 class="h5 mb-3">Top Wasted Items (30 Days)</h2>
                <ul v-if="insights.topWasted?.length" class="list-group list-group-flush">
                <li
                    v-for="(item, idx) in insights.topWasted"
                    :key="item.name + idx"
                    class="list-group-item d-flex justify-content-between align-items-center px-0"
                >
                    <span>{{ idx + 1 }}. {{ item.name }}</span>
                    <span class="badge text-bg-danger rounded-pill">{{ item.count }}</span>
                </li>
                </ul>
                <p v-else class="text-muted mb-0">No wasted items in last 30 days.</p>
            </section>
            </div>

            <div class="col-12 col-xl-6">
            <section class="pp-card p-3 p-md-4 h-100">
                <h2 class="h5 mb-3">Expiring Soon</h2>

                <div class="d-flex flex-wrap gap-2 mb-3">
                <span class="badge text-bg-danger">1 day: {{ insights.expiringSoon?.in1Day || 0 }}</span>
                <span class="badge text-bg-warning">3 days: {{ insights.expiringSoon?.in3Days || 0 }}</span>
                <span class="badge text-bg-info">7 days: {{ insights.expiringSoon?.in7Days || 0 }}</span>
                </div>

                <ul v-if="insights.expiringSoon?.items?.length" class="list-group list-group-flush">
                <li
                    v-for="item in insights.expiringSoon.items"
                    :key="item.id"
                    class="list-group-item d-flex justify-content-between align-items-center px-0"
                >
                    <span>{{ item.name }}</span>
                    <small class="text-muted">{{ item.daysLeft }} day(s)</small>
                </li>
                </ul>

                <p v-else class="text-muted mb-0">No active items expiring in next 7 days.</p>
            </section>
            </div>
        </div>

        <div class="pp-card p-3 p-md-4 mt-4" style="height: 500px;">
            <div class="d-flex justify-content-between align-items-center mb-3">
            <h2 class="h5 mb-0">Weekly Waste Insights (Last 4 Weeks)</h2>
            <span class="badge text-bg-light">Waste Rate: {{ wasteRatePercent }}</span>
            </div>

            <Bar v-if="analytics.labels.length" :data="chartData" :options="chartOptions" />
            <div v-else class="text-muted">No analytics data yet.</div>
        </div>

        <div
            v-if="undo.visible"
            class="position-fixed bottom-0 end-0 m-4 p-3 rounded bg-dark text-white d-flex gap-2 align-items-center"
            style="z-index: 1200;"
        >
            Marked as {{ undo.action }}.
            <button class="btn btn-sm btn-light" @click="undoLastAction">Undo</button>
        </div>
        </main>
    </div>

    <div class="modal fade" :class="{ show: showWasteConfirmModal }" :style="{ display: showWasteConfirmModal ? 'block' : 'none' }" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content pp-card border-0">
            <div class="modal-header border-0 pb-0">
            <h5 class="modal-title">Confirm Waste</h5>
            <button type="button" class="btn-close" @click="closeWasteConfirm"></button>
            </div>
            <div class="modal-body">
            <p class="mb-0">Mark this item as wasted? You can still undo from History.</p>
            </div>
            <div class="modal-footer border-0 pt-0">
            <button type="button" class="btn btn-outline-secondary" @click="closeWasteConfirm">Cancel</button>
            <button type="button" class="btn btn-danger" @click="confirmWasteNow">Mark as Wasted</button>
            </div>
        </div>
        </div>
    </div>
    <div v-if="showWasteConfirmModal" class="modal-backdrop fade show"></div>

    <div class="modal fade" :class="{ show: showEditModal }" :style="{ display: showEditModal ? 'block' : 'none' }" tabindex="-1">
        <div class="modal-dialog">
        <div class="modal-content pp-card border-0">
            <div class="modal-header border-0 pb-0">
            <h5 class="modal-title">Edit Item</h5>
            <button type="button" class="btn-close" @click="showEditModal = false"></button>
            </div>
            <div class="modal-body">
            <form @submit.prevent="saveEdit">
                <div class="mb-3">
                <label class="form-label">Item Name</label>
                <input type="text" class="form-control" v-model="editForm.name" required />
                </div>

                <div class="mb-3">
                <label class="form-label">Expiry Date</label>
                <input type="date" class="form-control" v-model="editForm.expiryDate" required />
                </div>

                <div class="mb-3">
                <label class="form-label">Quantity</label>
                <input type="number" min="0" step="0.1" class="form-control" v-model.number="editForm.quantity" required />
                </div>

                <div class="mb-3">
                <label class="form-label">Unit</label>
                <input type="text" maxlength="20" class="form-control" v-model="editForm.unit" required />
                </div>

                <button type="submit" class="btn btn-primary w-100">Save Changes</button>
            </form>
            </div>
        </div>
        </div>
    </div>
    <div v-if="showEditModal" class="modal-backdrop fade show"></div>

    <div class="modal fade" :class="{ show: showModal }" :style="{ display: showModal ? 'block' : 'none' }" tabindex="-1">
        <div class="modal-dialog">
        <div class="modal-content pp-card border-0">
            <div class="modal-header border-0 pb-0">
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
                <label class="form-label">Quantity</label>
                <input class="form-control" type="number" min="0" step="0.1" v-model.number="newItem.quantity" required />
                <small class="text-muted">{{ formatQty(newItem.quantity, newItem.unit) }} • Expires: {{ newItem.expiryDate || '-' }}</small>
                </div>

                <div class="mb-3">
                <label class="form-label">Unit</label>
                <input class="form-control" type="text" maxlength="20" v-model="newItem.unit" placeholder="item, kg, L..." required />
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

    <div class="modal fade" :class="{ show: showScannerModal }" :style="{ display: showScannerModal ? 'block' : 'none' }" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content pp-card border-0">
            <div class="modal-header border-0 pb-0">
            <h5 class="modal-title">Scan Barcode</h5>
            <button type="button" class="btn-close" @click="closeScannerModal"></button>
            </div>
            <div class="modal-body">
            <p class="text-muted mb-2">Point your camera at a product barcode. We will auto-fill the item name when detected. </p>
            <p v-if="scannerModeMessage" class="small text-muted mb-2">{{ scannerModeMessage }}</p>

            <div class="scanner-preview mb-3">
                <video ref="scannerVideo" autoplay muted playsinline class="scanner-video"></video>
            </div>

            <p v-if="scannedBarcode" class="mb-2">
                <strong>Last scan:</strong> {{ scannedBarcode }}
            </p>
            <p v-if="isLookingUpBarcode" class="text-muted mb-0">Looking up item details...</p>
            <p v-else-if="scannerError" class="text-danger mb-0">{{ scannerError }}</p>
            </div>
            <div class="modal-footer border-0 pt-0">
            <button type="button" class="btn btn-outline-secondary" @click="closeScannerModal">Cancel</button>
            </div>
        </div>
        </div>
    </div>
    <div v-if="showScannerModal" class="modal-backdrop fade show"></div>
    
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { auth } from '../firebaseConfig.js'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'vue-router'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { authenticatedFetch } from '../services/api.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const showEditModal = ref(false)
const editingItem = ref(null)
const editForm = ref({ name: '', expiryDate: '', quantity: 1, unit: 'item' })

const router = useRouter()
const products = ref([])
const loading = ref(true)
const showModal = ref(false)
const newItem = ref({ name: '', expiryDate: '', quantity: 1, unit: 'item' })
const userId = ref(null)
const showWasteConfirmModal = ref(false)
const pendingWasteId = ref(null)
const showScannerModal = ref(false)
const scannerVideo = ref(null)
const scannerError = ref('')
const isLookingUpBarcode = ref(false)
const scannedBarcode = ref('')
const scannerDetector = ref(null)
const scannerCleanup = ref(null)
const scannerMode = ref('')
const scannerModeMessage = ref('')

let scannerStream = null
let scannerFrameId = null

const analytics = ref({ labels: [], used: [], wasted: [], wasteRate: 0 })
const undo = ref({ visible: false, productId: null, action: '', timer: null })
const insights = ref({
    topWasted: [],
    expiringSoon: { in1Day: 0, in3Days: 0, in7Days: 0, items: [] }
})

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
    if (!user) {
        router.push('/login')
        return
    }

    userId.value = user.uid
    await Promise.all([fetchProducts(), fetchAnalytics(), fetchInsights()])
    })
})

onUnmounted(() => {
    stopScanner()
})

async function fetchProducts() {
    loading.value = true
    try {
    const res = await authenticatedFetch(`https://getproducts-moat6vqvca-uc.a.run.app?userId=${userId.value}`)
    const data = await res.json()
    products.value = data.products || []
    } catch (err) {
    console.error('fetchProducts error:', err)
    products.value = []
    } finally {
    loading.value = false
    }
}

async function fetchInsights() {
    try {
    const res = await authenticatedFetch(`https://getinsightssummary-moat6vqvca-uc.a.run.app?userId=${userId.value}`)
    const data = await res.json()

    insights.value = data.success
        ? data
        : { topWasted: [], expiringSoon: { in1Day: 0, in3Days: 0, in7Days: 0, items: [] } }
    } catch (err) {
    console.error('fetchInsights error:', err)
    insights.value = { topWasted: [], expiringSoon: { in1Day: 0, in3Days: 0, in7Days: 0, items: [] } }
    }
}

async function fetchAnalytics() {
    try {
    const res = await authenticatedFetch(`https://getweeklyanalytics-moat6vqvca-uc.a.run.app?userId=${userId.value}&weeks=4`)
    const data = await res.json()
    analytics.value = data.success ? data : { labels: [], used: [], wasted: [], wasteRate: 0 }
    } catch (err) {
    console.error('fetchAnalytics error:', err)
    analytics.value = { labels: [], used: [], wasted: [], wasteRate: 0 }
    }
}

async function addItem() {
    if (!newItem.value.name || !newItem.value.expiryDate) return

    try {
    await authenticatedFetch('https://addproduct-moat6vqvca-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        userId: userId.value,
        name: newItem.value.name,
        expiryDate: newItem.value.expiryDate,
        expiryTimestampUtc: new Date(newItem.value.expiryDate).toISOString(),
        status: 'active',
        quantity: newItem.value.quantity,
        unit: newItem.value.unit
        })
    })

    newItem.value = { name: '', expiryDate: '', quantity: 1, unit: 'item' }
    showModal.value = false
    await Promise.all([fetchProducts(), fetchAnalytics(), fetchInsights()])
    } catch (err) {
    console.error('addItem error:', err)
    alert('Failed to add item')
    }
}

async function openScannerModal() {
  showScannerModal.value = true
  scannerError.value = ''
  scannedBarcode.value = ''
  await startScanner()
}

function closeScannerModal() {
  showScannerModal.value = false
  stopScanner()
}

async function startScanner() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      scannerError.value = 'Camera access is not supported in this browser.'
      return
    }

    if (typeof window.BarcodeDetector === 'function') {
      scannerMode.value = 'native'
      scannerModeMessage.value = 'Using native browser barcode scanner.'
      scannerDetector.value = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128']
      })

      scannerStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      })

      if (!scannerVideo.value) return
      scannerVideo.value.srcObject = scannerStream
      await scannerVideo.value.play()
      scannerFrameId = requestAnimationFrame(scanFrame)
      return
    }

    scannerMode.value = 'quagga'
    scannerModeMessage.value = 'Native scanner unavailable. Using compatibility scanner.'
    await startQuaggaScanner()
  } catch (err) {
    console.error('startScanner error:', err)
    scannerError.value = 'Unable to start camera. Please allow camera permission and try again.'
  }
}

async function startQuaggaScanner() {
  if (!scannerVideo.value) return

  const Quagga = await loadQuagga()
  await new Promise((resolve, reject) => {
    Quagga.init(
      {
        inputStream: {
          type: 'LiveStream',
          target: scannerVideo.value,
          constraints: {
            facingMode: 'environment'
          }
        },
        decoder: {
          readers: ['ean_reader', 'ean_8_reader', 'upc_reader', 'upc_e_reader', 'code_128_reader']
        },
        locate: true
      },
      (err) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      }
    )
  })

  const onDetected = (data) => {
    if (isLookingUpBarcode.value) return
    const barcodeValue = data?.codeResult?.code?.trim()
    if (!barcodeValue) return
    scannedBarcode.value = barcodeValue
    applyScannedBarcode(barcodeValue)
  }

  Quagga.onDetected(onDetected)
  Quagga.start()
  scannerCleanup.value = () => {
    Quagga.offDetected(onDetected)
    Quagga.stop()
  }
}

async function loadQuagga() {
  if (window.Quagga) return window.Quagga

  await new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-quagga="true"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load scanner library')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/@ericblade/quagga2@1.8.4/dist/quagga.min.js'
    script.async = true
    script.dataset.quagga = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load scanner library'))
    document.head.appendChild(script)
  })

  if (!window.Quagga) {
    throw new Error('Scanner library unavailable')
  }

  return window.Quagga
}

function stopScanner() {
  if (scannerFrameId) {
    cancelAnimationFrame(scannerFrameId)
    scannerFrameId = null
  }

  if (scannerStream) {
    scannerStream.getTracks().forEach((track) => track.stop())
    scannerStream = null
  }

  if (scannerCleanup.value) {
    scannerCleanup.value()
    scannerCleanup.value = null
  }

  if (scannerVideo.value) {
    scannerVideo.value.srcObject = null
  }

  scannerMode.value = ''
  scannerModeMessage.value = ''
}

async function scanFrame() {
  if (!showScannerModal.value) {
    return
  }

  if (!scannerVideo.value || !scannerDetector.value || isLookingUpBarcode.value) {
    scannerFrameId = requestAnimationFrame(scanFrame)
    return
  }

  try {
    const detections = await scannerDetector.value.detect(scannerVideo.value)
    const barcodeValue = detections?.[0]?.rawValue?.trim()

    if (barcodeValue) {
      scannedBarcode.value = barcodeValue
      await applyScannedBarcode(barcodeValue)
      return
    }
  } catch (err) {
    console.error('scanFrame error:', err)
  }

  scannerFrameId = requestAnimationFrame(scanFrame)
}

async function applyScannedBarcode(barcode) {
  isLookingUpBarcode.value = true
  scannerError.value = ''

  try {
    const result = await lookupBarcode(barcode)
    if (!result?.found) {
      scannerError.value = 'Barcode scanned, but no product match was found.'
      isLookingUpBarcode.value = false
      scannerFrameId = requestAnimationFrame(scanFrame)
      return
    }

    newItem.value = {
      ...newItem.value,
      name: result.product?.name || '',
      quantity: newItem.value.quantity || 1,
      unit: newItem.value.unit || 'item'
    }

    closeScannerModal()
    showModal.value = true
  } catch (err) {
    console.error('applyScannedBarcode error:', err)
    scannerError.value = err.message || 'Failed to look up barcode.'
    scannerFrameId = requestAnimationFrame(scanFrame)
  } finally {
    isLookingUpBarcode.value = false
  }
}

async function deleteItem(productId) {
    try {
    await authenticatedFetch('https://deleteproduct-moat6vqvca-uc.a.run.app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId })
    })

    await Promise.all([fetchProducts(), fetchAnalytics(), fetchInsights()])
  } catch (err) {
    console.error('deleteItem error:', err)
    alert('Failed to delete item')
  }
}

async function markUsed(productId) {
  await updateStatus(productId, 'used')
}

function confirmWaste(productId) {
  pendingWasteId.value = productId
  showWasteConfirmModal.value = true
}

function closeWasteConfirm() {
  showWasteConfirmModal.value = false
  pendingWasteId.value = null
}

async function confirmWasteNow() {
  if (!pendingWasteId.value) return
  const productId = pendingWasteId.value
  closeWasteConfirm()
  await updateStatus(productId, 'wasted')
}

async function updateStatus(productId, status) {
  try {
    await authenticatedFetch('https://updateproductstatus-moat6vqvca-uc.a.run.app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, status })
    })

    showUndo(productId, status)
    await Promise.all([fetchProducts(), fetchAnalytics(), fetchInsights()])
  } catch (err) {
    console.error('updateStatus error:', err)
    alert('Failed to update status')
  }
}

function showUndo(productId, action) {
  if (undo.value.timer) clearTimeout(undo.value.timer)

  undo.value.visible = true
  undo.value.productId = productId
  undo.value.action = action
  undo.value.timer = setTimeout(() => {
    undo.value.visible = false
  }, 8000)
}

async function undoLastAction() {
  if (!undo.value.productId) return

  try {
    await authenticatedFetch('https://undoproductstatus-moat6vqvca-uc.a.run.app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: undo.value.productId })
    })

    clearTimeout(undo.value.timer)
    undo.value.visible = false
    await Promise.all([fetchProducts(), fetchAnalytics(), fetchInsights()])
  } catch (err) {
    console.error('undoLastAction error:', err)
    alert('Failed to undo')
  }
}

function formatQty(quantity, unit) {
  const q = Number(quantity)
  const safeQ = Number.isFinite(q) ? q : 1
  const safeUnit = (unit || 'item').toString()
  return `${safeQ} ${safeUnit}`
}

function openEditModal(product) {
  editingItem.value = product
  editForm.value = {
    name: product.name || '',
    expiryDate: product.expiryDate || '',
    quantity: Number.isFinite(Number(product.quantity)) ? Number(product.quantity) : 1,
    unit: product.unit || 'item'
  }
  showEditModal.value = true
}

async function saveEdit() {
  if (!editingItem.value?.id) return

  try {
    await authenticatedFetch('https://updateproduct-moat6vqvca-uc.a.run.app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: editingItem.value.id,
        name: editForm.value.name,
        expiryDate: editForm.value.expiryDate,
        quantity: editForm.value.quantity,
        unit: editForm.value.unit
      })
    })

    showEditModal.value = false
    await Promise.all([fetchProducts(), fetchAnalytics(), fetchInsights()])
  } catch (err) {
    console.error('saveEdit error:', err)
    alert('Failed to save changes')
  }
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

.pp-hover {
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.pp-hover:hover {
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.22s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.scanner-preview {
  background: #0f172a;
  border-radius: 0.75rem;
  overflow: hidden;
  width: 100%;
  min-height: 240px;
}

.scanner-video {
  width: 100%;
  height: 100%;
  min-height: 240px;
  object-fit: cover;
}


@media (max-width: 767px) {
  .pp-sidebar {
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }
}
</style>

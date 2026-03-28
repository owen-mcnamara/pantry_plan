<template>
  <div class="container-fluid pp-shell">
    <div class="row g-0">
      <aside class="col-12 col-md-3 col-xl-2 pp-sidebar p-3 p-md-4">
        <div class="pp-logo mb-3">PantryPlan</div>
        <nav class="d-flex flex-column gap-1">
          <a href="/dashboard" class="pp-nav-link">Dashboard</a>
          <a href="/recipes" class="pp-nav-link active">Recipes</a>
          <a href="/history" class="pp-nav-link">History</a>
          <a href="/settings" class="pp-nav-link">Settings</a>
          <button class="btn btn-outline-danger btn-sm mt-3 text-start" @click="logout">Logout</button>
        </nav>
      </aside>

      <main class="col-12 col-md-9 col-xl-10 p-3 p-md-4">
        <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
          <div>
            <h1 class="h3 mb-1">Recipe Suggestions</h1>
            <p class="text-muted mb-0">Fresh ideas ranked by how well they match your pantry.</p>
          </div>
          <button class="btn btn-outline-primary" @click="loadRecipes" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Refresh
          </button>
        </div>

        <div class="pp-card p-3 mb-3">
          <div class="row g-3 align-items-end">
            <div class="col-12 col-md-5">
              <label class="form-label mb-1">Sort by</label>
              <select class="form-select" v-model="sortBy">
                <option value="best-match">Best pantry match</option>
                <option value="least-missing">Fewest missing ingredients</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>
            <div class="col-12 col-md-4">
              <label class="form-label mb-1">Max missing ingredients</label>
              <select class="form-select" v-model.number="maxMissingFilter">
                <option :value="99">Any</option>
                <option :value="0">0 (Only full matches)</option>
                <option :value="2">2</option>
                <option :value="4">4</option>
                <option :value="6">6</option>
              </select>
            </div>
            <div class="col-12 col-md-3">
              <label class="form-label mb-1">Showing</label>
              <div class="form-control text-muted">{{ visibleRecipes.length }} of {{ filteredRecipes.length }}</div>
            </div>
          </div>
        </div>

        <div v-if="loading" class="row g-3">
          <div class="col-12 col-md-6 col-xl-4" v-for="idx in 6" :key="idx">
            <div class="pp-card p-3 h-100">
              <div class="skeleton skeleton-img mb-3"></div>
              <div class="skeleton skeleton-title mb-2"></div>
              <div class="skeleton skeleton-line mb-2"></div>
              <div class="skeleton skeleton-line w-50"></div>
            </div>
          </div>
        </div>

        <div v-else>
          <div v-if="errorMessage" class="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
            <span>{{ errorMessage }}</span>
            <button class="btn btn-sm btn-light" @click="loadRecipes">Retry</button>
          </div>

          <div v-else-if="recipes.length === 0" class="pp-card p-4 text-muted">
            No recipes found. Add more pantry items and try refresh.
          </div>

          <div v-else-if="filteredRecipes.length === 0" class="pp-card p-4 text-muted">
            No recipes match the current filter. Try allowing more missing ingredients.
          </div>

          <div v-else class="row g-3">
            <div class="col-12 col-md-6 col-xl-4" v-for="recipe in visibleRecipes" :key="recipe.id">
              <article class="pp-card pp-hover h-100 d-flex flex-column" @click="viewRecipe(recipe.id)">
                <img :src="recipe.image" :alt="recipe.title" class="recipe-img" />

                <div class="p-3 d-flex flex-column gap-2 flex-grow-1">
                  <h2 class="h5 mb-0 recipe-title">{{ recipe.title }}</h2>

                  <div class="d-flex flex-wrap gap-2">
                    <span class="badge text-bg-success">Uses {{ recipe.usedIngredientCount }}</span>
                    <span class="badge" :class="recipe.missedIngredientCount === 0 ? 'text-bg-primary' : 'text-bg-warning'">
                      Missing {{ recipe.missedIngredientCount }}
                    </span>
                  </div>

                  <p class="text-muted small mb-0 clamp-2">
                    Pantry match: {{ recipe.usedIngredientsText || '—' }}
                  </p>
                </div>
              </article>
            </div>
          </div>

          <div class="d-flex justify-content-center mt-4" v-if="visibleCount < filteredRecipes.length">
            <button class="btn btn-outline-primary" @click="loadMore">Load More</button>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { auth } from '../firebaseConfig.js'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(true)
const recipes = ref([])
const userId = ref(null)
const errorMessage = ref('')

const sortBy = ref('best-match')
const maxMissingFilter = ref(99)
const visibleCount = ref(12)
const refreshNonce = ref(0)

const FETCH_SIZE = 60
const LOAD_MORE_STEP = 12
const INGREDIENT_SAMPLE_SIZE = 8

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      userId.value = user.uid
      loadRecipes()
    } else {
      router.push('/login')
    }
  })
})

watch([sortBy, maxMissingFilter], () => {
  visibleCount.value = 12
})

const filteredRecipes = computed(() => {
  const filtered = recipes.value.filter((r) => r.missedIngredientCount <= maxMissingFilter.value)

  if (sortBy.value === 'least-missing') {
    return filtered.slice().sort((a, b) => {
      if (a.missedIngredientCount !== b.missedIngredientCount) {
        return a.missedIngredientCount - b.missedIngredientCount
      }
      return b.usedIngredientCount - a.usedIngredientCount
    })
  }

  if (sortBy.value === 'title') {
    return filtered.slice().sort((a, b) => a.title.localeCompare(b.title))
  }

  return filtered.slice().sort((a, b) => {
    if (b.usedIngredientCount !== a.usedIngredientCount) {
      return b.usedIngredientCount - a.usedIngredientCount
    }
    if (a.missedIngredientCount !== b.missedIngredientCount) {
      return a.missedIngredientCount - b.missedIngredientCount
    }

    return tieBreak(a.id, b.id, refreshNonce.value)
  })
})

const visibleRecipes = computed(() => filteredRecipes.value.slice(0, visibleCount.value))

async function loadRecipes() {
  loading.value = true
  errorMessage.value = ''
  refreshNonce.value += 1

  try {
    const pantryRes = await fetch(`https://getproducts-moat6vqvca-uc.a.run.app?userId=${userId.value}`)
    const pantryData = await pantryRes.json()
    const pantryNames = (pantryData.products || []).map((p) => p.name).filter(Boolean)

    if (!pantryNames.length) {
      recipes.value = []
      return
    }

    // Sample a rotating subset so Refresh can surface different ideas.
    const sampledIngredients = shuffled(pantryNames).slice(0, INGREDIENT_SAMPLE_SIZE)
    const ingredients = sampledIngredients.join(',')

    const spoonacularRes = await fetch(
      `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredients}&number=${FETCH_SIZE}&ranking=2&ignorePantry=true&apiKey=${import.meta.env.VITE_SPOONACULAR_KEY}`
    )

    if (!spoonacularRes.ok) {
      throw new Error('Could not load recipe suggestions right now.')
    }

    const spoonacularData = await spoonacularRes.json()

    recipes.value = spoonacularData.map((recipe) => {
      const usedCount = Number(recipe.usedIngredientCount || recipe.usedIngredients?.length || 0)
      const missedCount = Number(recipe.missedIngredientCount || recipe.missedIngredients?.length || 0)

      return {
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        usedIngredientCount: usedCount,
        missedIngredientCount: missedCount,
        usedIngredientsText: (recipe.usedIngredients || []).map((i) => i.name).slice(0, 4).join(', ')
      }
    })

    visibleCount.value = LOAD_MORE_STEP
  } catch (error) {
    errorMessage.value = error.message || 'Failed to load recipes.'
    recipes.value = []
  } finally {
    loading.value = false
  }
}

function shuffled(list) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = copy[i]
    copy[i] = copy[j]
    copy[j] = temp
  }
  return copy
}

function tieBreak(idA, idB, nonce) {
  const scoreA = hashCode(`${idA}-${nonce}`)
  const scoreB = hashCode(`${idB}-${nonce}`)
  return scoreA - scoreB
}

function hashCode(value) {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return hash
}

function loadMore() {
  visibleCount.value += LOAD_MORE_STEP
}

async function logout() {
  await signOut(auth)
  router.push('/login')
}

function viewRecipe(id) {
  router.push(`/recipes/${id}`)
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
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.pp-hover:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.12);
}

.recipe-img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  border-bottom: 1px solid #e5e7eb;
}

.recipe-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 3rem;
}

.clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.skeleton {
  border-radius: 0.5rem;
  background: linear-gradient(90deg, #eef2f7 25%, #e3e8ef 50%, #eef2f7 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
}

.skeleton-img {
  height: 160px;
}

.skeleton-title {
  height: 20px;
}

.skeleton-line {
  height: 14px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (max-width: 767px) {
  .pp-sidebar {
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }
}
</style>
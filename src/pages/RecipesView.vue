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
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h1 class="h3 mb-0">Recipe Suggestions</h1>
        </div>

        <p class="text-muted mb-3">Fresh ideas based on your pantry items.</p>

        <p v-if="loading" class="text-muted">Loading...</p>

        <div v-else>
          <div v-if="recipes.length === 0" class="pp-card p-4 text-muted">
            No recipes found. Add some items to your pantry first!
          </div>

          <div class="d-grid gap-3" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
            <div
              class="pp-card pp-hover p-3 d-flex gap-3 align-items-center"
              v-for="recipe in recipes"
              :key="recipe.id"
              @click="viewRecipe(recipe.id)"
            >
              <img :src="recipe.image" :alt="recipe.title" class="recipe-img" />
              <div>
                <h3 class="h6 mb-1">{{ recipe.title }}</h3>
                <p class="mb-0 text-muted small">Uses: {{ recipe.ingredients }}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { auth } from '../firebaseConfig.js'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(true)
const recipes = ref([])
const userId = ref(null)

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

async function loadRecipes() {
  loading.value = true

  const res = await fetch(`https://getproducts-moat6vqvca-uc.a.run.app?userId=${userId.value}`)
  const data = await res.json()
  const ingredients = (data.products || []).map((p) => p.name).join(',')

  if (!ingredients) {
    loading.value = false
    return
  }

  const spoonacularRes = await fetch(
    `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredients}&number=5&apiKey=${import.meta.env.VITE_SPOONACULAR_KEY}`
  )
  const spoonacularData = await spoonacularRes.json()

  recipes.value = spoonacularData.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    image: recipe.image,
    ingredients: recipe.usedIngredients.map((i) => i.name).join(', ')
  }))

  loading.value = false
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
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.pp-hover:hover {
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.recipe-img {
  width: 72px;
  height: 72px;
  border-radius: 0.65rem;
  object-fit: cover;
}

@media (max-width: 767px) {
  .pp-sidebar {
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }
}
</style>
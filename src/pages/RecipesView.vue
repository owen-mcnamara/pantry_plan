<template>
  <div class="container-fluid pp-shell">
    <div class="row g-0">
      <!-- Sidebar -->
      <aside class="col-12 col-md-3 col-xl-2 pp-sidebar">
        <div class="pp-logo">PantryPlan</div>
        <nav class="d-flex flex-column gap-1">
          <a href="/dashboard" class="pp-nav-link">Dashboard</a>
          <a href="/recipes" class="pp-nav-link active">Recipes</a>
          <a href="/history" class="pp-nav-link">History</a>
          <a href="/settings" class="pp-nav-link">Settings</a>
          <button class="btn btn-outline-danger btn-sm mt-3 text-start" @click="logout">Logout</button>
        </nav>
      </aside>

      <!-- Main -->
      <main class="col-12 col-md-9 col-xl-10 p-4">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h1 class="h3 mb-0">Recipe Suggestions</h1>
        </div>
        <p class="text-muted mb-4">Fresh ideas based on your pantry items.</p>

        <p v-if="loading" class="text-muted">Loading...</p>

        <div v-else>
          <div v-if="recipes.length === 0" class="pp-card p-4 text-muted">
            No recipes found. Add some items to your pantry first.
          </div>

          <TransitionGroup v-else name="fade-slide" tag="div" class="row g-3">
            <div class="col-12 col-lg-6" v-for="recipe in recipes" :key="recipe.id">
              <div class="pp-card pp-hover p-3 h-100 d-flex gap-3 align-items-start" role="button" @click="viewRecipe(recipe.id)">
                <img :src="recipe.image" :alt="recipe.title" class="rounded" style="width: 96px; height: 96px; object-fit: cover;" />
                <div>
                  <h3 class="h6 mb-1">{{ recipe.title }}</h3>
                  <p class="mb-0 text-muted">
                    Uses: {{ recipe.ingredients || 'No matched ingredients listed' }}
                  </p>
                </div>
              </div>
            </div>
          </TransitionGroup>
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
  onAuthStateChanged(auth, async (user) => {
    if (!user) return router.push('/login')
    userId.value = user.uid
    await loadRecipes()
  })
})

async function loadRecipes() {
  loading.value = true

  try {
    // 1) Get active pantry products
    const pantryRes = await fetch(`https://getproducts-moat6vqvca-uc.a.run.app?userId=${userId.value}`)
    const pantryData = await pantryRes.json()
    const products = pantryData.products || []

    const ingredients = products.map((p) => p.name).filter(Boolean).join(',')

    if (!ingredients) {
      recipes.value = []
      return
    }

    // 2) Spoonacular call
    const spoonacularRes = await fetch(
      `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${encodeURIComponent(ingredients)}&number=8&apiKey=${import.meta.env.VITE_SPOONACULAR_KEY}`
    )
    const spoonacularData = await spoonacularRes.json()

    recipes.value = (spoonacularData || []).map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      image: recipe.image,
      ingredients: (recipe.usedIngredients || []).map((i) => i.name).join(', ')
    }))
  } catch (error) {
    console.error('loadRecipes error:', error)
    recipes.value = []
  } finally {
    loading.value = false
  }
}

function viewRecipe(id) {
  router.push(`/recipes/${id}`)
}

async function logout() {
  await signOut(auth)
  router.push('/login')
}
</script>
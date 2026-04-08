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
        <button class="btn btn-link ps-0 mb-3" @click="router.push('/recipes')">← Back to Recipes</button>

        <div v-if="loading" class="text-muted">Loading...</div>

        <div v-else class="pp-card p-4">
          <img :src="recipe.image" :alt="recipe.title" class="recipe-img mb-3" />
          <h1 class="h3">{{ recipe.title }}</h1>
          <p class="text-muted mb-4">Ready in {{ recipe.readyInMinutes }} minutes</p>

          <div class="mb-4">
            <h2 class="h5 border-bottom pb-2">Ingredients</h2>
            <ul class="list-unstyled mb-0">
              <li v-for="ingredient in recipe.extendedIngredients" :key="ingredient.id" class="py-2 border-bottom text-secondary">
                {{ ingredient.original }}
              </li>
            </ul>
          </div>

          <div>
            <h2 class="h5 border-bottom pb-2">Instructions</h2>
            <p class="instruction-text mb-0">{{ sanitizedInstructions }}</p>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { auth } from '../firebaseConfig.js'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const recipe = ref(null)
const loading = ref(true)

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      fetchRecipe()
    } else {
      router.push('/login')
    }
  })
})

const sanitizedInstructions = computed(() => {
  const html = recipe.value?.instructions || ''
  const stripped = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return stripped || 'No instructions provided for this recipe.'
})

async function fetchRecipe() {
  try {
    if (!auth.currentUser) {
      throw new Error('Not authenticated')
    }

    const token = await auth.currentUser.getIdToken(true)
    
    const res = await fetch(
      `https://getrecipedetails-moat6vqvca-uc.a.run.app?id=${route.params.id}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    const data = await res.json()
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to load recipe')
    }
    
    recipe.value = data.recipe
  } catch (error) {
    console.error('Failed to fetch recipe:', error)
    recipe.value = { 
      title: 'Error loading recipe', 
      instructions: error.message,
      extendedIngredients: [],
      readyInMinutes: 0,
      image: ''
    }
  } finally {
    loading.value = false
  }
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

.recipe-img {
  width: 100%;
  max-height: 400px;
  object-fit: cover;
  border-radius: 0.75rem;
}

.instruction-text {
  white-space: pre-line;
  line-height: 1.6;
  color: #334155;
}

@media (max-width: 767px) {
  .pp-sidebar {
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }
}
</style>

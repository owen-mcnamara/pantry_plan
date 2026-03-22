<template>
  <div class="container">
    <aside class="sidebar">
      <h2 class="logo">PantryPlan</h2>
      <nav>
        <a href="/dashboard">Dashboard</a>
        <a href="/recipes" class="active">Recipes</a>
        <a href="/settings">Settings</a>
        <button class="logout-btn" @click="logout">Logout</button>
      </nav>
    </aside>

    <main class="main">
      <button class="back-btn" @click="router.push('/recipes')">← Back to Recipes</button>

      <div v-if="loading">Loading...</div>

      <div v-else class="recipe-detail">
        <img :src="recipe.image" :alt="recipe.title" class="recipe-img" />
        <h1>{{ recipe.title }}</h1>
        <p class="ready-time">⏱ Ready in {{ recipe.readyInMinutes }} minutes</p>

        <div class="section">
          <h2>Ingredients</h2>
          <ul>
            <li v-for="ingredient in recipe.extendedIngredients" :key="ingredient.id">
              {{ ingredient.original }}
            </li>
          </ul>
        </div>

        <div class="section">
          <h2>Instructions</h2>
          <div v-html="recipe.instructions"></div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { auth } from '../firebaseConfig.js';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
const recipe = ref(null);
const loading = ref(true);

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      fetchRecipe();
    } else {
      router.push('/login');
    }
  });
});

async function fetchRecipe() {
  const res = await fetch(
    `https://api.spoonacular.com/recipes/${route.params.id}/information?apiKey=${import.meta.env.VITE_SPOONACULAR_KEY}`
  );
  recipe.value = await res.json();
  loading.value = false;
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

.container {
    display: flex;
}

.sidebar {
    width: 250px;
    background: white;
    height: 100vh;
    padding: 25px;
    border-right: 1px solid #e0e0e0;
    position: sticky;
    top: 0;
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
    background: #edf2f7;
    min-height: 100vh;
}

.back-btn {
    background: none;
    border: none;
    color: #2c7a7b;
    font-size: 16px;
    cursor: pointer;
    margin-bottom: 20px;
    padding: 0;
}

.back-btn:hover {
    text-decoration: underline;
}

.recipe-detail {
    background: white;
    border-radius: 16px;
    padding: 30px;
}

.recipe-img {
    width: 100%;
    max-height: 400px;
    object-fit: cover;
    border-radius: 12px;
    margin-bottom: 20px;
}

h1 {
    font-size: 28px;
    color: #2d3748;
    margin-bottom: 10px;
}

.ready-time {
    color: #718096;
    margin-bottom: 25px;
    font-size: 15px;
}

.section {
    margin-top: 25px;
}

.section h2 {
    font-size: 20px;
    color: #2d3748;
    margin-bottom: 15px;
    border-bottom: 2px solid #edf2f7;
    padding-bottom: 8px;
}

.section ul {
    list-style: none;
    padding: 0;
}

.section ul li {
    padding: 8px 0;
    border-bottom: 1px solid #f7fafc;
    color: #4a5568;
    font-size: 15px;
}

.section p {
    color: #4a5568;
    line-height: 1.8;
    font-size: 15px;
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
</style>
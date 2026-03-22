<template>
    <div class="container">
        <!-- Sidebar -->
        <aside class="sidebar">
            <h2 class="logo">🍎 PantryPlan</h2>
            <nav>
                <a href="/dashboard">🏠 Dashboard</a>
                <a href="/recipes" class="active">🍜 Recipes</a>
                <a href="/settings">⚙️ Settings</a>
                <button class="logout-btn" @click="logout">🚪 Logout</button>
            </nav>
        </aside>

        <!-- Main Content -->
        <main class="main">
            <div class="top-bar">
                <h1>Recipe Suggestions</h1>
            </div>

            <p class="sub">Fresh ideas based on your pantry items.</p>

            <p v-if="loading">Loading...</p>

            <div class="recipes" v-else>
                <div v-if="recipes.length === 0" class="empty-state">
                    <p>No recipes found. Add some items to your pantry first!</p>
                </div>
                <div class="recipe-card" v-for="recipe in recipes" :key="recipe.id" @click="viewRecipe(recipe.id)">
                    <img :src="recipe.image" :alt="recipe.title" class="recipe-img" />
                    <div>
                        <h3>{{ recipe.title }}</h3>
                        <p>Uses: {{ recipe.ingredients }}</p>
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
const loading = ref(true);
const recipes = ref([]);

const userId = ref(null);

onMounted(() => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            userId.value = user.uid;
            loadRecipes();
        } else {
            router.push('/login');
        }
    });
});

async function loadRecipes() {
    loading.value = true;

    // First get the user's pantry items
    const res = await fetch(
        `https://getproducts-moat6vqvca-uc.a.run.app?userId=${userId.value}`
    );
    const data = await res.json();

    // Extract ingredient names from pantry
    const ingredients = data.products.map(p => p.name).join(',');

    if (!ingredients) {
        loading.value = false;
        return;
    }

    // Fetch recipes from Spoonacular
    const spoonacularRes = await fetch(
        `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredients}&number=5&apiKey=${import.meta.env.VITE_SPOONACULAR_KEY}`
    );
    const spoonacularData = await spoonacularRes.json();

    recipes.value = spoonacularData.map(recipe => ({
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        ingredients: recipe.usedIngredients.map(i => i.name).join(', ')
    }));

    loading.value = false;
}

async function logout() {
    await signOut(auth);
    router.push('/login');
}

function viewRecipe(id) {
    router.push(`/recipes/${id}`);
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

.top-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.sub {
    margin-top: 10px;
    color: #718096;
    margin-bottom: 20px;
}

.recipes {
    margin-top: 20px;
}

.recipe-card {
    display: flex;
    align-items: center;
    gap: 20px;
}

.recipe-img {
    width: 100px;
    height: 100px;
    border-radius: 10px;
    object-fit: cover;
}

.recipe-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.recipe-card h3 {
    font-size: 18px;
    margin-bottom: 8px;
    color: #2d3748;
}

.recipe-card p {
    font-size: 14px;
    color: #777;
}

.empty-state {
    text-align: center;
    padding: 40px;
    color: #94a3b8;
    background: white;
    border-radius: 12px;
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
import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../pages/LoginView.vue'
import RegisterView from '../pages/RegisterView.vue'
import DashboardView from '../pages/DashboardView.vue'
import RecipesView from '../pages/RecipesView.vue'
import SettingsView from '../pages/SettingsView.vue'
import RecipeDetailView from '../pages/RecipeDetailView.vue'
import HistoryView from '../pages/HistoryView.vue'
import { auth } from '../firebaseConfig.js'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: LoginView },
  { path: '/register', component: RegisterView },
  { path: '/dashboard', component: DashboardView, meta: { requiresAuth: true }},
  { path: '/recipes', component: RecipesView, meta: { requiresAuth: true }},
  { path: '/settings', component: SettingsView, meta: { requiresAuth: true }},
  { path: '/recipes/:id', component: RecipeDetailView, meta: { requiresAuth: true }},
  { path: '/history', component: HistoryView, meta: { requiresAuth: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const requiresAuth = to.meta.requiresAuth;

  if (!requiresAuth) {
    next();
    return;
  }

  auth.onAuthStateChanged((user) => {
    if (user) {
      next();
    } else {
      next('/login');
    }
  });
})

export default router
<template>
  <div class="container-fluid pp-shell">
    <div class="row g-0">
      <aside class="col-12 col-md-3 col-xl-2 pp-sidebar p-3 p-md-4">
        <div class="pp-logo mb-3">PantryPlan</div>
        <nav class="d-flex flex-column gap-1">
          <a href="/dashboard" class="pp-nav-link">Dashboard</a>
          <a href="/recipes" class="pp-nav-link">Recipes</a>
          <a href="/history" class="pp-nav-link">History</a>
          <a href="/settings" class="pp-nav-link active">Settings</a>
          <button class="btn btn-outline-danger btn-sm mt-3 text-start" @click="logout">Logout</button>
        </nav>
      </aside>

      <main class="col-12 col-md-9 col-xl-10 p-3 p-md-4">
        <h1 class="h3 mb-4">Settings</h1>

        <div class="pp-card p-4 mb-3">
          <h2 class="h5 mb-2">Account Details</h2>
          <p class="text-muted mb-1 small">Email</p>
          <p class="mb-0">{{ userEmail }}</p>
        </div>

        <div class="pp-card p-4 mb-3">
          <h2 class="h5 mb-3">Change Password</h2>
          <form @submit.prevent="changePassword">
            <div class="mb-3">
              <label class="form-label">New Password</label>
              <input class="form-control" type="password" v-model="newPassword" required />
            </div>
            <div class="mb-3">
              <label class="form-label">Confirm Password</label>
              <input class="form-control" type="password" v-model="confirmPassword" required />
            </div>
            <button type="submit" class="btn btn-primary">Update Password</button>
          </form>
        </div>

        <div class="pp-card p-4 border border-danger-subtle">
          <h2 class="h5 text-danger mb-2">Danger Zone</h2>
          <p class="text-muted">Permanently delete your account and all your data.</p>
          <button class="btn btn-danger" @click="deleteAccount">Delete Account</button>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { auth } from '../firebaseConfig.js'
import { signOut, onAuthStateChanged, updatePassword, deleteUser } from 'firebase/auth'
import { useRouter } from 'vue-router'

const router = useRouter()
const userEmail = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      userEmail.value = user.email
    } else {
      router.push('/login')
    }
  })
})

async function changePassword() {
  if (newPassword.value !== confirmPassword.value) {
    alert('Passwords do not match!')
    return
  }

  try {
    await updatePassword(auth.currentUser, newPassword.value)
    alert('Password updated successfully!')
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (error) {
    alert('Error: ' + error.message)
  }
}

async function deleteAccount() {
  if (!confirm('Are you sure? This cannot be undone.')) return

  try {
    await deleteUser(auth.currentUser)
    router.push('/login')
  } catch (error) {
    alert('Error: ' + error.message)
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

@media (max-width: 767px) {
  .pp-sidebar {
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }
}
</style>
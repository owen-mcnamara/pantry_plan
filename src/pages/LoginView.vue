<template>
  <div class="auth-shell">
    <div class="auth-card">
      <h1 class="h3 mb-3 text-center">Login</h1>

      <div v-if="errorMessage" class="alert alert-danger" role="alert">
        {{ errorMessage }}
      </div>
      <div v-if="successMessage" class="alert alert-success" role="alert">
        {{ successMessage }}
      </div>

      <form @submit.prevent="loginUser" class="d-flex flex-column gap-3">
        <input
          v-model.trim="email"
          type="email"
          class="form-control"
          placeholder="Email"
          required
        />
        <input
          v-model="password"
          type="password"
          class="form-control"
          placeholder="Password"
          required
        />
        <button type="submit" class="btn btn-success" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          Login
        </button>
      </form>

      <p class="switch-auth mt-3 mb-2">
        Don't have an account?
        <button @click="switchToRegister" type="button">Register here</button>
      </p>
      <p class="switch-auth mb-0">
        <button @click="forgotPassword" type="button" :disabled="loading">Forgot password?</button>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { auth } from '../firebaseConfig.js'
import { useRouter } from 'vue-router'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function loginUser() {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await signInWithEmailAndPassword(auth, email.value, password.value)
    router.push('/dashboard')
  } catch (error) {
    errorMessage.value = toFriendlyAuthMessage(error)
  } finally {
    loading.value = false
  }
}

function switchToRegister() {
  router.push('/register')
}

async function forgotPassword() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!email.value) {
    errorMessage.value = 'Please enter your email address first.'
    return
  }

  loading.value = true

  try {
    await sendPasswordResetEmail(auth, email.value)
    successMessage.value = 'Password reset email sent! Check your inbox.'
  } catch (error) {
    errorMessage.value = toFriendlyAuthMessage(error)
  } finally {
    loading.value = false
  }
}

function toFriendlyAuthMessage(error) {
  const code = error?.code || ''

  if (code.includes('wrong-password') || code.includes('invalid-credential')) {
    return 'Incorrect email or password. Please try again.'
  }

  if (code.includes('user-not-found')) {
    return 'No account found with that email.'
  }

  if (code.includes('too-many-requests')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }

  if (code.includes('invalid-email')) {
    return 'Please enter a valid email address.'
  }

  return error?.message || 'Something went wrong. Please try again.'
}
</script>

<style scoped>
.auth-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #f8fafc;
  padding: 1rem;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 0.9rem;
  padding: 1.5rem;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.switch-auth {
  text-align: center;
  font-size: 0.95rem;
  color: #475569;
}

.switch-auth button {
  background: none;
  border: none;
  color: #198754;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
}

.switch-auth button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
<template>
  <div class="auth-shell">
    <div class="auth-card">
      <h1 class="h3 mb-3 text-center">Register</h1>

      <div v-if="errorMessage" class="alert alert-danger" role="alert">
        {{ errorMessage }}
      </div>

      <form @submit.prevent="registerUser" class="d-flex flex-column gap-3">
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
          Register
        </button>
      </form>

      <p class="switch-auth mt-3 mb-0">
        Already have an account?
        <button @click="switchToLogin" type="button">Login here</button>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { auth } from '../firebaseConfig.js'
import { useRouter } from 'vue-router'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

const router = useRouter()
const db = getFirestore()
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

async function registerUser() {
  loading.value = true
  errorMessage.value = ''

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value)
    const user = userCredential.user

    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      id: user.uid,
      role: 'user',
      createdAt: new Date().toISOString()
    })

    router.push('/login')
  } catch (error) {
    errorMessage.value = toFriendlyAuthMessage(error)
  } finally {
    loading.value = false
  }
}

function switchToLogin() {
  router.push('/login')
}

function toFriendlyAuthMessage(error) {
  const code = error?.code || ''

  if (code.includes('email-already-in-use')) {
    return 'An account with that email already exists.'
  }
  if (code.includes('invalid-email')) {
    return 'Please enter a valid email address.'
  }
  if (code.includes('weak-password')) {
    return 'Password should be at least 6 characters.'
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

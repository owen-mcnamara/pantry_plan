<template>
  <div class="auth-container">
    <h1>Login</h1>
    
    <form @submit.prevent="loginUser">
      <input 
        id="email" 
        type="email" 
        placeholder="Email" 
        required 
      />
      <input 
        id="password" 
        type="password" 
        placeholder="Password" 
        required 
      />
      <button type="submit">Login</button>
    </form>

    <p class="switch-auth">
      Don't have an account? 
      <button @click="switchToRegister" type="button">Register here</button>
    </p>
    <p class="switch-auth">
      <button @click="forgotPassword" type="button">Forgot password?</button>
    </p>
  </div>
</template>

<script setup>
import { auth } from '../firebaseConfig.js';
import { useRouter } from 'vue-router';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

const router = useRouter();

async function loginUser() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    router.push('/dashboard');
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

function switchToRegister() {
  router.push('/register');
}

async function forgotPassword() {
  const email = document.getElementById('email').value;
  
  if (!email) {
    alert('Please enter your email address first.');
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    alert('Password reset email sent! Check your inbox.');
  } catch (error) {
    alert('Error: ' + error.message);
  }
}
</script>

<style scoped>
.auth-container {
  max-width: 400px;
  margin: 50px auto;
  padding: 20px;
}

form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

input {
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button[type="submit"] {
  padding: 12px;
  font-size: 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button[type="submit"]:hover {
  background-color: #45a049;
}

.switch-auth {
  margin-top: 20px;
  text-align: center;
}

.switch-auth button {
  background: none;
  border: none;
  color: #4CAF50;
  text-decoration: underline;
  cursor: pointer;
  font-size: 14px;
}
</style>
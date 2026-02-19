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
  </div>
</template>

<script setup>
import { auth } from '../firebaseConfig.js';
import { signInWithEmailAndPassword } from 'firebase/auth';

// Emit event to parent component to switch views
const emit = defineEmits(['switchView']);

async function loginUser() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert('Login successful!');
    // TODO: Redirect to dashboard
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

function switchToRegister() {
  emit('switchView', 'register');
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
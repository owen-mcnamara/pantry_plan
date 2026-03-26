<template>
  <div class="container">
    <!-- Sidebar -->
    <aside class="sidebar">
      <h2 class="logo">PantryPlan</h2>
      <nav>
        <a href="/dashboard" class="pp-nav-link active">Dashboard</a>
        <a href="/recipes" class="pp-nav-link">Recipes</a>
        <a href="/history" class="pp-nav-link">History</a>
        <a href="/settings" class="pp-nav-link">Settings</a>
        <button class="btn btn-outline-danger btn-sm mt-3 text-start" @click="logout">Logout</button>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="main">
      <div class="top-bar">
        <h1>Settings</h1>
      </div>

      <div class="settings-card">
        <h3>Account Details</h3>
        <p class="label">Email</p>
        <p class="value">{{ userEmail }}</p>
      </div>

      <div class="settings-card">
        <h3>Change Password</h3>
        <form @submit.prevent="changePassword">
          <div class="form-group">
            <label>New Password:</label>
            <input type="password" v-model="newPassword" required />
          </div>
          <div class="form-group">
            <label>Confirm Password:</label>
            <input type="password" v-model="confirmPassword" required />
          </div>
          <button type="submit" class="submit-btn">Update Password</button>
        </form>
      </div>

      <div class="settings-card danger-zone">
        <h3>Danger Zone</h3>
        <p>Permanently delete your account and all your data.</p>
        <button class="delete-btn" @click="deleteAccount">Delete Account</button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { auth } from '../firebaseConfig.js';
import { signOut, onAuthStateChanged, updatePassword, deleteUser } from 'firebase/auth';
import { useRouter } from 'vue-router';

const router = useRouter();
const userEmail = ref('');
const newPassword = ref('');
const confirmPassword = ref('');

onMounted(() => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      userEmail.value = user.email;
    } else {
      router.push('/login');
    }
  });
});

async function changePassword() {
  if (newPassword.value !== confirmPassword.value) {
    alert('Passwords do not match!');
    return;
  }

  try {
    await updatePassword(auth.currentUser, newPassword.value);
    alert('Password updated successfully!');
    newPassword.value = '';
    confirmPassword.value = '';
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function deleteAccount() {
  if (!confirm('Are you sure? This cannot be undone.')) return;

  try {
    await deleteUser(auth.currentUser);
    router.push('/login');
  } catch (error) {
    alert('Error: ' + error.message);
  }
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
    margin-bottom: 30px;
}

.settings-card {
    background: white;
    padding: 25px;
    border-radius: 12px;
    margin-bottom: 20px;
}

.settings-card h3 {
    font-size: 18px;
    margin-bottom: 15px;
    color: #2d3748;
}

.label {
    font-size: 13px;
    color: #718096;
    margin-bottom: 4px;
}

.value {
    font-size: 16px;
    color: #2d3748;
    font-weight: 500;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #4a5568;
    font-size: 14px;
}

.form-group input {
    width: 100%;
    padding: 12px 15px;
    border: 2px solid #e2e8f0;
    border-radius: 10px;
    font-size: 15px;
    background: #f8fafc;
}

.form-group input:focus {
    outline: none;
    border-color: #2f855a;
    background: white;
}

.submit-btn {
    background: #2f855a;
    color: white;
    padding: 12px 20px;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 600;
}

.submit-btn:hover {
    background: #276749;
}

.danger-zone {
    border: 2px solid #fed7d7;
}

.danger-zone h3 {
    color: #e53e3e;
}

.danger-zone p {
    color: #718096;
    margin-bottom: 15px;
    font-size: 14px;
}

.delete-btn {
    background: #e53e3e;
    color: white;
    padding: 12px 20px;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 600;
}

.delete-btn:hover {
    background: #c53030;
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
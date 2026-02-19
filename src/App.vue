<script setup>
import { ref } from 'vue';
import LoginView from './pages/LoginView.vue';
import RegisterView from './pages/RegisterView.vue';

// Track which view to show: 'login' or 'register'
const currentView = ref('login');

// Function to switch between views
function switchView(viewName) {
  currentView.value = viewName;
}
</script>

<template>
  <div id="app">
    <!-- Show LoginView or RegisterView based on currentView -->
    <LoginView v-if="currentView === 'login'" @switchView="switchView" />
    <RegisterView v-if="currentView === 'register'" @switchView="switchView" />
  </div>
</template>

<style scoped>
#app {
  font-family: Arial, sans-serif;
  min-height: 100vh;
  background-color: #f5f5f5;
}
</style>
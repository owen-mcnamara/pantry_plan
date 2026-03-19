<script setup>
import { ref } from 'vue';
import LoginView from './pages/LoginView.vue';
import RegisterView from './pages/RegisterView.vue';
import DashboardView from './pages/DashboardView.vue';

const currentView = ref('login');
const loggedInUserId = ref(null);

function switchView(viewName, userId = null) {
  currentView.value = viewName;
  if (userId) loggedInUserId.value = userId;
}
</script>

<template>
  <div id="app">
    <LoginView v-if="currentView === 'login'" @switchView="switchView" />
    <RegisterView v-if="currentView === 'register'" @switchView="switchView" />
    <DashboardView v-if="currentView === 'dashboard'" :userId="loggedInUserId" />
  </div>
</template>

<style scoped>
#app {
  font-family: Arial, sans-serif;
  min-height: 100vh;
  background-color: #f5f5f5;
}
</style>
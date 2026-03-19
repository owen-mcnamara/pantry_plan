<template>
  <div class="dashboard">
    <h1>My Pantry</h1>
    <p v-if="loading">Loading...</p>
    <ul v-else>
      <li v-for="product in products" :key="product.id">
        {{ product.name }} - expires {{ product.expiryDate }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const products = ref([]);
const loading = ref(true);

const props = defineProps(['userId']);

onMounted(async () => {
  const res = await fetch(
    `https://getproducts-moat6vqvca-uc.a.run.app?userId=${props.userId}`
  );
  const data = await res.json();
  products.value = data.products;
  loading.value = false;
});
</script>
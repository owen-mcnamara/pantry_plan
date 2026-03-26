import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Bootstrap
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'bootstrap'

// Global styles
import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'

createApp(App).use(router).mount('#app')
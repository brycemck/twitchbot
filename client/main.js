import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import VueCookies from 'vue3-cookies'


import './assets/main.css'

const app = createApp(App)

app.use(router)
app.use(VueCookies)

app.mount('#app')

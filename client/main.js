
import App from './App.vue'
// import router from './router'
import VueCookies from 'vue3-cookies'
import { createSSRApp } from 'vue'
import { createRouter } from './router'
import './styles/base.scss';

// import './assets/main.css'

export function createApp() {
    const app = createSSRApp(App)
    app.use(VueCookies)
    const router = createRouter()
    app.use(router)
    return { app, router }
}
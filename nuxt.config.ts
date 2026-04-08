// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@vueuse/nuxt'],

  css: [
    '~/assets/css/main.css'
  ],

  app: {
    head: {
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600&family=Spectral:ital,wght@0,300;0,500;1,300&display=swap'
        }
      ],
      viewport: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover",
      title: "AI apartments",
    }
  },

  runtimeConfig: {
    public: {
      apartmentsBaseAddress: process.env.NUXT_PUBLIC_APARTMENTS_BASE_ADDRESS || 'https://laraue.com/api/real_estate'
    },
  },

  modules: ['@nuxtjs/i18n']
})
/// <reference types="vite/client" />

interface ImportMetaEnv {
    // Firebase Configuration
    readonly VITE_FIREBASE_API_KEY: string
    readonly VITE_FIREBASE_AUTH_DOMAIN: string
    readonly VITE_FIREBASE_DATABASE_URL: string
    readonly VITE_FIREBASE_PROJECT_ID: string
    readonly VITE_FIREBASE_STORAGE_BUCKET: string
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
    readonly VITE_FIREBASE_APP_ID: string

    // PMS API Configuration (API key is server-side only)
    readonly VITE_PMS_API_URL: string
    readonly VITE_PMS_HOTEL_ID: string
    readonly VITE_PMS_REFRESH_INTERVAL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

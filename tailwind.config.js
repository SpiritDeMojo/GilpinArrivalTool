/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
        "!./node_modules/**",
    ],
    darkMode: ['selector', '[data-theme="dark"]'],
    theme: {
        extend: {
            colors: {
                gilpin: {
                    DEFAULT: '#c5a065',
                    light: '#d4b078',
                    dark: '#a8864d',
                },
            },
            zIndex: {
                sticky: '500',
            },
        },
    },
    plugins: [],
}

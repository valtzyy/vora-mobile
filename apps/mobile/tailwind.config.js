/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        vora: {
          dark: '#191919',
          black: '#141417',
          green: '#10b981',
          cream: '#fef4e2',
        }
      },
      fontFamily: {
        sans: ['Inter_400Regular', 'sans-serif'],
        sansMedium: ['Inter_500Medium', 'sans-serif'],
        sansBold: ['Inter_700Bold', 'sans-serif'],
        serif: ['Georgia', 'serif'], // Fallback for P22 Mackinac
      }
    },
  },
  plugins: [],
}

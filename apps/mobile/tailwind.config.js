/** @type {import('tailwindcss').Config} */

// Design tokens mirrored from the web app (vora-frontend/src/app/globals.css).
//
// The web app's visual identity is a WARM palette: Tailwind's `stone` scale for
// neutrals (#fafaf9 warm-bone, #e7e5e4 stone-mist, #79716b bark-grey, #292524
// charcoal) plus an olive/moss green accent (#616c39 forest-moss, #4e572c
// deep-moss). Mobile was built on Tailwind's COOL defaults instead — `slate`
// neutrals and `emerald` greens — which is why the two apps never looked
// related despite sharing a component vocabulary.
//
// Rather than rewrite hundreds of className strings across every screen (a huge
// diff with no behavioural upside and plenty of room for typos), the cool
// palette names are remapped here to their warm counterparts. `slate-500` now
// resolves to bark-grey, `emerald-600` to forest-moss, and so on — so existing
// screens pick up the web palette without being touched. Prefer the `stone-*`
// and `moss-*` names in NEW code; the slate/gray/emerald/green names are kept
// purely so the existing screens keep working.
const stone = {
  50: '#fafaf9',  // warm-bone — page background
  100: '#f5f5f4',
  200: '#e7e5e4', // stone-mist — borders
  300: '#d6d3d1',
  400: '#a8a29e',
  500: '#78716c', // bark-grey — secondary text
  600: '#57534e',
  650: '#4d4844',
  700: '#44403c',
  750: '#36322e',
  800: '#292524', // charcoal — primary text
  850: '#221e1d',
  900: '#1c1917',
  950: '#0c0a09', // obsidian
};

const moss = {
  50: '#f6f7f1',
  100: '#e9ecdf',
  200: '#d4dabf',
  300: '#b7c096',
  400: '#9aa673',
  500: '#7d8b52',
  600: '#616c39', // forest-moss — primary accent
  700: '#4e572c', // deep-moss
  800: '#3d4423',
  850: '#343a1e',
  900: '#2b301a',
  950: '#171a0e',
};

module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        stone,
        moss,
        // Compatibility aliases — see the note above.
        slate: stone,
        gray: stone,
        emerald: moss,
        green: moss,

        // Semantic tokens, named exactly as the web app names them.
        'warm-bone': '#fafaf9',
        'paper-white': '#ffffff',
        'stone-mist': '#e7e5e4',
        'bark-grey': '#79716b',
        charcoal: '#292524',
        obsidian: '#0c0a09',
        pebble: '#a6a09b',
        'forest-moss': '#616c39',
        'deep-moss': '#4e572c',
        terracotta: '#d97757',
        'lichen-green': '#5ea500',
        'tide-teal': '#22b8cd',
        'alarm-red': '#ff0000',
        'sapphire-link': '#007ebb',

        // Warm-tuned status colours. The intermediate shades (650/750/850) are
        // non-standard in Tailwind but are referenced by existing screens,
        // where they silently resolved to no colour at all before this.
        red: {
          50: '#fdf3f0',
          100: '#fbe3dc',
          200: '#f5c6b8',
          300: '#eda48d',
          400: '#e28c6f',
          500: '#d97757', // terracotta
          600: '#c25f3f',
          650: '#b45536',
          700: '#a04a2e',
          750: '#8c4028',
          800: '#763524',
          850: '#5f2b1d',
          900: '#4d2418',
          950: '#2a120c',
        },
        amber: {
          50: '#fdf8ed',
          100: '#f9edd0',
          200: '#f2d9a1',
          300: '#e8bf6b',
          400: '#dda644',
          500: '#c98c2c',
          600: '#ab6f23',
          700: '#8a561f',
          800: '#70461f',
          850: '#5f3b1b',
          900: '#5c3a1c',
          950: '#331e0d',
        },

        vora: {
          dark: '#292524',   // charcoal — matches the web app's body text
          black: '#141417',  // web's primary button / card foreground
          green: '#616c39',  // forest-moss
          cream: '#fef4e2',  // web's card hero background
        },
      },
      fontFamily: {
        // Web pairs Geist (UI/body) with Lora (display serif); see
        // vora-frontend/src/app/layout.tsx.
        sans: ['Geist_400Regular', 'sans-serif'],
        sansMedium: ['Geist_500Medium', 'sans-serif'],
        sansBold: ['Geist_700Bold', 'sans-serif'],
        serif: ['Lora_400Regular', 'serif'],
        serifBold: ['Lora_600SemiBold', 'serif'],
      },
    },
  },
  plugins: [],
}

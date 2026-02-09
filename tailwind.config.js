/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{js,jsx}',
		'./components/**/*.{js,jsx}',
		'./app/**/*.{js,jsx}',
		'./src/**/*.{js,jsx}',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		extend: {
			colors: {
				// Deep dark mode base
				deep: {
					DEFAULT: '#070A12',
					50: '#0A0E1A',
					100: '#0D1220',
					200: '#111827',
				},
				// Glassmorphism colors
				glass: {
					light: 'rgba(255, 255, 255, 0.05)',
					medium: 'rgba(255, 255, 255, 0.08)',
					border: 'rgba(255, 255, 255, 0.12)',
					hover: 'rgba(255, 255, 255, 0.15)',
				},
				// Neon accent colors
				neon: {
					cyan: '#00F0FF',
					blue: '#0080FF',
					purple: '#8B5CF6',
					pink: '#EC4899',
				},
				// Original shadcn colors
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
			},
			backdropBlur: {
				xs: '2px',
				'3xl': '64px',
			},
			boxShadow: {
				'glow-sm': '0 0 10px rgba(0, 240, 255, 0.2)',
				'glow-md': '0 0 20px rgba(0, 240, 255, 0.3)',
				'glow-lg': '0 0 30px rgba(0, 240, 255, 0.4)',
				'glow-blue': '0 0 20px rgba(0, 128, 255, 0.3)',
				'glow-purple': '0 0 20px rgba(139, 92, 246, 0.3)',
				'float': '0 8px 32px rgba(0, 0, 0, 0.4)',
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' },
				},
				'fade-in': {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' },
				},
				'fade-out': {
					'0%': { opacity: '1' },
					'100%': { opacity: '0' },
				},
				'slide-in-from-top': {
					'0%': { transform: 'translateY(-10px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' },
				},
				'slide-in-from-bottom': {
					'0%': { transform: 'translateY(10px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' },
				},
				'slide-in-from-left': {
					'0%': { transform: 'translateX(-10px)', opacity: '0' },
					'100%': { transform: 'translateX(0)', opacity: '1' },
				},
				'slide-in-from-right': {
					'0%': { transform: 'translateX(10px)', opacity: '0' },
					'100%': { transform: 'translateX(0)', opacity: '1' },
				},
				'glow-pulse': {
					'0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)' },
					'50%': { opacity: '0.8', boxShadow: '0 0 30px rgba(0, 240, 255, 0.5)' },
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-5px)' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'fade-out': 'fade-out 0.3s ease-out',
				'slide-in-from-top': 'slide-in-from-top 0.3s ease-out',
				'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out',
				'slide-in-from-left': 'slide-in-from-left 0.3s ease-out',
				'slide-in-from-right': 'slide-in-from-right 0.3s ease-out',
				'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
				'float': 'float 3s ease-in-out infinite',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
};

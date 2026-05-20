/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		fontFamily: {
  			sans: [
  				'var(--font-inter)',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'system-ui',
  				'sans-serif'
  			],
  			display: [
  				'var(--font-inter)',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'system-ui',
  				'sans-serif'
  			],
  			text: [
  				'var(--font-inter)',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'system-ui',
  				'sans-serif'
  			],
  			apple: [
  				'var(--font-inter)',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'system-ui',
  				'sans-serif'
  			]
  		},
  		fontSize: {
  			xs: ['0.75rem', { lineHeight: '1.5' }],
  			sm: ['0.8125rem', { lineHeight: '1.5' }],
  			md: ['0.875rem', { lineHeight: '1.5' }],
  			base: ['0.9375rem', { lineHeight: '1.533' }],
  			lg: ['1.125rem', { lineHeight: '1.375', letterSpacing: '-0.025em' }],
  			xl: ['1.25rem', { lineHeight: '1.375', letterSpacing: '-0.025em' }],
  			'2xl': ['1.5rem', { lineHeight: '1.375', letterSpacing: '-0.015em' }],
  			'3xl': ['1.75rem', { lineHeight: '1.2', letterSpacing: '-0.015em' }],
  			'4xl': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.015em' }],
  			'5xl': ['3.25rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
  			hero: ['3.25rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }]
  		},
  		fontWeight: {
  			light: '300',
  			normal: '400',
  			medium: '500',
  			semibold: '600',
  			bold: '700'
  		},
  		colors: {
  			'primary-red': '#DC2626',
  			'accent-pink': '#EC4899',
  			coral: '#F97316',
  			background: 'hsl(var(--background))',
  			'background-secondary': '#2d1b3d',
  			'card-bg': 'rgba(255, 255, 255, 0.05)',
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		backdropBlur: {
  			xl: '20px',
  			'2xl': '40px'
  		},
  		backgroundImage: {
  			'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  			'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
  			'gradient-primary': 'linear-gradient(135deg, #DC2626 0%, #EC4899 100%)',
  			'gradient-secondary': 'linear-gradient(135deg, #EC4899 0%, #F97316 100%)',
  			'gradient-glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)'
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-in': 'fade-in 0.5s ease-out',
  			'slide-up': 'slide-up 0.3s ease-out',
  			'slide-down': 'slide-down 0.3s ease-out',
  			'scale-in': 'scale-in 0.2s ease-out',
  			'pulse-glow': 'pulse-glow 2s ease-in-out infinite'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'fade-in': {
  				'0%': {
  					opacity: '0'
  				},
  				'100%': {
  					opacity: '1'
  				}
  			},
  			'slide-up': {
  				'0%': {
  					transform: 'translateY(10px)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'translateY(0)',
  					opacity: '1'
  				}
  			},
  			'slide-down': {
  				'0%': {
  					transform: 'translateY(-10px)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'translateY(0)',
  					opacity: '1'
  				}
  			},
  			'scale-in': {
  				'0%': {
  					transform: 'scale(0.95)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'scale(1)',
  					opacity: '1'
  				}
  			},
  			'pulse-glow': {
  				'0%, 100%': {
  					boxShadow: '0 0 20px rgba(220, 38, 38, 0.3)'
  				},
  				'50%': {
  					boxShadow: '0 0 30px rgba(220, 38, 38, 0.6)'
  				}
  			}
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}


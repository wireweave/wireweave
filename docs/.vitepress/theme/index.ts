import DefaultTheme from 'vitepress/theme'
import { useRouter, type Theme } from 'vitepress'
import { onMounted, watch } from 'vue'
import HomeShowcase from './HomeShowcase.vue'
import './custom.css'

// GA4 tracking helper
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

function trackEvent(eventName: string, params?: Record<string, string | number | boolean>) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params)
  }
}

function trackPageView(path: string) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_location: window.location.href,
    })
  }
}

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('HomeShowcase', HomeShowcase)
  },
  setup() {
    const router = useRouter()

    onMounted(() => {
      // Track SPA route changes
      watch(
        () => router.route.path,
        (newPath) => {
          trackPageView(newPath)
        },
      )

      // Track code block copy events
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement

        // VitePress copy button in code blocks
        if (
          target.closest('.vp-code-group button') ||
          target.closest('button.copy') ||
          target.classList.contains('copy')
        ) {
          const codeBlock =
            target.closest('.vp-code-group') || target.closest('div[class*="language-"]')
          const language = codeBlock?.className.match(/language-(\w+)/)?.[1] || 'unknown'
          trackEvent('code_copy', { language })
        }

        // Track outbound link clicks
        const link = target.closest('a') as HTMLAnchorElement
        if (link && link.href) {
          const isExternal = link.hostname !== window.location.hostname
          if (isExternal) {
            trackEvent('outbound_click', {
              url: link.href,
              text: link.textContent?.trim() || '',
            })
          }
        }

        // Track CTA button clicks
        if (target.closest('.cta-button')) {
          const button = target.closest('.cta-button') as HTMLAnchorElement
          const isPrimary = button.classList.contains('primary')
          trackEvent('cta_click', {
            button_type: isPrimary ? 'primary' : 'secondary',
            destination: button.href || '',
            text: button.textContent?.trim() || '',
          })
        }

        // Track sidebar navigation
        if (target.closest('.VPSidebarItem')) {
          const item = target.closest('.VPSidebarItem') as HTMLElement
          const link = item.querySelector('a')
          if (link) {
            trackEvent('sidebar_click', {
              text: link.textContent?.trim() || '',
              href: link.getAttribute('href') || '',
            })
          }
        }
      })

      // Track search open/usage
      const searchButton = document.querySelector('.VPNavBarSearch button, .DocSearch-Button')
      if (searchButton) {
        searchButton.addEventListener('click', () => {
          trackEvent('search_open')
        })
      }

      // Track language switcher
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        const langSwitch = target.closest('.VPNavBarMenu .VPMenuLink')
        if (langSwitch) {
          const href = langSwitch.getAttribute('href')
          if (href && (href.startsWith('/ko') || href.startsWith('/ja') || href === '/')) {
            const lang = href.startsWith('/ko') ? 'ko' : href.startsWith('/ja') ? 'ja' : 'en'
            trackEvent('language_switch', { language: lang })
          }
        }
      })

      // Track scroll depth
      let maxScrollDepth = 0
      const trackScrollDepth = () => {
        const scrollTop = window.scrollY
        const docHeight = document.documentElement.scrollHeight - window.innerHeight
        const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0

        const milestones = [25, 50, 75, 100]
        for (const milestone of milestones) {
          if (scrollPercent >= milestone && maxScrollDepth < milestone) {
            maxScrollDepth = milestone
            trackEvent('scroll_depth', { depth: milestone })
          }
        }
      }

      // Reset scroll depth on route change
      watch(
        () => router.route.path,
        () => {
          maxScrollDepth = 0
        },
      )

      // Debounced scroll tracking
      let scrollTimeout: number
      window.addEventListener(
        'scroll',
        () => {
          clearTimeout(scrollTimeout)
          scrollTimeout = window.setTimeout(trackScrollDepth, 100)
        },
        { passive: true },
      )

      // Track TOC (table of contents) clicks
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        const tocLink = target.closest('.VPDocOutlineItem a')
        if (tocLink) {
          trackEvent('toc_click', {
            heading: tocLink.textContent?.trim() || '',
            href: tocLink.getAttribute('href') || '',
          })
        }
      })

      // Track hero action buttons (VitePress home page)
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        const heroAction = target.closest('.VPHero .action a, .VPButton')
        if (heroAction) {
          const button = heroAction as HTMLAnchorElement
          const isBrand =
            button.classList.contains('brand') || button.closest('.action')?.querySelector('.brand')
          trackEvent('hero_cta_click', {
            button_type: isBrand ? 'brand' : 'alt',
            destination: button.href || '',
            text: button.textContent?.trim() || '',
          })
        }
      })

      // Track feature card views (intersection observer)
      const featureCards = document.querySelectorAll('.VPFeature')
      if (featureCards.length > 0) {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const title = entry.target.querySelector('.title')?.textContent?.trim() || ''
                trackEvent('feature_view', { feature: title })
                observer.unobserve(entry.target)
              }
            })
          },
          { threshold: 0.5 },
        )

        featureCards.forEach((card) => observer.observe(card))
      }
    })
  },
} satisfies Theme

<script setup lang="ts">
const showcaseItems = [
  {
    label: 'Login Form',
    name: 'Simple authentication UI',
    image: '/examples/login-form.svg',
    code: `page "Login" centered {
  card w=360 p=6 shadow=lg {
    title "Sign In" level=2
    input "Email" inputType=email
    input "Password" inputType=password
    button "Sign In" primary w=full
    link "Forgot password?"
  }
}`,
  },
  {
    label: 'Social Media Feed',
    name: 'Instagram-like mobile layout',
    image: '/examples/instagram-feed.svg',
    code: `page device=mobile {
  header p=3 border {
    row justify=between {
      icon "instagram" size=lg
      row gap=3 {
        icon "heart"
        icon "message-circle"
      }
    }
  }
  main { ... }
  footer p=3 border { ... }
}`,
  },
  {
    label: 'Dashboard',
    name: 'Analytics admin panel',
    image: '/examples/dashboard.svg',
    code: `page "Dashboard" {
  header p=4 border { ... }
  row {
    sidebar w=200 p=4 {
      link "Dashboard"
      link "Analytics"
      link "Reports"
    }
    main p=4 gap=4 {
      row gap=4 {
        card p=4 { title "24,521" }
        card p=4 { title "$45,231" }
      }
    }
  }
}`,
  },
  {
    label: 'E-Commerce',
    name: 'Product detail page',
    image: '/examples/product-page.svg',
    code: `page "Product" {
  header p=4 border { ... }
  main p=6 {
    row gap=6 {
      placeholder "Image" w=400 h=400
      col gap=4 {
        title "Premium Headphones"
        title "$299.00" level=2
        button "Add to Cart" primary
      }
    }
  }
}`,
  },
]
</script>

<template>
  <div class="showcase-section">
    <h2 class="showcase-title">See It in Action</h2>
    <p class="showcase-subtitle">From simple code to beautiful wireframes in seconds</p>

    <div class="showcase-grid">
      <div v-for="item in showcaseItems" :key="item.label" class="showcase-item">
        <div class="showcase-preview">
          <img :src="item.image" :alt="item.label + ' Wireframe'" />
        </div>
        <div class="showcase-code">
          <div class="showcase-label">
            {{ item.label }}
          </div>
          <div class="showcase-name">
            {{ item.name }}
          </div>
          <pre><code>{{ item.code }}</code></pre>
        </div>
      </div>
    </div>
  </div>

  <div class="cta-section" data-track-section="showcase_cta">
    <h3 class="cta-title">Ready to create your own wireframes?</h3>
    <div class="cta-buttons">
      <a href="/guide/getting-started" class="cta-button primary" data-track-cta="docs_get_started"
        >Get Started</a
      >
      <a
        href="https://playground.wireweave.org"
        class="cta-button secondary"
        data-track-cta="docs_try_playground"
        >Try Playground</a
      >
    </div>
  </div>
</template>

import { Platform } from 'react-native';

// Web-specific optimizations for better mobile web experience
export const WebOptimizations = {
  // Detect if running on web
  isWeb: Platform.OS === 'web',
  
  // Web-specific performance optimizations
  enableWebOptimizations: () => {
    if (Platform.OS !== 'web') return;

    // Preload critical resources
    const preloadCriticalResources = () => {
      // Preload critical fonts
      const fontLinks = [
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
        'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap',
      ];

      fontLinks.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = href;
        document.head.appendChild(link);
      });
    };

    // Optimize images for web
    const optimizeImages = () => {
      // Add loading="lazy" to images
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        img.setAttribute('loading', 'lazy');
        img.setAttribute('decoding', 'async');
      });
    };

    // Enable service worker for caching
    const enableServiceWorker = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('Service Worker registered:', registration);
          })
          .catch(error => {
            console.log('Service Worker registration failed:', error);
          });
      }
    };

    // Optimize scroll performance
    const optimizeScrollPerformance = () => {
      // Add passive event listeners for better scroll performance
      const options = { passive: true };
      
      window.addEventListener('scroll', () => {
        // Throttle scroll events for better performance
      }, options);

      window.addEventListener('touchmove', () => {
        // Optimize touch events
      }, options);
    };

    // Initialize web optimizations
    preloadCriticalResources();
    optimizeImages();
    enableServiceWorker();
    optimizeScrollPerformance();
  },

  // Web-specific bundle splitting
  enableBundleSplitting: () => {
    if (Platform.OS !== 'web') return;

    // Dynamic imports for web-specific features
    const loadWebFeatures = async () => {
      try {
        // Load web-specific components only when needed
        const { WebOptimizedImage } = await import('@/components/WebOptimizedImage/WebOptimizedImage');
        const { WebShareAPI } = await import('@/lib/webShareAPI');
        
        return { WebOptimizedImage, WebShareAPI };
      } catch (error) {
        console.warn('Web features not available:', error);
        return null;
      }
    };

    return loadWebFeatures();
  },

  // Web-specific SEO optimizations
  enableSEOOptimizations: () => {
    if (Platform.OS !== 'web') return;

    // Add meta tags for better SEO
    const addMetaTags = () => {
      const metaTags = [
        { name: 'description', content: 'Sellar - Ghana\'s leading mobile marketplace for buying and selling' },
        { name: 'keywords', content: 'marketplace, ghana, mobile, buy, sell, classifieds' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' },
        { property: 'og:title', content: 'Sellar - Mobile Marketplace' },
        { property: 'og:description', content: 'Buy and sell anything in Ghana' },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ];

      metaTags.forEach(tag => {
        const meta = document.createElement('meta');
        Object.entries(tag).forEach(([key, value]) => {
          meta.setAttribute(key, value);
        });
        document.head.appendChild(meta);
      });
    };

    // Add structured data for better search visibility
    const addStructuredData = () => {
      const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "Sellar",
        "description": "Ghana's leading mobile marketplace",
        "url": window.location.origin,
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "iOS, Android, Web"
      };

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    };

    addMetaTags();
    addStructuredData();
  },

  // Web-specific performance monitoring
  enablePerformanceMonitoring: () => {
    if (Platform.OS !== 'web') return;

    // Monitor Core Web Vitals
    const monitorCoreWebVitals = () => {
      // Largest Contentful Paint (LCP)
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.startTime);
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay (FID)
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          if ('processingStart' in entry) {
            console.log('FID:', (entry as any).processingStart - entry.startTime);
          }
        });
      }).observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift (CLS)
      new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          if ('value' in entry) {
            console.log('CLS:', (entry as any).value);
          }
        });
      }).observe({ entryTypes: ['layout-shift'] });
    };

    monitorCoreWebVitals();
  },
};

// Initialize web optimizations
export const initializeWebOptimizations = () => {
  WebOptimizations.enableWebOptimizations();
  WebOptimizations.enableSEOOptimizations();
  WebOptimizations.enablePerformanceMonitoring();
};

// ISRIB Shop - Main JavaScript
// Modern ES6+ JavaScript for enhanced functionality

// DOM Content Loaded Event
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize all app functionality
function initializeApp() {
    initHeaderScroll();
    initSmoothScrolling();
    initFadeInAnimations();
    initProductInteractions();
    initCartFunctionality();
    initMobileOptimizations();
    initAnalytics();
    initContactForms();
    initPerformanceOptimizations();
}

// Header scroll effect with enhanced performance
function initHeaderScroll() {
    let ticking = false;
    
    function updateHeader() {
        const header = document.querySelector('.header');
        if (!header) return;
        
        const scrollY = window.pageYOffset;
        
        if (scrollY > 50) {
            header.style.background = 'rgba(255, 255, 255, 0.98)';
            header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
            header.style.backdropFilter = 'blur(20px)';
        } else {
            header.style.background = 'rgba(255, 255, 255, 0.95)';
            header.style.boxShadow = 'none';
            header.style.backdropFilter = 'blur(20px)';
        }
        ticking = false;
    }
    
    function onScroll() {
        if (!ticking) {
            requestAnimationFrame(updateHeader);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', onScroll, { passive: true });
}

// Smooth scrolling for anchor links
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Update URL without triggering scroll
                history.pushState(null, null, targetId);
            }
        });
    });
}

// Intersection Observer for fade-in animations
function initFadeInAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animateElements = document.querySelectorAll('.product-card, .trust-item, .faq-item, .about-text');
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
        observer.observe(el);
    });
}

// Enhanced product interactions
function initProductInteractions() {
    const productCards = document.querySelectorAll('.product-card');
    
    productCards.forEach(card => {
        // Enhanced hover effects
        card.addEventListener('mouseenter', function() {
            if (window.innerWidth > 1024) { // Only on desktop
                this.style.transform = 'translateY(-8px) scale(1.02)';
                this.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.2)';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            if (window.innerWidth > 1024) {
                this.style.transform = 'translateY(0) scale(1)';
                this.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
            }
        });
        
        // Product card click analytics
        card.addEventListener('click', function(e) {
            if (!e.target.closest('a')) {
                const productName = this.querySelector('.product-name').textContent;
                trackEvent('product_view', {
                    product_name: productName,
                    interaction_type: 'card_click'
                });
            }
        });
    });
}

// Cart functionality with local storage and animations
function initCartFunctionality() {
    let cart = getCartFromStorage();
    updateCartDisplay();
    
    // Add to cart buttons
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Don't prevent default for external links
            if (this.href && this.href.includes('isrib.shop')) {
                return; // Let it navigate to external checkout
            }
            
            e.preventDefault();
            
            const productCard = this.closest('.product-card');
            const productName = productCard.querySelector('.product-name').textContent;
            const productPrice = productCard.querySelector('.price-range').textContent;
            
            addToCart({
                name: productName,
                price: productPrice,
                quantity: 1
            });
            
            showCartAnimation(this);
            trackEvent('add_to_cart', {
                product_name: productName,
                price: productPrice
            });
        });
    });
    
    function addToCart(product) {
        const existingItem = cart.find(item => item.name === product.name);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push(product);
        }
        
        saveCartToStorage();
        updateCartDisplay();
        showAddToCartFeedback();
    }
    
    function updateCartDisplay() {
        const cartBtn = document.querySelector('.cart-btn');
        if (cartBtn) {
            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
            cartBtn.innerHTML = `🛒 Cart (${totalItems})`;
        }
    }
    
    function showCartAnimation(button) {
        const originalText = button.innerHTML;
        const originalStyle = button.style.background;
        
        button.innerHTML = '✓ Added!';
        button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        button.style.transform = 'scale(1.05)';
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = originalStyle;
            button.style.transform = 'scale(1)';
        }, 2000);
    }
    
    function showAddToCartFeedback() {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'cart-toast';
        toast.innerHTML = '🛒 Product added to cart!';
        toast.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Animate out and remove
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
    
    function getCartFromStorage() {
        try {
            const stored = localStorage.getItem('isrib_cart');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.warn('Could not load cart from storage:', e);
            return [];
        }
    }
    
    function saveCartToStorage() {
        try {
            localStorage.setItem('isrib_cart', JSON.stringify(cart));
        } catch (e) {
            console.warn('Could not save cart to storage:', e);
        }
    }
}

// Mobile optimizations and touch interactions
function initMobileOptimizations() {
    // Mobile menu toggle (if needed in future)
    let mobileMenuOpen = false;
    
    function toggleMobileMenu() {
        const nav = document.querySelector('.nav');
        mobileMenuOpen = !mobileMenuOpen;
        
        if (mobileMenuOpen) {
            nav.classList.add('mobile-active');
        } else {
            nav.classList.remove('mobile-active');
        }
    }
    
    // Touch optimization for iOS Safari
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        document.addEventListener('touchstart', function() {}, { passive: true });
    }
    
    // Prevent zoom on double tap for specific elements
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // Optimize for different screen orientations
    window.addEventListener('orientationchange', function() {
        setTimeout(() => {
            window.scrollTo(0, window.pageYOffset + 1);
            window.scrollTo(0, window.pageYOffset - 1);
        }, 500);
    });
}

// Enhanced analytics and tracking
function initAnalytics() {
    // Track page view
    trackEvent('page_view', {
        page_title: document.title,
        page_location: window.location.href
    });
    
    // Track scroll depth
    let maxScrollDepth = 0;
    let scrollDepthTracked = {
        25: false,
        50: false,
        75: false,
        100: false
    };
    
    function trackScrollDepth() {
        const scrollTop = window.pageYOffset;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = Math.round((scrollTop / docHeight) * 100);
        
        maxScrollDepth = Math.max(maxScrollDepth, scrollPercent);
        
        Object.keys(scrollDepthTracked).forEach(depth => {
            if (scrollPercent >= depth && !scrollDepthTracked[depth]) {
                scrollDepthTracked[depth] = true;
                trackEvent('scroll_depth', {
                    depth_percent: depth
                });
            }
        });
    }
    
    window.addEventListener('scroll', throttle(trackScrollDepth, 1000), { passive: true });
    
    // Track time on page
    let timeOnPage = 0;
    const timeInterval = setInterval(() => {
        timeOnPage += 10;
        if (timeOnPage % 60 === 0) { // Every minute
            trackEvent('time_on_page', {
                seconds: timeOnPage
            });
        }
    }, 10000);
    
    // Track before page unload
    window.addEventListener('beforeunload', () => {
        trackEvent('page_exit', {
            time_on_page: timeOnPage,
            max_scroll_depth: maxScrollDepth
        });
    });
}

// Contact form handling
function initContactForms() {
    const contactForms = document.querySelectorAll('form[name="contact"]');
    
    contactForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            // Show loading state
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
            
            // Simulate form submission (replace with actual endpoint)
            fetch(this.action, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (response.ok) {
                    showFormSuccess();
                    this.reset();
                    trackEvent('form_submit', {
                        form_name: 'contact'
                    });
                } else {
                    throw new Error('Network response was not ok');
                }
            })
            .catch(error => {
                console.error('Form submission error:', error);
                showFormError();
            })
            .finally(() => {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            });
        });
    });
    
    function showFormSuccess() {
        showNotification('Message sent successfully! We\'ll get back to you soon.', 'success');
    }
    
    function showFormError() {
        showNotification('There was an error sending your message. Please try again.', 'error');
    }
}

// Performance optimizations
function initPerformanceOptimizations() {
    // Lazy load images when they come into view
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
    
    // Preload critical resources
    const criticalResources = [
        '/css/styles.css',
        '/js/main.js'
    ];
    
    criticalResources.forEach(resource => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = resource.endsWith('.css') ? 'style' : 'script';
        link.href = resource;
        document.head.appendChild(link);
    });
}

// Utility functions
function trackEvent(eventName, parameters = {}) {
    // Google Analytics 4
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, parameters);
    }
    
    // Custom analytics endpoint (if needed)
    if (window.customAnalytics) {
        window.customAnalytics.track(eventName, parameters);
    }
    
    console.log('Analytics Event:', eventName, parameters);
}

function throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;
    
    return function (...args) {
        const currentTime = Date.now();
        
        if (currentTime - lastExecTime > delay) {
            func.apply(this, args);
            lastExecTime = currentTime;
        } else {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
                lastExecTime = Date.now();
            }, delay - (currentTime - lastExecTime));
        }
    };
}

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    const styles = {
        info: 'background: linear-gradient(135deg, #3b82f6, #1d4ed8);',
        success: 'background: linear-gradient(135deg, #10b981, #059669);',
        error: 'background: linear-gradient(135deg, #ef4444, #dc2626);',
        warning: 'background: linear-gradient(135deg, #f59e0b, #d97706);'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        max-width: 400px;
        word-wrap: break-word;
        ${styles[type]}
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 5000);
    
    // Click to dismiss
    notification.addEventListener('click', () => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    });
}

// Keyboard navigation improvements
document.addEventListener('keydown', function(e) {
    // Escape key to close modals/notifications
    if (e.key === 'Escape') {
        document.querySelectorAll('.notification').forEach(notification => {
            notification.click();
        });
    }
    
    // Enter key on focused buttons
    if (e.key === 'Enter' && e.target.classList.contains('btn-primary', 'btn-secondary')) {
        e.target.click();
    }
});

// Service Worker registration for PWA capabilities (future enhancement)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Error handling and monitoring
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
    trackEvent('javascript_error', {
        error_message: e.message,
        error_filename: e.filename,
        error_lineno: e.lineno
    });
});

// Performance monitoring
window.addEventListener('load', function() {
    // Monitor Core Web Vitals
    if ('PerformanceObserver' in window) {
        // Largest Contentful Paint (LCP)
        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                trackEvent('core_web_vitals', {
                    metric: 'LCP',
                    value: Math.round(entry.startTime)
                });
            }
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Cumulative Layout Shift (CLS)
        new PerformanceObserver((entryList) => {
            let clsValue = 0;
            for (const entry of entryList.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }
            trackEvent('core_web_vitals', {
                metric: 'CLS',
                value: Math.round(clsValue * 1000) / 1000
            });
        }).observe({ entryTypes: ['layout-shift'] });
    }
});

// Export functions for external use (if needed)
window.ISRIBShop = {
    trackEvent,
    showNotification,
    addToCart: function(product) {
        // Expose cart functionality
        console.log('Add to cart:', product);
    }
};

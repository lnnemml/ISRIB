// ISRIB Shop - Main JavaScript (Manual Payment System)
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
    initQuantitySelectors();
    initProductFilters();
    initContactFunctionality();
    initMobileOptimizations();
    initAnalytics();
    initContactForms();
    initPerformanceOptimizations();
}

// Contact-based functionality instead of cart
function initContactFunctionality() {
    let inquiries = getInquiriesFromStorage();
    updateInquiryDisplay();
    
    // Contact to order buttons
    document.querySelectorAll('.contact-to-order, .add-to-cart').forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Don't prevent default for contact links
            if (this.href && this.href.includes('contact.html')) {
                // Track the contact intent
                const productCard = this.closest('.product-card');
                if (productCard) {
                    const productName = productCard.querySelector('.product-name')?.textContent;
                    trackEvent('contact_to_order', {
                        product_name: productName,
                        source: 'product_card'
                    });
                }
                return; // Let it navigate to contact form
            }
            
            e.preventDefault();
            
            const productCard = this.closest('.product-card');
            const productName = productCard?.querySelector('.product-name')?.textContent;
            
            if (productName) {
                addToInquiry({
                    name: productName,
                    timestamp: new Date().toISOString()
                });
                
                showContactAnimation(this);
                trackEvent('add_to_inquiry', {
                    product_name: productName
                });
            }
        });
    });
    
    function addToInquiry(product) {
        const existingItem = inquiries.find(item => item.name === product.name);
        
        if (!existingItem) {
            inquiries.push(product);
            saveInquiriesToStorage();
            updateInquiryDisplay();
            showContactFeedback();
        }
    }
    
    function updateInquiryDisplay() {
        const contactBtn = document.querySelector('.cart-btn');
        if (contactBtn) {
            const totalInquiries = inquiries.length;
            if (totalInquiries > 0) {
                contactBtn.innerHTML = `💬 Contact (${totalInquiries} items)`;
            } else {
                contactBtn.innerHTML = `💬 Contact to Order`;
            }
        }
    }
    
    function showContactAnimation(button) {
        const originalText = button.innerHTML;
        const originalStyle = button.style.background;
        
        button.innerHTML = '✓ Added to inquiry!';
        button.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        button.style.transform = 'scale(1.05)';
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = originalStyle;
            button.style.transform = 'scale(1)';
        }, 2000);
    }
    
    function showContactFeedback() {
        showNotification('Product added to inquiry! Contact us to place your order.', 'success');
    }
    
    function getInquiriesFromStorage() {
        try {
            const stored = localStorage.getItem('isrib_inquiries');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.warn('Could not load inquiries from storage:', e);
            return [];
        }
    }
    
    function saveInquiriesToStorage() {
        try {
            localStorage.setItem('isrib_inquiries', JSON.stringify(inquiries));
        } catch (e) {
            console.warn('Could not save inquiries to storage:', e);
        }
    }
}

// Quantity selector functionality for products page
function initQuantitySelectors() {
    document.querySelectorAll('.quantity-option').forEach(option => {
        option.addEventListener('click', function() {
            const card = this.closest('.product-card');
            const quantity = this.dataset.quantity;
            const price = this.dataset.price;
            
            // Remove active class from siblings
            card.querySelectorAll('.quantity-option').forEach(opt => {
                opt.classList.remove('active');
            });
            
            // Add active class to clicked option
            this.classList.add('active');
            
            // Update selected quantity in specs
            const selectedQuantityEl = card.querySelector('.selected-quantity');
            if (selectedQuantityEl) {
                selectedQuantityEl.textContent = quantity;
            }
            
            // Update price display
            const currentPriceEl = card.querySelector('.current-price');
            const pricePerMgEl = card.querySelector('.price-per-mg');
            
            if (currentPriceEl) {
                currentPriceEl.textContent = `$${price}.00`;
            }
            
            if (pricePerMgEl) {
                // Calculate price per mg
                const quantityNum = parseFloat(quantity.replace(/mg|g/, ''));
                const quantityInMg = quantity.includes('g') ? quantityNum * 1000 : quantityNum;
                const pricePerMg = (parseFloat(price) / quantityInMg).toFixed(3);
                pricePerMgEl.textContent = `($${pricePerMg}/mg)`;
            }
            
            // Update contact links with product info
            updateContactLinks(card, quantity, price);
            
            // Track quantity selection
            trackEvent('quantity_selected', {
                product: card.querySelector('.product-name').textContent,
                quantity: quantity,
                price: price
            });
        });
    });

    // Initialize default selections on page load
    setTimeout(() => {
        document.querySelectorAll('.product-card').forEach(card => {
            const firstOption = card.querySelector('.quantity-option.active');
            if (firstOption) {
                firstOption.click();
            }
        });
    }, 100);
}

// Update contact links with current selection
function updateContactLinks(card, quantity, price) {
    const productName = card.querySelector('.product-name').textContent.toLowerCase().replace(/\s+/g, '-');
    const contactLinks = card.querySelectorAll('a[href*="contact.html"]');
    
    contactLinks.forEach(link => {
        const baseUrl = 'contact.html';
        const params = new URLSearchParams({
            product: `${productName}-${quantity}`,
            price: price,
            inquiry: 'order'
        });
        link.href = `${baseUrl}?${params.toString()}`;
    });
}

// Product filtering functionality
function initProductFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const filter = this.dataset.filter;
            
            // Update active button
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('active');
                b.style.background = 'white';
                b.style.color = '#1e40af';
            });
            this.classList.add('active');
            this.style.background = '#1e40af';
            this.style.color = 'white';
            
            // Filter products with animation
            document.querySelectorAll('.product-card').forEach(card => {
                if (filter === 'all' || card.dataset.category === filter) {
                    card.style.display = 'block';
                    card.style.opacity = '0';
                    setTimeout(() => {
                        card.style.opacity = '1';
                    }, 100);
                } else {
                    card.style.opacity = '0';
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 300);
                }
            });
            
            // Track filter usage
            trackEvent('product_filter', {
                filter_type: filter
            });
        });
    });
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
            if (!e.target.closest('a, button')) {
                const productName = this.querySelector('.product-name').textContent;
                trackEvent('product_view', {
                    product_name: productName,
                    interaction_type: 'card_click'
                });
            }
        });
    });
}

// Mobile optimizations and touch interactions
function initMobileOptimizations() {
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
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            // Show loading state
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
            
            // Track form submission
            trackEvent('contact_form_submit', {
                form_name: 'contact',
                subject: this.subject?.value,
                product: this.product?.value
            });
            
            // Re-enable button after a delay (Netlify will handle the redirect)
            setTimeout(() => {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }, 2000);
        });
    });
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
}

// Utility functions
function trackEvent(eventName, parameters = {}) {
    // Google Analytics 4
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, parameters);
    }
    
    // Meta Pixel tracking for contact events
    if (typeof fbq !== 'undefined' && eventName.includes('contact')) {
        fbq('track', 'Contact', {
            content_name: parameters.product_name || 'General Inquiry',
            content_category: 'Research Chemicals'
        });
    }
    
    // Reddit Pixel tracking for contact events
    if (typeof rdt !== 'undefined' && eventName.includes('contact')) {
        rdt('track', 'Contact', {
            item_name: parameters.product_name || 'General Inquiry'
        });
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

// Quick order function (global)
function quickOrder(productName, quantity, price) {
    const productSlug = productName.toLowerCase().replace(/\s+/g, '-');
    const url = `contact.html?product=${productSlug}-${quantity}&price=${price}&inquiry=order`;
    
    // Track quick order event
    trackEvent('quick_order_click', {
        product: productName,
        quantity: quantity,
        price: price
    });
    
    // Navigate to contact form
    window.location.href = url;
}

// Global CTA tracking function
function trackCTA(location, product = null, action = null) {
    const eventData = {
        event_category: 'engagement',
        event_label: location
    };

    if (product) {
        eventData.product = product;
    }

    if (action) {
        eventData.action = action;
    }

    if (typeof gtag !== 'undefined') {
        gtag('event', 'contact_intent', eventData);
    }

    const contactDescriptor = product || action || 'General Inquiry';

    if (typeof fbq !== 'undefined') {
        fbq('track', 'Contact', {
            content_name: contactDescriptor,
            content_category: 'Research Chemicals',
            event_label: location
        });
    }

    if (typeof rdt !== 'undefined') {
        rdt('track', 'Contact', {
            item_name: contactDescriptor,
            event_label: location
        });
    }

    trackEvent('cta_click', {
        location,
        product,
        action
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

// Export functions for external use
window.ISRIBShop = {
    trackEvent,
    showNotification,
    quickOrder,
    trackCTA
};


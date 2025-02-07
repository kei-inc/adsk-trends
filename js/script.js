document.addEventListener('DOMContentLoaded', async () => {
    // Load content data
    let data;
    try {
        const response = await fetch('./data/content.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        data = await response.json();
        console.log('Loaded data:', data);
    } catch (error) {
        console.error('Error loading content:', error);
        return;
    }
    
    // Create HTML for a pattern
    const createPatternHTML = (pattern) => `
        <div class="pattern" data-trend="${pattern.trendId}">
            <div class="title-block">
                <div class="pattern-name">PATTERN NAME</div>
                <div class="title">${pattern.title}</div>
            </div>
            
            <div class="pattern-flex">
                <div class="pattern-content">
                    <div class="info-group">
                        <div class="subTitle">ORIGIN</div>
                        <p><b><a href="${pattern.link}" target="_blank">${pattern.origin.company}</a></b>'s ${pattern.origin.product}</p>
                    </div>
                    
                    <div class="info-group">
                        <div class="subTitle">PATTERN</div>
                        <p>${pattern.pattern}</p>
                    </div>
                    
                    <div class="info-group">
                        <div class="subTitle">UPSHOT</div>
                        <p>${pattern.upshot}</p>
                    </div>
                </div>
                
                <div class="pattern-img">
                    <img class="image" src="${pattern.image}" alt="Pattern illustration" />
                    <p class="caption">${pattern.caption}</p>
                </div>
            </div>
        </div>
    `;

    // Create HTML for an introduction slide
    const createSlideHTML = (slide) => `
        <div class="slide" data-trend="${slide.trendId}">
            ${slide.image ? `
                <div class="slide-title-flex">
                    <div>
                        <img src="${slide.image}" alt="Slide illustration" />
                    </div>
                    <div>
                        <h2 class="slide-title">${slide.title}</h2>
                        <span>From ${slide.company}</span>
                    </div>
                </div>
            ` : `
                <h2 class="slide-title">${slide.title}</h2>
            `}
            <div class="slide-flex">
                <div class="slide-column">
                    ${slide.leftColumn.screenshot ? `
                        <div class="slide-column-screenshot">
                            ${slide.leftColumn.screenshot}
                        </div>
                    ` : `
                        <p>${slide.leftColumn.content}</p>
                    `}
                </div>
                <div class="slide-column">
                    <p>${slide.rightColumn.content}</p>
                </div>
            </div>
        </div>
    `;

    // Create HTML for a trend intro slide
    const createTrendIntroHTML = (trendId, settings) => `
        <div class="slide" data-trend="${trendId}">
            <div class="slide-flex">
                <div class="slide-column">
                    <h2 class="trend-intro-title" style="color: ${settings.color}">${settings.title}</h2>
                </div>
                <div class="slide-column">
                    <p>${settings.description}</p>
                </div>
            </div>
        </div>
    `;

    // Modify the rendering logic
    const container = document.getElementById('pattern-container');

    // First render introduction slides
    if (data.introduction) {
        data.introduction.forEach(slide => {
            container.innerHTML += createSlideHTML(slide);
        });
    }

    // Group patterns by trend
    const patternsByTrend = data.patterns.reduce((acc, pattern) => {
        if (!acc[pattern.trendId]) {
            acc[pattern.trendId] = [];
        }
        acc[pattern.trendId].push(pattern);
        return acc;
    }, {});

    // Render trend intros and their patterns
    Object.entries(patternsByTrend).forEach(([trendId, patterns]) => {
        // Add trend intro slide
        if (data.trendSettings[trendId]) {
            container.innerHTML += createTrendIntroHTML(trendId, data.trendSettings[trendId]);
        }
        // Add patterns for this trend
        patterns.forEach(pattern => {
            container.innerHTML += createPatternHTML(pattern);
        });
    });

    // Create trends data structure from settings
    const trends = Object.entries(data.trendSettings).map(([id, settings]) => ({
        title: settings.title,
        color: settings.color,
        patterns: document.querySelectorAll(`.pattern[data-trend="${id}"], .slide[data-trend="${id}"]`)
    }));

    // Get all scrollable elements (both patterns and slides) in order
    const scrollableElements = document.querySelectorAll('.pattern, .slide');
    const snapOffset = 250;
    let isScrolling = false;
    let lastScrollTop = 0;
    let currentIndex = 0;
    
    // Elements to update
    const trendTitle = document.querySelector('.trendTitle');
    const ellipse = document.querySelector('.ellipse');

    // Update getSnapPosition to position slides below header
    const getSnapPosition = (pattern) => {
        const rect = pattern.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        return scrollTop + rect.top - snapOffset;
    };

    // Update scroll to position function to accept a behavior parameter
    const scrollToPosition = (position) => {
        isScrolling = true;
        window.scrollTo({
            top: position,
            behavior: 'smooth'
        });
        
        setTimeout(() => {
            isScrolling = false;
        }, 500);  // Back to 500ms
    };

    // Add debounce timer variable
    let scrollDebounceTimer;

    window.addEventListener('scroll', () => {
        if (isScrolling) return;

        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollingDown = currentScrollTop > lastScrollTop;
        
        const lastScrollPosition = lastScrollTop;
        lastScrollTop = currentScrollTop;

        // Ignore tiny scroll amounts
        if (Math.abs(currentScrollTop - lastScrollPosition) < 5) return;
        
        // Clear any existing timeout
        clearTimeout(scrollDebounceTimer);
        
        // Set new timeout to handle the scroll after a brief delay
        scrollDebounceTimer = setTimeout(() => {
            // Find which slide we've actually scrolled to
            let closestIndex = 0;
            let closestDistance = Infinity;
            
            scrollableElements.forEach((element, index) => {
                const rect = element.getBoundingClientRect();
                const distance = Math.abs(rect.top);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestIndex = index;
                }
            });

            // Update currentIndex to match where we actually scrolled to
            if (closestIndex !== currentIndex) {
                // Only update if we've actually moved to a different slide
                currentIndex = closestIndex;
                goToPattern(currentIndex);
                return; // Exit early to prevent additional scroll checks
            }
            
            // Only check scroll direction if we haven't changed slides
            if (scrollingDown && currentIndex < scrollableElements.length - 1) {
                goToPattern(currentIndex + 1);
            } else if (!scrollingDown && currentIndex > 0) {
                goToPattern(currentIndex - 1);
            }
        }, 50);  // Back to 50ms
    });

    // Update initial positioning to start at the first slide
    setTimeout(() => {
        if (scrollableElements[0]) {
            currentIndex = 0;
            scrollToPosition(getSnapPosition(scrollableElements[0]));
            updateTrendVisuals(0);
        }
    }, 100);

    // Update trend visuals
    const updateTrendVisuals = (index) => {
        // Find which trend this element belongs to
        const element = scrollableElements[index];
        const trendId = element.getAttribute('data-trend');
        const trend = trends.find(t => Array.from(t.patterns).some(p => p === element));
        
        if (trend) {
            // Update trend title
            trendTitle.textContent = trend.title;
            
            // Update ellipse color
            if (ellipse.style.backgroundColor !== trend.color) {
                ellipse.style.transition = 'background-color 0.2s ease-out';
                ellipse.style.backgroundColor = trend.color;
                
                setTimeout(() => {
                    ellipse.style.transition = '';
                }, 200);
            }
        }
    };

    // Navigate to specific pattern
    const goToPattern = (index) => {
        if (index >= 0 && index < scrollableElements.length) {
            currentIndex = index;
            scrollToPosition(getSnapPosition(scrollableElements[index]));
            updateTrendVisuals(index);
        }
    };

    // Handle keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (isScrolling) return;
        
        switch (e.key) {
            case 'ArrowDown':
            case 'ArrowRight':
                e.preventDefault();
                goToPattern(currentIndex + 1);
                break;
            case 'ArrowUp':
            case 'ArrowLeft':
                e.preventDefault();
                goToPattern(currentIndex - 1);
                break;
        }
    });

    // Update menu functionality
    const hamburgerObject = document.querySelector('.hamburger object');
    const menuOverlay = document.querySelector('.menu-overlay');

    // Wait for SVG to load
    hamburgerObject.addEventListener('load', function() {
        const svgDoc = hamburgerObject.contentDocument;
        const menuButton = svgDoc.querySelector('.menu');
        
        // Toggle menu - don't toggle the active class here, let SVG handle it
        menuButton.addEventListener('click', () => {
            if (!menuOverlay.classList.contains('open')) {
                menuOverlay.style.display = 'block';
                // Use requestAnimationFrame to ensure display change is processed
                requestAnimationFrame(() => {
                    menuOverlay.classList.add('open');
                });
            } else {
                menuOverlay.classList.remove('open');
                // Wait for animation to complete before hiding
                setTimeout(() => {
                    menuOverlay.style.display = 'none';
                }, 500);
            }
            document.body.style.overflow = menuOverlay.classList.contains('open') ? 'hidden' : '';
        });

        // Update menu link click handlers
        const menuLinks = document.querySelectorAll('.menu-link:not(.disabled)');
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                const trendId = link.getAttribute('data-trend');
                const patternIndex = findFirstPatternIndex(trendId);
                
                if (patternIndex !== -1) {
                    goToPattern(patternIndex);
                    // Close menu and reset hamburger icon
                    menuOverlay.classList.remove('open');
                    document.body.style.overflow = '';
                }
            });
        });
    });

    // Update findFirstPatternIndex to include slides
    const findFirstPatternIndex = (trendId) => {
        return Array.from(scrollableElements).findIndex(element => 
            element.getAttribute('data-trend') === trendId
        );
    };

    // After loading data, generate menu items
    const menuContainer = document.querySelector('.menuItems');

    // Generate menu items from trendSettings
    Object.entries(data.trendSettings).forEach(([trendId, settings], index) => {
        const menuItem = document.createElement('div');
        menuItem.className = 'menu-link';
        menuItem.setAttribute('data-trend', trendId);
        
        menuItem.innerHTML = `
            <div class="menu-icon">
                <img src="./img/${trendId}.png" />
            </div>
            <span>${index + 1}: ${settings.title}</span>
        `;
        
        menuContainer.appendChild(menuItem);
    });

    // Initialize menu overlay after everything is loaded
    setTimeout(() => {
        const menuOverlay = document.querySelector('.menu-overlay');
        menuOverlay.classList.add('initialized');
    }, 100);
});
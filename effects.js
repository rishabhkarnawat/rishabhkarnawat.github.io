// Theme Toggle Functionality
(function () {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle?.querySelector('.theme-icon');
    const html = document.documentElement;
    const favicon = document.getElementById('favicon');

    // Check for saved theme preference or default to light mode
    const currentTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', currentTheme);

    // Update icon based on theme
    function updateIcon(theme) {
        if (themeIcon) {
            themeIcon.textContent = theme === 'dark' ? '☀' : '☾';
        }
    }

    // Update favicon based on theme
    function updateFavicon(theme) {
        if (favicon) {
            favicon.href = theme === 'dark' ? 'Dark%20Mode.png' : '%20Light%20Mode.png';
        }
    }

    updateIcon(currentTheme);
    updateFavicon(currentTheme);

    // Toggle theme on button click
    if (themeToggle) {
        themeToggle.addEventListener('click', function () {
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateIcon(newTheme);
            updateFavicon(newTheme);
        });
    }
})();

// Timezone Clock Functionality
(function () {
    const timezones = {
        'sf-time': 'America/Los_Angeles',
        'ny-time': 'America/New_York',
        'mumbai-time': 'Asia/Kolkata',
        'dubai-time': 'Asia/Dubai'
    };

    function updateTimes() {
        Object.keys(timezones).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const now = new Date();
                const formatter = new Intl.DateTimeFormat('en-US', {
                    timeZone: timezones[id],
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });

                const parts = formatter.formatToParts(now);
                const hours = parts.find(p => p.type === 'hour').value;
                const minutes = parts.find(p => p.type === 'minute').value;
                const seconds = parts.find(p => p.type === 'second').value;

                element.textContent = `${hours}:${minutes}:${seconds}`;
            }
        });
    }

    // Update immediately and then every second
    updateTimes();
    setInterval(updateTimes, 1000);
})();

// Smooth Page Transitions
(function () {
    // Add fade-out transition when clicking navigation links
    const navLinks = document.querySelectorAll('.nav-link, .name-link');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');

            // Only apply transition if it's a same-domain link
            if (href && !href.startsWith('http') && !href.startsWith('#')) {
                e.preventDefault();

                // Add fade-out class to body
                document.body.style.opacity = '0';
                document.body.style.transition = 'opacity 0.3s ease-out';

                // Navigate after fade-out
                setTimeout(() => {
                    window.location.href = href;
                }, 300);
            }
        });
    });
})();

// Mobile Menu Toggle
(function () {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const headerNav = document.getElementById('headerNav');

    if (mobileMenuToggle && headerNav) {
        mobileMenuToggle.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            
            const isActive = headerNav.classList.contains('active');
            
            if (isActive) {
                // Close menu
                headerNav.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
            } else {
                // Open menu
                mobileMenuToggle.classList.add('active');
                headerNav.classList.add('active');
            }
        });

        // Close menu when clicking on a nav link
        const navLinks = headerNav.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                setTimeout(() => {
                    headerNav.classList.remove('active');
                    mobileMenuToggle.classList.remove('active');
                }, 100);
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', function (e) {
            if (headerNav.classList.contains('active')) {
                if (!mobileMenuToggle.contains(e.target) && !headerNav.contains(e.target)) {
                    headerNav.classList.remove('active');
                    mobileMenuToggle.classList.remove('active');
                }
            }
        });
    }
})();

// Social Links Toggle (Mobile)
(function () {
    const socialLinksToggle = document.getElementById('socialLinksToggle');
    const socialLinksContent = document.getElementById('socialLinksContent');

    if (socialLinksToggle && socialLinksContent) {
        socialLinksToggle.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            
            const isActive = socialLinksContent.classList.contains('active');
            
            if (isActive) {
                // Close dropdown
                socialLinksContent.classList.remove('active');
                socialLinksToggle.classList.remove('active');
            } else {
                // Open dropdown
                socialLinksToggle.classList.add('active');
                socialLinksContent.classList.add('active');
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function (e) {
            if (socialLinksContent.classList.contains('active')) {
                if (!socialLinksToggle.contains(e.target) && !socialLinksContent.contains(e.target)) {
                    socialLinksContent.classList.remove('active');
                    socialLinksToggle.classList.remove('active');
                }
            }
        });
    }
})();

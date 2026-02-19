/* ============================================
   SPEC10X — Landing Page Interactions (Tailwind)
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initMobileMenu();
    initSmoothScroll();
});

/* ---------- Sticky Navbar ---------- */
function initNavbar() {
    const navbar = document.querySelector('nav');
    if (!navbar) return;
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 50) {
            navbar.classList.add('shadow-lg');
        } else {
            navbar.classList.remove('shadow-lg');
        }
    }, { passive: true });
}

/* ---------- Mobile Menu ---------- */
function initMobileMenu() {
    const toggle = document.getElementById('mobileMenuToggle');
    const menu = document.getElementById('mobileMenu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
        const isOpen = !menu.classList.contains('hidden');
        menu.classList.toggle('hidden', isOpen);

        const spans = toggle.querySelectorAll('span');
        if (!isOpen) {
            spans[0].style.transform = 'rotate(45deg) translate(4px, 4px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(4px, -4px)';
        } else {
            spans[0].style.transform = '';
            spans[1].style.opacity = '';
            spans[2].style.transform = '';
        }
    });

    // Close menu on link click
    menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menu.classList.add('hidden');
            const spans = toggle.querySelectorAll('span');
            spans[0].style.transform = '';
            spans[1].style.opacity = '';
            spans[2].style.transform = '';
        });
    });
}

/* ---------- Smooth Scroll ---------- */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (href === '#') return;
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const navHeight = document.querySelector('nav')?.offsetHeight || 64;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
                window.scrollTo({ top: targetPosition, behavior: 'smooth' });
            }
        });
    });
}

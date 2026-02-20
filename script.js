/* ============================================
   SPEC10X — Landing Page Interactions (Tailwind)
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initMobileMenu();
    initSmoothScroll();
    initPipelineInteractivity();
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

/* ---------- Pipeline Interactivity ---------- */
function initPipelineInteractivity() {
    const steps = document.querySelectorAll('.pipeline-step');
    const phases = ['phase-discover', 'phase-synthesize', 'phase-specify', 'phase-deliver', 'phase-learn'];

    // Click to scroll
    steps.forEach(step => {
        step.addEventListener('click', () => {
            const targetId = step.dataset.target;
            const target = document.getElementById(targetId);
            if (target) {
                const navHeight = document.querySelector('nav')?.offsetHeight || 64;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 40;
                window.scrollTo({ top: targetPosition, behavior: 'smooth' });
            }
        });
    });

    // Intersection Observer for scroll spy
    const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -50% 0px', // Activate when element is near center/top
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                setActivePipelineStep(id);
            }
        });
    }, observerOptions);

    phases.forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
    });
}

function setActivePipelineStep(targetId) {
    document.querySelectorAll('.pipeline-step').forEach(step => {
        const icon = step.querySelector('.step-icon');
        const label = step.querySelector('.step-label');
        const isTarget = step.dataset.target === targetId;

        // Reset classes
        if (isTarget) {
            // Add active styles based on index or just general active style? 
            // We want to simulate the hover state but permanent.
            // Since hover states are specific colors per step, we need to map them or just trigger the hover classes.
            // Tailwind doesn't strictly support "forcing" hover states easily via JS without duplication or "group-hover" hacks.
            // BUT: We can add specific border/text colors manually or via new utility classes.

            // Let's use specific active classes.
            step.classList.add('active-step');

            // Manually apply the specific color for the active step
            // This is a bit hacky but effective for this specific design
            if (targetId === 'phase-discover') {
                icon.classList.add('text-primary', 'border-primary', 'shadow-neon');
                label.classList.add('text-white');
            } else if (targetId === 'phase-synthesize') {
                icon.classList.add('text-accent', 'border-accent', 'shadow-neon-cyan');
                label.classList.add('text-white');
            } else if (targetId === 'phase-specify') {
                icon.classList.add('text-amber-400', 'border-amber-400');
                icon.style.boxShadow = '0 0 15px rgba(251,191,36,0.3)';
                label.classList.add('text-white');
            } else if (targetId === 'phase-deliver') {
                icon.classList.add('text-green-500', 'border-green-500');
                icon.style.boxShadow = '0 0 15px rgba(16,185,129,0.3)';
                label.classList.add('text-white');
            } else if (targetId === 'phase-learn') {
                icon.classList.add('text-rose-400', 'border-rose-400');
                icon.style.boxShadow = '0 0 15px rgba(251,113,133,0.3)';
                label.classList.add('text-white');
            }

        } else {
            // Remove active styles
            step.classList.remove('active-step');
            icon.classList.remove('text-primary', 'border-primary', 'shadow-neon', 'text-accent', 'border-accent', 'shadow-neon-cyan', 'text-amber-400', 'border-amber-400', 'text-green-500', 'border-green-500', 'text-rose-400', 'border-rose-400');
            icon.style.boxShadow = '';
            label.classList.remove('text-white');
        }
    });
}

/**
 * Zana AI — Landing Page Interactions
 * Scroll animations, nav scroll effect, FAQ accordion, contact form.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  // ─── Nav scroll effect ────────────────────────────────────────────────────
  const nav = document.getElementById('landing-nav');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    nav?.classList.toggle('scrolled', y > 40);
    lastScroll = y;
  }, { passive: true });

  // ─── Smooth scroll for anchor links ──────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ─── Scroll Reveal ────────────────────────────────────────────────────────
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, i * 80);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // ─── FAQ Accordion ────────────────────────────────────────────────────────
  document.querySelectorAll('.faq-item').forEach(item => {
    const btn = item.querySelector('.faq-question');
    btn?.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all
      document.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
      });

      // Toggle this one
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ─── Contact Form ─────────────────────────────────────────────────────────
  document.getElementById('contact-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('contact-submit');
    const name    = document.getElementById('contact-name').value.trim();
    const email   = document.getElementById('contact-email').value.trim();
    const message = document.getElementById('contact-message').value.trim();

    if (!name || !email || !message) {
      Toast.show('Please fill in all fields.', 'warning');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Sending…';

    // Simulate submission (implement your own endpoint)
    await new Promise(r => setTimeout(r, 1500));

    Toast.show('Message sent! We\'ll get back to you soon.', 'success');
    e.target.reset();
    btn.disabled = false;
    btn.textContent = 'Send Message';
  });

  // ─── Redirect if logged in ────────────────────────────────────────────────
  if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
    // Show "Go to Chat" in nav instead of "Get Started"
    const navSignup = document.getElementById('nav-signup-btn');
    const navLogin  = document.getElementById('nav-login-btn');
    if (navSignup) { navSignup.textContent = '→ Open Chat'; navSignup.href = '/chat.html'; }
    if (navLogin)  { navLogin.textContent = 'Dashboard'; navLogin.href = '/chat.html'; }

    const heroCta = document.getElementById('hero-cta-primary');
    if (heroCta)  { heroCta.textContent = '→ Open Zana'; heroCta.href = '/chat.html'; }
    const ctaBtn = document.getElementById('cta-signup-btn');
    if (ctaBtn)   { ctaBtn.textContent = '→ Open Zana'; ctaBtn.href = '/chat.html'; }
  }

  // ─── Animated counter for hero stats ─────────────────────────────────────
  function animateValue(el, end, suffix = '') {
    let start = 0;
    const duration = 1500;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start = Math.min(start + step, end);
      el.textContent = start + suffix;
      if (start >= end) clearInterval(timer);
    }, 16);
  }

  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const statValues = entry.target.querySelectorAll('.hero-stat-value');
        statValues.forEach(el => {
          const text = el.textContent;
          const num = parseInt(text);
          const suffix = text.replace(String(num), '');
          if (!isNaN(num)) animateValue(el, num, suffix);
        });
        statsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) statsObserver.observe(heroStats);

});

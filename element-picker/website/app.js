/* Dev Bridge for DSH — landing page behaviour (tiny, no dependencies). */
(() => {
  'use strict';

  // Footer year
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  // Active nav highlight while scrolling
  const links = Array.from(document.querySelectorAll('.nav a[href^="#"]'));
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = '#' + entry.target.id;
        links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === id));
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    sections.forEach((s) => spy.observe(s));
  }

  // Copy sample JSON
  const copyBtn = document.getElementById('copySample');
  const sample = document.getElementById('sampleJson');
  if (copyBtn && sample) {
    copyBtn.addEventListener('click', async () => {
      const text = sample.textContent.trim();
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.textContent = 'Copied ✓';
      } catch {
        copyBtn.textContent = 'Select and copy manually';
      }
      setTimeout(() => { copyBtn.textContent = 'Copy JSON'; }, 1800);
    });
  }

  // Donate CTA — swap the anchor's href for your real donation URL when ready.
  const donate = document.getElementById('donateBtn');
  if (donate && donate.getAttribute('href') === '#') {
    donate.addEventListener('click', (e) => {
      e.preventDefault();
      donate.textContent = 'Donation link coming soon — thank you!';
      donate.style.opacity = '0.9';
    });
  }
})();
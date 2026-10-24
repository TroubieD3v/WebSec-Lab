// Applies the saved theme before the first paint (dark is the default). External file: the CSP forbids inline scripts.
try {
  if (localStorage.getItem('websec-theme') === 'light') document.documentElement.classList.add('light')
} catch {}

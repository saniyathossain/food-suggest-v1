// Apply the saved theme and language before first paint (no flash). Kept as a file so the CSP needs no inline script.
try {
  var saved = JSON.parse(localStorage.getItem('pathya.prefs') || '{}');
  if (saved.theme) document.documentElement.dataset.theme = saved.theme;
  if (saved.lang) document.documentElement.lang = saved.lang;
} catch (error) {}

(() => {
  document.documentElement.classList.add('v36');
  const report = document.querySelector('[data-build-version], .build-version');
  if (report) report.textContent = 'v36';
})();

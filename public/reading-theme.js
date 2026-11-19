(() => {
  const key = 'comeback-traveler-reading-theme';
  const root = document.documentElement;
  let storage;

  function apply(preference) {
    if (preference === 'light' || preference === 'dark') {
      root.dataset.readingTheme = preference;
    } else {
      delete root.dataset.readingTheme;
    }
    // With no override, CSS follows the system live.
    return root.dataset.readingTheme || 'system';
  }

  try {
    storage = window.localStorage;
    apply(storage.getItem(key));
  } catch {
    // The system theme still works when storage is unavailable.
  }

  document.addEventListener('DOMContentLoaded', () => {
    const control = document.querySelector('[data-reading-theme-control]');
    if (!control) return;
    control.value = root.dataset.readingTheme || 'system';
    control.disabled = false;

    control.addEventListener('change', () => {
      const preference = apply(control.value);
      try {
        storage?.setItem(key, preference);
      } catch {
        // The selection still applies to the current page.
      }
    });

    window.addEventListener('storage', (event) => {
      if (storage && event.storageArea === storage && (event.key === key || event.key === null)) {
        control.value = apply(event.newValue);
      }
    });
  }, { once: true });
})();

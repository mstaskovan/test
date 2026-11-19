(() => {
  const key = "aquinas-reader-settings";
  const root = document.documentElement;
  const controls = document.querySelector("#nastavenia");
  const defaults = {theme: "system", accent: "green", font: "serif", pageAxis: "horizontal"};
  const systemTheme = matchMedia("(prefers-color-scheme: dark)");
  let saved = {};
  try {
    saved = JSON.parse(window.localStorage.getItem(key)) || {};
  } catch {
    // The reader also works in browsers that restrict storage for local files.
  }
  const settings = {...defaults};
  function applyTheme() {
    root.dataset.resolvedTheme = settings.theme === "system"
      ? (systemTheme.matches ? "dark" : "light")
      : settings.theme;
  }

  for (const control of controls.querySelectorAll("select")) {
    const name = control.name;
    if (Array.from(control.options).some((option) => option.value === saved[name])) {
      settings[name] = saved[name];
    }
    control.value = settings[name];
    root.dataset[name] = settings[name];
    control.addEventListener("change", () => {
      settings[name] = control.value;
      root.dataset[name] = control.value;
      if (name === "theme") applyTheme();
      try {
        window.localStorage.setItem(key, JSON.stringify(settings));
      } catch {
        // The current page still keeps the preference.
      }
    });
  }
  applyTheme();
  systemTheme.addEventListener("change", applyTheme);
  const settingsButton = document.querySelector('[data-open="nastavenia"]');
  settingsButton.hidden = false;
  settingsButton.addEventListener("click", () => controls.showModal());
})();

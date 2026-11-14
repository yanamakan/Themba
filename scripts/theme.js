(() => {
  "use strict";

  const root = document.documentElement;
  const validThemes = ["dark", "light"];
  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem("theme");
  } catch (error) {
    console.warn("Could not read the saved theme preference.", error);
  }

  function applyTheme(theme) {
    const nextTheme = validThemes.includes(theme) ? theme : "dark";
    root.setAttribute("data-theme", nextTheme);
    root.style.colorScheme = nextTheme;

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = nextTheme === "light" ? "#f5f8f6" : "#0b1310";

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      const target = nextTheme === "dark" ? "light" : "dark";
      button.setAttribute("aria-label", `Switch to ${target} mode`);
      button.setAttribute("title", `Switch to ${target} mode`);
      button.setAttribute("aria-pressed", String(nextTheme === "light"));
      const icon = button.querySelector("[data-theme-icon]");
      if (icon) icon.textContent = nextTheme === "dark" ? "☀" : "☾";
    });

    return nextTheme;
  }

  applyTheme(savedTheme);

  window.toggleTheme = () => {
    const currentTheme = root.getAttribute("data-theme") || "dark";
    const nextTheme = applyTheme(currentTheme === "dark" ? "light" : "dark");
    try {
      localStorage.setItem("theme", nextTheme);
    } catch (error) {
      console.warn("Could not save the theme preference.", error);
    }
  };

  function bindThemeToggles() {
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", window.toggleTheme);
    });
    applyTheme(root.getAttribute("data-theme"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindThemeToggles, { once: true });
  } else {
    bindThemeToggles();
  }
})();

document.addEventListener("DOMContentLoaded", () => {
  if (!window.AppState) return;
  AppState.init();

  const hideIconsRaw = localStorage.getItem("settings.hideIcons");
  if (hideIconsRaw !== null) {
    const v = hideIconsRaw === "true";
    AppState.setState("ui.settings.hideIcons", v);
  }

  AppState.subscribe("ui.settings.hideIcons", (val) => {
    localStorage.setItem("settings.hideIcons", String(val === true));
  });
});

window.setAppPreference = function (path, value) {
  if (!window.AppState) return;
  AppState.setState(path, value);
};

window.getAppPreference = function (path, fallback) {
  if (!window.AppState) return fallback;
  return AppState.getState(path, fallback);
};


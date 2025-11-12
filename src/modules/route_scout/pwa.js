export const registerSW = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/route_scout_sw.js').catch(() => {});
  }
};


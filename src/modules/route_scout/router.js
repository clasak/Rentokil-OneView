const parseHash = () => {
  const raw = location.hash.replace('#', '');
  if (!raw) return { name: 'home', params: {} };
  const [name, maybeId] = raw.split('/');
  if (name === 'appointment' && maybeId) return { name, params: { id: maybeId } };
  return { name, params: {} };
};

let cfg = null;
let current = { name: 'home', params: {} };
let historyStack = [];
let initialized = false;

export const initRouter = (config) => {
  cfg = config;
  const { name, params } = parseHash();
  current = { name, params };
  render(name, params);
  initialized = true;
  window.addEventListener('hashchange', () => {
    const { name: nextName, params: nextParams } = parseHash();
    // Push previous into internal stack when changing routes after init
    if (initialized) historyStack.push(current);
    current = { name: nextName, params: nextParams };
    render(nextName, nextParams);
  });
};

export const navigate = (name, params = {}) => {
  if (name === 'appointment' && params.id) {
    location.hash = `appointment/${params.id}`;
  } else {
    location.hash = name;
  }
};

export const back = () => {
  const prev = historyStack.pop();
  if (prev && prev.name) {
    if (prev.name === 'appointment' && prev.params && prev.params.id) {
      location.hash = `appointment/${prev.params.id}`;
    } else {
      location.hash = prev.name || 'home';
    }
  } else {
    location.hash = 'home';
  }
};

const render = (name, params) => {
  if (!cfg) return;
  const factory = cfg.routes[name] || cfg.routes['home'];
  const el = factory(params || {});
  cfg.mount(el);
};

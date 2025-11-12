export const NavBar = ({ onNav }) => {
  const el = document.createElement('nav');
  el.className = 'rs-bottomnav';
  el.innerHTML = `
    <div class="rs-tab" data-tab="home">Home</div>
    <div class="rs-tab" data-tab="map">Map</div>
    <div class="rs-tab" data-tab="route">Route</div>
    <div class="rs-tab" data-tab="more">More</div>
  `;

  el.addEventListener('click', (e) => {
    const tab = e.target.closest('.rs-tab')?.dataset.tab;
    if (!tab) return;
    onNav?.(tab);
    setActive(tab);
  });

  return el;
};

export const setActive = (tab) => {
  document.querySelectorAll('.rs-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
};

export const NavBarAPI = {
  setActiveFromHash() {
    const tab = location.hash.startsWith('#map') ? 'map' : location.hash.startsWith('#route') ? 'route' : location.hash.startsWith('#appointment') ? 'map' : 'home';
    setActive(tab);
  }
};

// convenience re-export
export const NavBarSetActiveFromHash = NavBarAPI.setActiveFromHash;
export const NavBarSetActive = setActive;
export const NavBarDefault = NavBar;


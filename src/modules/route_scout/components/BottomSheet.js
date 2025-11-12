export const BottomSheet = () => {
  const backdrop = document.createElement('div');
  backdrop.className = 'rs-sheet-backdrop';
  const sheet = document.createElement('div');
  sheet.className = 'rs-sheet';
  sheet.innerHTML = `
    <div class="rs-sheet-title">Filter verticals</div>
    <div class="rs-chip-group" id="rs-verticals"></div>
    <div class="rs-sheet-actions">
      <button class="rs-btn outline" id="rs-clear">Clear</button>
      <button class="rs-btn primary" id="rs-apply">Apply</button>
    </div>
  `;

  document.body.append(backdrop, sheet);

  const close = () => { backdrop.classList.remove('open'); sheet.classList.remove('open'); };
  const open = () => { backdrop.classList.add('open'); sheet.classList.add('open'); };

  backdrop.addEventListener('click', close);

  return { backdrop, sheet, open, close };
};


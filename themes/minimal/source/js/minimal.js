(() => {
  const html = document.documentElement;
  const toggle = document.querySelector('.theme-toggle');
  const preference = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => html.dataset.theme === 'dark' || (!html.dataset.theme && preference.matches);
  const label = () => { toggle.setAttribute('aria-pressed', String(isDark())); toggle.setAttribute('aria-label', isDark() ? '切换到浅色外观' : '切换到深色外观'); };
  if (toggle) {
    toggle.hidden = false;
    label();
    toggle.addEventListener('click', () => {
      html.dataset.theme = isDark() ? 'light' : 'dark';
      try { localStorage.setItem('lockhart-theme', html.dataset.theme); } catch {}
      label();
    });
    preference.addEventListener('change', label);
  }
  const dialog = document.querySelector('.image-viewer');
  let opener;
  if (dialog && typeof dialog.showModal === 'function') {
    const preview = dialog.querySelector('img');
    const caption = dialog.querySelector('.image-caption');
    document.querySelectorAll('.prose img').forEach((image, index) => {
      image.decoding = 'async';
      if (index > 0) image.loading = 'lazy';
      if (image.closest('a, button')) return;
      const parent = image.parentElement;
      const figure = document.createElement('figure');
      figure.className = 'post-figure';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'image-open';
      button.setAttribute('aria-label', '放大图片：' + (image.alt || '文章配图'));
      if (parent.tagName === 'P' && parent.childNodes.length === 1) parent.replaceWith(figure);
      else image.before(figure);
      button.append(image);
      figure.append(button);
      if (image.alt) { const text = document.createElement('figcaption'); text.textContent = image.alt; figure.append(text); }
      button.addEventListener('click', () => { opener = button; preview.src = image.currentSrc || image.src; preview.alt = image.alt; caption.textContent = image.alt; dialog.showModal(); });
    });
    dialog.querySelector('.image-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
    dialog.addEventListener('close', () => { preview.removeAttribute('src'); opener?.focus(); });
  }
  document.querySelectorAll('.prose table').forEach(table => {
    if (table.closest('figure.highlight')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'table-scroll'; table.before(wrapper); wrapper.append(table);
  });
})();


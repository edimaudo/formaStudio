(() => {
  const root = document.documentElement;
  const safeStorage = {
    get(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch {} }
  };

  const storedTheme = safeStorage.get('forma-theme', 'light');
  const storedFont = safeStorage.get('forma-font-size', 'medium');
  root.dataset.theme = storedTheme === 'dark' ? 'dark' : 'light';
  root.dataset.fontSize = ['small', 'medium', 'large'].includes(storedFont) ? storedFont : 'medium';

  const settingsPanel = document.querySelector('[data-settings-panel]');
  const settingsBackdrop = document.querySelector('[data-settings-backdrop]');
  const settingsOpeners = document.querySelectorAll('[data-open-settings]');
  const closeSettingsButtons = document.querySelectorAll('[data-close-settings]');
  let previousSettingsFocus = null;
  let previouslyInertElements = [];

  document.querySelectorAll('[data-theme-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.themeChoice === root.dataset.theme)));
  document.querySelectorAll('[data-font-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.fontChoice === root.dataset.fontSize)));

  function openSettings(event) {
    if (!settingsPanel || !settingsBackdrop) return;
    previousSettingsFocus = event?.currentTarget || document.activeElement;
    settingsPanel.hidden = false;
    settingsBackdrop.hidden = false;
    previouslyInertElements = [...document.body.children]
      .filter(element => element !== settingsPanel && element !== settingsBackdrop)
      .map(element => ({ element, inert: element.inert }));
    previouslyInertElements.forEach(({ element }) => { element.inert = true; });
    settingsOpeners.forEach(button => button.setAttribute('aria-expanded', 'true'));
    const active = settingsPanel.querySelector(`[data-theme-choice="${root.dataset.theme}"]`);
    (active || settingsPanel.querySelector('button, input, select, textarea, a[href]'))?.focus();
  }
  function closeSettings() {
    if (!settingsPanel || !settingsBackdrop) return;
    settingsPanel.hidden = true;
    settingsBackdrop.hidden = true;
    previouslyInertElements.forEach(({ element, inert }) => { element.inert = inert; });
    previouslyInertElements = [];
    settingsOpeners.forEach(button => button.setAttribute('aria-expanded', 'false'));
    previousSettingsFocus?.focus?.();
    previousSettingsFocus = null;
  }
  settingsOpeners.forEach(button => button.addEventListener('click', openSettings));
  closeSettingsButtons.forEach(button => button.addEventListener('click', closeSettings));
  settingsBackdrop?.addEventListener('click', closeSettings);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && settingsPanel && !settingsPanel.hidden) { closeSettings(); return; }
    if (event.key === 'Escape' && sidebar?.classList.contains('sidebar-open') && sidebarMedia.matches) {
      sidebar.classList.remove('sidebar-open'); syncSidebarAccessibility(); sidebarToggle?.focus(); return;
    }
    if (event.key === 'Escape' && publicNav?.classList.contains('mobile-open')) {
      setPublicMenu(false); publicMenuToggle?.focus(); return;
    }
    if (event.key !== 'Tab' || !settingsPanel || settingsPanel.hidden) return;
    const focusable = [...settingsPanel.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter(item => item.getAttribute('aria-hidden') !== 'true' && item.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  document.querySelectorAll('[data-theme-choice]').forEach(button => {
    button.addEventListener('click', () => {
      const theme = button.dataset.themeChoice === 'dark' ? 'dark' : 'light';
      root.dataset.theme = theme;
      safeStorage.set('forma-theme', theme);
      document.querySelectorAll('[data-theme-choice]').forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
    });
  });
  document.querySelectorAll('[data-font-choice]').forEach(button => {
    button.addEventListener('click', () => {
      const size = ['small', 'medium', 'large'].includes(button.dataset.fontChoice) ? button.dataset.fontChoice : 'medium';
      root.dataset.fontSize = size;
      safeStorage.set('forma-font-size', size);
      document.querySelectorAll('[data-font-choice]').forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
    });
  });

  const publicMenuToggle = document.querySelector('[data-mobile-menu]');
  const publicNav = document.querySelector('#public-navigation');
  function setPublicMenu(open) {
    if (!publicMenuToggle || !publicNav) return;
    const expanded = Boolean(open);
    publicMenuToggle.setAttribute('aria-expanded', String(expanded));
    publicNav.classList.toggle('mobile-open', expanded);
  }
  publicMenuToggle?.addEventListener('click', () => {
    setPublicMenu(publicMenuToggle.getAttribute('aria-expanded') !== 'true');
  });

  const sidebar = document.querySelector('[data-sidebar]');
  const sidebarToggle = document.querySelector('[data-sidebar-toggle]');
  const sidebarMedia = window.matchMedia('(max-width: 650px)');
  function syncSidebarAccessibility() {
    if (!sidebar) return;
    const hidden = sidebarMedia.matches && !sidebar.classList.contains('sidebar-open');
    sidebar.inert = hidden;
    sidebar.setAttribute('aria-hidden', String(hidden));
    sidebarToggle?.setAttribute('aria-expanded', String(!hidden && sidebarMedia.matches));
  }
  syncSidebarAccessibility();
  sidebarMedia.addEventListener?.('change', syncSidebarAccessibility);
  sidebarToggle?.addEventListener('click', () => {
    if (!sidebar) return;
    const open = !sidebar.classList.contains('sidebar-open');
    sidebar.classList.toggle('sidebar-open', open);
    syncSidebarAccessibility();
    if (open) sidebar.querySelector('a[href], button:not([disabled])')?.focus();
    else sidebarToggle.focus();
  });
  document.addEventListener('click', event => {
    if (sidebar?.classList.contains('sidebar-open') && !sidebar.contains(event.target) && !sidebarToggle?.contains(event.target)) {
      sidebar.classList.remove('sidebar-open');
      syncSidebarAccessibility();
    }
  });
  document.querySelectorAll('[data-scroll-create]').forEach(link => link.addEventListener('click', event => {
    const target = document.querySelector('#create-kit');
    if (target) { event.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); target.querySelector('input')?.focus({ preventScroll: true }); }
  }));

  const searchInput = document.querySelector('[data-kit-search]');
  searchInput?.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    let visible = 0;
    document.querySelectorAll('[data-kit-card]').forEach(card => {
      const matches = (card.dataset.searchText || '').includes(query);
      card.hidden = !matches;
      if (matches) visible++;
    });
    const empty = document.querySelector('[data-empty-search]');
    if (empty) empty.hidden = !query || visible > 0;
  });

  document.querySelectorAll('[data-kit-page-tabs]').forEach(tablist => {
    const tabs = [...tablist.querySelectorAll('[data-kit-page-tab]')];
    const panels = [...document.querySelectorAll('[data-kit-page-panel]')];
    function activateKitPage(name, focus = false) {
      tabs.forEach(tab => {
        const active = tab.dataset.kitPageTab === name;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      panels.forEach(panel => { panel.hidden = panel.dataset.kitPagePanel !== name; });
      if (focus) tabs.find(tab => tab.dataset.kitPageTab === name)?.focus();
    }
    activateKitPage(tablist.dataset.defaultKitView || 'existing');
    tabs.forEach(tab => tab.addEventListener('click', () => activateKitPage(tab.dataset.kitPageTab)));
    tablist.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const focused = tabs.indexOf(document.activeElement);
      const selected = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
      const current = focused >= 0 ? focused : Math.max(0, selected);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      activateKitPage(tabs[next].dataset.kitPageTab, true);
    });
  });

  document.querySelectorAll('[data-pathway-switcher]').forEach(switcher => {
    const tabs = [...switcher.querySelectorAll('[data-pathway-tab]')];
    const panels = [...switcher.querySelectorAll('[data-pathway-panel]')];
    function activatePathway(name, focus = false) {
      tabs.forEach(tab => {
        const active = tab.dataset.pathwayTab === name;
        tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
      });
      panels.forEach(panel => { panel.hidden = panel.dataset.pathwayPanel !== name; });
      if (focus) tabs.find(tab => tab.dataset.pathwayTab === name)?.focus();
    }
    activatePathway(switcher.dataset.defaultPath || 'brief');
    tabs.forEach(tab => tab.addEventListener('click', () => activatePathway(tab.dataset.pathwayTab)));
    switcher.querySelector('[data-pathway-tabs]')?.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const focused = tabs.indexOf(document.activeElement);
      const selected = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
      const current = focused >= 0 ? focused : Math.max(0, selected);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      activatePathway(tabs[next].dataset.pathwayTab, true);
    });
  });

  document.querySelectorAll('[data-toggle-password]').forEach(button => button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.togglePassword);
    if (!input) return;
    const reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    button.textContent = reveal ? 'Hide' : 'Show';
    button.setAttribute('aria-label', `${reveal ? 'Hide' : 'Show'} password`);
  }));

  async function readJson(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) throw new Error(data.detail || 'The request could not be completed. Try again.');
    return data;
  }
  async function api(url, { method = 'GET', body } = {}) {
    const headers = { 'Accept': 'application/json', 'X-CSRF-Token': window.FORMA_CSRF || '' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'same-origin' });
    return readJson(response);
  }
  function setButtonLoading(button, loading, loadingText = 'Working…', idleText = null) {
    if (!button) return;
    if (loading) {
      if (!button.dataset.idleText) button.dataset.idleText = button.textContent.trim();
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.textContent = loadingText;
    } else {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.textContent = idleText || button.dataset.idleText || button.textContent;
    }
  }
  async function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(value);
    const el = document.createElement('textarea');
    el.value = value; el.style.position = 'fixed'; el.style.opacity = '0'; document.body.appendChild(el); el.select();
    const result = document.execCommand('copy'); el.remove();
    if (!result) throw new Error('Copy was blocked by this browser. Select the link and copy it manually.');
  }

  const editor = document.querySelector('[data-kit-editor]');
  if (editor) {
    const kitId = editor.dataset.kitId;
    const blockList = editor.querySelector('[data-block-list]');
    const feedback = editor.querySelector('[data-save-feedback]');
    const publishButtons = editor.querySelectorAll('[data-publish-kit]');
    const saveButtons = editor.querySelectorAll('[data-save-kit]');
    const shareUrl = editor.querySelector('[data-share-url]');
    let saved = false;

    function blockData() {
      const visibleBlocks = [...editor.querySelectorAll('[data-block]')].map(block => {
        const data = {
          id: block.dataset.blockId,
          type: block.dataset.blockType,
          title: block.querySelector('[data-block-title]')?.value || block.querySelector('.block-card-heading h3')?.textContent?.trim() || block.dataset.blockType,
          content: block.querySelector('[data-block-content]')?.value || '',
          asset_url: block.querySelector('[data-block-url]')?.value.trim() || '',
          caption_url: block.querySelector('[data-block-caption-url]')?.value.trim() || ''
        };
        if (data.type === 'Colors') {
          data.palette = [...block.querySelectorAll('[data-color-row]')].map(row => ({
            name: row.querySelector('[data-color-name]')?.value.trim() || 'Color',
            hex: row.querySelector('[data-color-hex]')?.value.trim().toUpperCase() || ''
          })).filter(color => /^#[0-9A-F]{6}$/.test(color.hex));
        } else if (data.type === 'Typography') {
          data.typography = Object.fromEntries(['heading_font', 'body_font', 'accent_font'].map(key => [key, block.querySelector(`[data-typography-field="${key}"]`)?.value.trim() || '']));
        } else if (data.type === 'Logos') {
          data.logo_direction = block.querySelector('[data-logo-direction]')?.value || 'explore';
          data.logo_brief = block.querySelector('[data-logo-brief]')?.value.trim() || '';
        } else if (data.type === 'Visuals') {
          data.visual_style = Object.fromEntries(['photography', 'lighting', 'texture'].map(key => [key, block.querySelector(`[data-visual-field="${key}"]`)?.value.trim() || '']));
        } else if (data.type === 'Videos') {
          data.motion_style = Object.fromEntries(['pace', 'editing'].map(key => [key, block.querySelector(`[data-motion-field="${key}"]`)?.value.trim() || '']));
        } else if (data.type === 'Icons') {
          data.icon_style = Object.fromEntries(['form', 'density'].map(key => [key, block.querySelector(`[data-icon-field="${key}"]`)?.value.trim() || '']));
        }
        return data;
      });
      let legacy = [];
      try { legacy = JSON.parse(editor.querySelector('[data-legacy-blocks]')?.textContent || '[]'); } catch { legacy = []; }
      const visibleIds = new Set(visibleBlocks.map(block => `${block.type}:${block.id}`));
      return [...visibleBlocks, ...legacy.filter(block => !visibleIds.has(`${block.type}:${block.id}`))];
    }
    function kitData() {
      return {
        name: editor.querySelector('[data-field="name"]').value.trim(),
        brand_name: editor.querySelector('[data-field="brand_name"]').value.trim(),
        description: editor.querySelector('[data-field="description"]').value.trim(),
        tagline: editor.querySelector('[data-field="tagline"]').value.trim(),
        elevator_pitch: editor.querySelector('[data-field="elevator_pitch"]').value.trim(),
        industry: editor.querySelector('[data-field="industry"]').value.trim(),
        audience: editor.querySelector('[data-field="audience"]').value.trim(),
        blocks: blockData(),
        access_mode: editor.querySelector('[data-field="access_mode"]').value,
        access_password: editor.querySelector('#access-password')?.value || '',
        allowed_emails_text: editor.querySelector('#allowed-emails')?.value || ''
      };
    }
    async function saveKit({ quiet = false } = {}) {
      if (!editor.querySelector('[data-field="name"]').value.trim()) throw new Error('Add a project name before saving.');
      if (!quiet && feedback) feedback.textContent = 'Saving changes…';
      const result = await api(`/api/kits/${encodeURIComponent(kitId)}`, { method: 'PUT', body: kitData() });
      saved = true;
      if (shareUrl && result.share_url) shareUrl.value = result.share_url;
      const openShare = editor.querySelector('[data-open-share]');
      if (openShare && result.share_url) openShare.href = result.share_url;
      if (feedback) feedback.textContent = quiet ? '' : 'Changes saved.';
      editor.querySelectorAll('[data-share-status]').forEach(node => node.textContent = 'Saved · link stays the same');
      editor.querySelectorAll('[data-save-kit]').forEach(button => { button.disabled = false; });
      return result;
    }
    saveButtons.forEach(button => button.addEventListener('click', async () => {
      const prior = button.textContent;
      setButtonLoading(button, true, 'Saving…', prior);
      try { await saveKit(); } catch (error) { if (feedback) feedback.textContent = error.message; }
      finally { setButtonLoading(button, false, '', prior); }
    }));
    publishButtons.forEach(button => button.addEventListener('click', async () => {
      const prior = button.textContent;
      setButtonLoading(button, true, 'Publishing…', prior);
      try {
        await saveKit({ quiet: true });
        const result = await api(`/api/kits/${encodeURIComponent(kitId)}/publish`, { method: 'POST' });
        const urlInput = editor.querySelector('[data-share-url]');
        if (urlInput) urlInput.value = result.share_url;
        const openShare = editor.querySelector('[data-open-share]'); if (openShare) openShare.href = result.share_url;
        editor.querySelectorAll('[data-publish-state]').forEach(node => { node.textContent = 'Live'; node.classList.remove('status-draft'); node.classList.add('status-live'); });
        editor.querySelectorAll('[data-share-status]').forEach(node => { node.textContent = 'Published'; node.classList.remove('status-draft'); node.classList.add('status-live'); });
        if (feedback) feedback.textContent = 'Your brand kit is live. The share URL is ready.';
        const previewOpen = editor.querySelector('[data-preview-open]'); if (previewOpen) { previewOpen.hidden = false; previewOpen.href = result.share_url; }
        const copied = await Promise.resolve();
      } catch (error) { if (feedback) feedback.textContent = error.message; }
      finally { setButtonLoading(button, false, '', prior); }
    }));

    editor.querySelector('[data-field="access_mode"]')?.addEventListener('change', event => {
      const mode = event.target.value;
      const password = editor.querySelector('[data-password-settings]');
      const emails = editor.querySelector('[data-email-settings]');
      if (password) password.hidden = mode !== 'password';
      if (emails) emails.hidden = mode !== 'email';
    });

    const componentTabs = [...editor.querySelectorAll('[data-block-section-tab]')];
    const componentPanels = [...editor.querySelectorAll('[data-block-panel]')];
    function activateComponentTab(tab, focus = false) {
      const selected = tab.dataset.blockSectionTab;
      componentTabs.forEach(item => {
        const active = item === tab;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
      });
      componentPanels.forEach(panel => { panel.hidden = panel.dataset.blockPanel !== selected; });
      if (focus) tab.focus();
    }
    const initiallySelectedComponent = componentTabs.find(tab => tab.getAttribute('aria-selected') === 'true') || componentTabs[0];
    if (initiallySelectedComponent) activateComponentTab(initiallySelectedComponent);
    componentTabs.forEach(tab => tab.addEventListener('click', () => activateComponentTab(tab)));
    editor.querySelector('[data-block-tabs]')?.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const current = componentTabs.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? componentTabs.length - 1 : (Math.max(0, current) + (event.key === 'ArrowRight' ? 1 : -1) + componentTabs.length) % componentTabs.length;
      activateComponentTab(componentTabs[next], true);
    });

    function updateColorPicker(row, source) {
      const picker = row?.querySelector('[data-color-picker]');
      const hex = row?.querySelector('[data-color-hex]');
      if (!picker || !hex) return;
      if (source === picker) hex.value = picker.value.toUpperCase();
      else if (/^#[0-9a-fA-F]{6}$/.test(hex.value.trim())) picker.value = hex.value.trim();
    }
    editor.addEventListener('input', event => {
      if (event.target.matches('[data-color-picker], [data-color-hex]')) updateColorPicker(event.target.closest('[data-color-row]'), event.target);
      renderFinalPreview();
    });
    editor.addEventListener('click', event => {
      const addColor = event.target.closest('[data-add-color]');
      if (addColor) {
        const palette = addColor.closest('[data-block]')?.querySelector('[data-color-palette]');
        const first = palette?.querySelector('[data-color-row]');
        if (!palette || !first) return;
        const row = first.cloneNode(true);
        row.querySelector('[data-color-picker]').value = '#64748B';
        row.querySelector('[data-color-name]').value = 'New color';
        row.querySelector('[data-color-hex]').value = '#64748B';
        palette.append(row); row.querySelector('[data-color-name]').focus({ preventScroll: true }); renderFinalPreview();
      }
      const removeColor = event.target.closest('[data-remove-color]');
      if (removeColor) {
        const palette = removeColor.closest('[data-color-palette]');
        const rows = palette?.querySelectorAll('[data-color-row]') || [];
        if (rows.length <= 1) { const feedback = editor.querySelector('[data-save-feedback]'); if (feedback) feedback.textContent = 'Keep at least one color in the palette.'; return; }
        removeColor.closest('[data-color-row]')?.remove(); renderFinalPreview();
      }
    });

    function renderFinalPreview() {
      const preview = editor.querySelector('[data-kit-live-preview]');
      if (!preview) return;
      const value = selector => editor.querySelector(selector)?.value?.trim() || '';
      const setText = (selector, text) => { const node = preview.querySelector(selector); if (node) { node.textContent = text; node.hidden = !text; } };
      setText('[data-preview-brand]', value('[data-field="brand_name"]') || value('[data-field="name"]') || 'Your brand');
      setText('[data-preview-description]', value('[data-field="description"]'));
      setText('[data-preview-tagline]', value('[data-field="tagline"]'));
      setText('[data-preview-pitch]', value('[data-field="elevator_pitch"]'));
      const palette = preview.querySelector('[data-preview-palette]');
      if (palette) {
        palette.replaceChildren();
        const colorBlock = [...editor.querySelectorAll('[data-block]')].find(block => block.dataset.blockType === 'Colors');
        const rows = [...(colorBlock?.querySelectorAll('[data-color-row]') || [])];
        rows.forEach(row => {
          const hex = row.querySelector('[data-color-hex]')?.value.trim() || '#FFFFFF';
          const name = row.querySelector('[data-color-name]')?.value.trim() || 'Color';
          if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
          const item = document.createElement('div'); const chip = document.createElement('span'); chip.style.backgroundColor = hex; chip.setAttribute('aria-hidden', 'true');
          const label = document.createElement('strong'); label.textContent = name; const code = document.createElement('code'); code.textContent = hex.toUpperCase();
          item.append(chip, label, code); palette.append(item);
        });
      }
      const blocks = preview.querySelector('[data-preview-blocks]');
      if (blocks) {
        blocks.replaceChildren();
        [...editor.querySelectorAll('[data-block]')].filter(block => !['3D Models', 'Collaterals'].includes(block.dataset.blockType)).forEach(block => {
          const card = document.createElement('article'); const title = document.createElement('strong');
          title.textContent = block.querySelector('[data-block-title]')?.value?.trim() || block.querySelector('.block-card-heading h3')?.textContent?.trim() || block.dataset.blockType;
          const content = document.createElement('p');
          if (block.dataset.blockType === 'Colors') content.textContent = block.querySelector('[data-block-content]')?.value || 'Color palette';
          else if (block.dataset.blockType === 'Typography') {
            const values = ['heading_font', 'body_font', 'accent_font'].map(key => block.querySelector(`[data-typography-field="${key}"]`)?.value.trim()).filter(Boolean);
            content.textContent = values.length ? `Typefaces: ${values.join(' · ')}. ${block.querySelector('[data-block-content]')?.value || ''}` : (block.querySelector('[data-block-content]')?.value || 'Type system');
          } else if (block.dataset.blockType === 'Logos') content.textContent = block.querySelector('[data-block-content]')?.value || block.querySelector('[data-logo-brief]')?.value || 'Logo direction to refine';
          else {
            const styleBits = ['photography', 'lighting', 'texture'].map(key => block.querySelector(`[data-visual-field="${key}"]`)?.value.trim()).filter(Boolean);
            const motionBits = ['pace', 'editing'].map(key => block.querySelector(`[data-motion-field="${key}"]`)?.value.trim()).filter(Boolean);
            const iconBits = ['form', 'density'].map(key => block.querySelector(`[data-icon-field="${key}"]`)?.value.trim()).filter(Boolean);
            const details = styleBits.length ? `Visual style: ${styleBits.join(' · ')}. ` : motionBits.length ? `Motion: ${motionBits.join(' · ')}. ` : iconBits.length ? `Icon system: ${iconBits.join(' · ')}. ` : '';
            content.textContent = details + (block.querySelector('[data-block-content]')?.value || '');
          }
          card.append(title, content); blocks.append(card);
        });
      }
    }
    renderFinalPreview();

    blockList?.addEventListener('click', async event => {
      const upload = event.target.closest('[data-upload-asset], [data-upload-captions]');
      if (upload) {
        const captionUpload = upload.matches('[data-upload-captions]');
        const card = upload.closest('[data-block]');
        const fileInput = card?.querySelector(captionUpload ? '[data-caption-file]' : '[data-block-file]');
        const status = card?.querySelector(captionUpload ? '[data-caption-feedback]' : '[data-upload-feedback]');
        const file = fileInput?.files?.[0];
        if (!file) { if (status) status.textContent = captionUpload ? 'Choose a WebVTT captions file first.' : 'Choose a file first.'; return; }
        if (captionUpload && !file.name.toLowerCase().endsWith('.vtt')) { if (status) status.textContent = 'Choose a .vtt WebVTT captions file.'; return; }
        if (file.size > 15 * 1024 * 1024) { if (status) status.textContent = 'Files must be 15 MB or smaller.'; return; }
        const previousText = upload.textContent;
        upload.disabled = true; upload.setAttribute('aria-busy', 'true'); upload.textContent = 'Uploading…';
        if (status) status.textContent = 'Uploading securely…';
        try {
          const form = new FormData(); form.append('file', file);
          const response = await fetch(`/api/kits/${encodeURIComponent(kitId)}/assets`, {
            method: 'POST', headers: { 'Accept': 'application/json', 'X-CSRF-Token': window.FORMA_CSRF || '' },
            body: form, credentials: 'same-origin'
          });
          const result = await readJson(response);
          const urlInput = card.querySelector(captionUpload ? '[data-block-caption-url]' : '[data-block-url]');
          if (urlInput) urlInput.value = result.asset_url;
          if (status) status.textContent = `${result.filename} uploaded. Save changes to attach it to this kit.`;
        } catch (error) { if (status) status.textContent = error.message; }
        finally { upload.disabled = false; upload.removeAttribute('aria-busy'); upload.textContent = previousText; }
        return;
      }
    });

    editor.querySelector('[data-copy-share]')?.addEventListener('click', async event => {
      const button = event.currentTarget; const original = button.textContent;
      try { await copyText(shareUrl.value); button.textContent = 'Copied'; setTimeout(() => { button.textContent = original; }, 1400); }
      catch (error) { if (feedback) feedback.textContent = error.message; }
    });
    editor.querySelector('[data-delete-kit]')?.addEventListener('click', async event => {
      if (!window.confirm('Delete this brand kit and its saved blocks? This cannot be undone.')) return;
      const button = event.currentTarget; setButtonLoading(button, true, 'Deleting…');
      try { await api(`/api/kits/${encodeURIComponent(kitId)}`, { method: 'DELETE' }); window.location.assign('/app'); }
      catch (error) { if (feedback) feedback.textContent = error.message; setButtonLoading(button, false); }
    });

    editor.querySelectorAll('[data-generate-field]').forEach(button => button.addEventListener('click', async () => {
      const target = button.dataset.generateField;
      const task = button.dataset.task;
      const field = editor.querySelector(`[data-field="${target}"]`);
      const status = editor.querySelector(`[data-generation-status="${target}"]`);
      const contextField = editor.querySelector(`[data-generation-context="${target}"]`);
      const generationContext = contextField?.value.trim() || '';
      if (!field) return;
      if (generationContext.length < 12) {
        if (status) status.textContent = 'Add a little more context before generating.';
        contextField?.focus();
        return;
      }
      const prior = button.textContent;
      setButtonLoading(button, true, 'Writing…', prior);
      if (status) status.textContent = 'Building a draft from your brief…';
      try {
        const description = editor.querySelector('[data-field="description"]').value.trim();
        const existingTagline = editor.querySelector('[data-field="tagline"]').value.trim();
        const existingPitch = editor.querySelector('[data-field="elevator_pitch"]').value.trim();
        const result = await api('/api/ai/copy', { method: 'POST', body: {
          task,
          brand_name: editor.querySelector('[data-field="brand_name"]').value,
          industry: editor.querySelector('[data-field="industry"]').value,
          audience: editor.querySelector('[data-field="audience"]').value,
          positioning: editor.querySelector('#copy-positioning')?.value.trim() || description,
          tone: editor.querySelector('#copy-tone')?.value.trim() || 'Clear, distinctive, human',
          key_points: [generationContext, description, existingTagline ? `Current tagline: ${existingTagline}` : '', existingPitch && target !== 'elevator_pitch' ? `Current elevator pitch: ${existingPitch}` : ''].filter(Boolean).join('\n').slice(0, 1500)
        }});
        field.value = result.copy;
        renderFinalPreview();
        if (status) status.textContent = 'Draft added. Review it, then save the kit.';
        if (feedback) feedback.textContent = `${task} drafted. Save changes to keep it.`;
      } catch (error) {
        if (status) status.textContent = error.message;
      } finally {
        setButtonLoading(button, false, '', prior);
      }
    }));

    editor.querySelectorAll('[data-generate-logo]').forEach(button => button.addEventListener('click', async () => {
      const block = button.closest('[data-block]');
      const briefField = block?.querySelector('[data-logo-brief]');
      const status = block?.querySelector('[data-logo-status]');
      const brief = briefField?.value.trim() || '';
      if (brief.length < 12) { if (status) status.textContent = 'Describe the look and feel first.'; briefField?.focus(); return; }
      const prior = button.textContent; setButtonLoading(button, true, 'Developing direction…', prior);
      if (status) status.textContent = 'Considering structure, personality, and practical use…';
      try {
        const result = await api('/api/ai/copy', { method: 'POST', body: {
          task: 'Logo direction', brand_name: editor.querySelector('[data-field="brand_name"]').value,
          industry: editor.querySelector('[data-field="industry"]').value, audience: editor.querySelector('[data-field="audience"]').value,
          positioning: editor.querySelector('[data-field="description"]').value,
          tone: block.querySelector('[data-logo-direction]').value,
          key_points: brief.slice(0, 900)
        }});
        block.querySelector('[data-block-content]').value = result.copy; renderFinalPreview();
        if (status) status.textContent = 'Direction generated. Edit it before saving.';
      } catch (error) { if (status) status.textContent = error.message; }
      finally { setButtonLoading(button, false, '', prior); }
    }));

    const copyButton = editor.querySelector('[data-generate-copy]');
    copyButton?.addEventListener('click', async () => {
      const status = editor.querySelector('[data-copy-status]'); const output = editor.querySelector('[data-copy-result]');
      const prior = copyButton.textContent; setButtonLoading(copyButton, true, 'Writing…', prior); if (status) status.textContent = 'Working on a draft';
      try {
        const result = await api('/api/ai/copy', { method: 'POST', body: {
          task: editor.querySelector('#copy-task').value,
          brand_name: editor.querySelector('[data-field="brand_name"]').value,
          industry: editor.querySelector('[data-field="industry"]').value,
          audience: editor.querySelector('[data-field="audience"]').value,
          positioning: editor.querySelector('#copy-positioning').value,
          tone: editor.querySelector('#copy-tone').value,
          key_points: editor.querySelector('#copy-key-points').value
        }});
        output.value = result.copy; if (status) status.textContent = 'Draft generated. Review before use.';
      } catch (error) { if (status) status.textContent = error.message; }
      finally { setButtonLoading(copyButton, false, '', prior); }
    });
    editor.querySelector('[data-copy-to-story]')?.addEventListener('click', async () => {
      const copy = editor.querySelector('[data-copy-result]').value.trim();
      if (!copy) return;
      const story = [...editor.querySelectorAll('[data-block]')].find(block => block.dataset.blockType === 'Brand Story');
      if (!story) return;
      story.querySelector('[data-block-content]').value = copy;
      renderFinalPreview();
      if (feedback) feedback.textContent = 'Story draft applied. Save changes to keep it.';
      story.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    editor.querySelector('[data-copy-copy]')?.addEventListener('click', async event => {
      const button = event.currentTarget; const original = button.textContent;
      try { await copyText(editor.querySelector('[data-copy-result]').value); button.textContent = 'Copied'; setTimeout(() => { button.textContent = original; }, 1400); }
      catch (error) { if (feedback) feedback.textContent = error.message; }
    });

    const cultureButton = editor.querySelector('[data-get-culture]');
    cultureButton?.addEventListener('click', async () => {
      const results = editor.querySelector('[data-culture-results]'); const prior = cultureButton.textContent;
      setButtonLoading(cultureButton, true, 'Looking for signals…', prior);
      results.replaceChildren(); const loading = document.createElement('p'); loading.textContent = 'Checking for relevant cultural signals…'; results.append(loading);
      try {
        const response = await api('/api/ai/culture', { method: 'POST', body: {
          brand_name: editor.querySelector('[data-field="brand_name"]').value,
          industry: editor.querySelector('[data-field="industry"]').value,
          audience: editor.querySelector('[data-field="audience"]').value,
          market: editor.querySelector('#culture-market').value,
          values: editor.querySelector('#culture-values').value
        }});
        results.replaceChildren();
        const heading = document.createElement('h3'); heading.textContent = response.matched_entity ? `Signals related to ${response.matched_entity.name}` : 'Cultural signals'; results.append(heading);
        if (response.signals?.length) {
          const chips = document.createElement('div'); chips.className = 'signal-chips';
          response.signals.forEach(signal => { const chip = document.createElement('span'); chip.className = 'signal-chip'; chip.textContent = signal.name; chips.append(chip); }); results.append(chips);
        } else { const none = document.createElement('p'); none.textContent = response.note || 'No matching signals were returned.'; results.append(none); }
        if (response.interpretation) { const interpretation = document.createElement('p'); interpretation.className = 'culture-result'; interpretation.style.whiteSpace = 'pre-wrap'; interpretation.textContent = response.interpretation; results.append(interpretation); }
        const note = document.createElement('p'); note.className = 'culture-disclaimer'; note.textContent = response.note || 'Aggregate affinity patterns are not the preferences of every person in an audience.'; results.append(note);
      } catch (error) { results.replaceChildren(); const message = document.createElement('p'); message.textContent = error.message; results.append(message); }
      finally { setButtonLoading(cultureButton, false, '', prior); }
    });

    // The active tab follows the section currently being read, not only the last tab clicked.
    const tabLinks = [...editor.querySelectorAll('[data-editor-tabs] a')];
    const targets = tabLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
    if ('IntersectionObserver' in window && targets.length) {
      const observer = new IntersectionObserver(entries => {
        const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        tabLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${visible.target.id}`));
      }, { rootMargin: '-22% 0px -62% 0px', threshold: [0, .2, .5] });
      targets.forEach(target => observer.observe(target));
    }
    tabLinks.forEach(link => link.addEventListener('click', () => {
      tabLinks.forEach(other => other.classList.toggle('active', other === link));
    }));
  }

  const legalPage = document.querySelector('[data-legal-page]');
  if (legalPage) {
    const brandSelect = legalPage.querySelector('[data-legal-brand-select]');
    brandSelect?.addEventListener('change', () => brandSelect.form?.requestSubmit());

    const analyzeButton = legalPage.querySelector('[data-analyze-compliance]');
    const resultPanel = legalPage.querySelector('[data-compliance-analysis]');
    const resultSummary = legalPage.querySelector('[data-analysis-summary]');
    const resultFindings = legalPage.querySelector('[data-analysis-findings]');
    const analysisStatus = legalPage.querySelector('[data-analysis-status]');
    const persistenceNote = legalPage.querySelector('[data-report-persistence-status]');
    const reviewWorkflow = legalPage.querySelector('[data-report-workflow]');
    const reviewStatus = legalPage.querySelector('[data-review-status]');
    const reviewStatusPill = legalPage.querySelector('[data-review-status-pill]');
    const reviewHistory = legalPage.querySelector('[data-review-history]');
    const reviewHistoryEmpty = legalPage.querySelector('[data-review-history-empty]');
    const reviewFeedback = legalPage.querySelector('[data-review-update-feedback]');
    const reviewForm = legalPage.querySelector('[data-report-review-form]');
    const reviewSaveButton = legalPage.querySelector('[data-save-review-stage]');
    const reviewNote = legalPage.querySelector('#legal-review-note');
    const selectedKitId = analyzeButton?.dataset.brandKitId || '';
    const reviewStageLabels = {
      not_analyzed: 'Not analyzed', analysis_ready: 'Report ready',
      in_review: 'In review', changes_needed: 'Changes needed', reviewed: 'Reviewed'
    };

    function addAnalysisList(parent, label, items) {
      if (!Array.isArray(items) || !items.length) return;
      const section = document.createElement('section'); section.className = 'analysis-finding-part';
      const heading = document.createElement('h4'); heading.textContent = label; section.append(heading);
      const list = document.createElement('ul');
      items.slice(0, 5).forEach(value => { const item = document.createElement('li'); item.textContent = String(value); list.append(item); });
      section.append(list); parent.append(section);
    }
    function renderLegalAnalysis(analysis) {
      resultFindings.replaceChildren();
      resultSummary.textContent = String(analysis?.summary || 'Review the brand-specific alignment observations and recommendations below.');
      if (analysis?.analysis_text) {
        const text = document.createElement('p'); text.className = 'analysis-fallback-text'; text.style.whiteSpace = 'pre-wrap'; text.textContent = analysis.analysis_text; resultFindings.append(text); return;
      }
      const standards = Array.isArray(analysis?.standards) ? analysis.standards : [];
      standards.forEach(item => {
        const article = document.createElement('article'); article.className = 'analysis-finding-row';
        const head = document.createElement('div'); head.className = 'analysis-finding-row-heading';
        const title = document.createElement('h3'); title.textContent = String(item.standard || 'Framework');
        const assessment = document.createElement('span'); assessment.className = 'status-pill'; assessment.textContent = String(item.alignment_assessment || item.materials_assessment || 'Not assessable from supplied content');
        head.append(title, assessment); article.append(head);
        addAnalysisList(article, 'Content that aligns', item.aligned_content || item.evidence_identified);
        addAnalysisList(article, 'Alignment gaps', item.alignment_gaps || item.gaps_to_check);
        addAnalysisList(article, 'Recommended changes', item.recommended_changes || item.next_actions);
        resultFindings.append(article);
      });
      if (!standards.length) {
        const empty = document.createElement('p'); empty.textContent = 'No structured findings were returned. Run the analysis again.'; resultFindings.append(empty);
      }
    }
    function renderReviewHistory(history) {
      if (!reviewHistory) return;
      reviewHistory.replaceChildren();
      (Array.isArray(history) ? [...history].reverse() : []).forEach(event => {
        const item = document.createElement('li');
        const top = document.createElement('div'); top.className = 'legal-history-topline';
        const label = document.createElement('strong'); label.textContent = reviewStageLabels[event.status] || String(event.status || 'Updated');
        const time = document.createElement('time'); time.dateTime = String(event.changed_at || '');
        const date = new Date(event.changed_at || ''); time.textContent = Number.isNaN(date.getTime()) ? String(event.changed_at || '') : `${date.toLocaleString()} `;
        top.append(label, time); item.append(top);
        if (event.changed_by) { const who = document.createElement('p'); who.textContent = `Changed by ${event.changed_by}`; item.append(who); }
        if (event.note) { const note = document.createElement('p'); note.textContent = String(event.note); item.append(note); }
        reviewHistory.append(item);
      });
      if (reviewHistoryEmpty) reviewHistoryEmpty.hidden = reviewHistory.children.length > 0;
    }
    function setReviewStatus(status) {
      if (reviewStatus && reviewStageLabels[status]) reviewStatus.value = status;
      if (reviewStatusPill) reviewStatusPill.textContent = reviewStageLabels[status] || 'Not reviewed';
    }
    function setReportPersistence(persisted, message = '') {
      if (persistenceNote) persistenceNote.textContent = message;
      if (reviewSaveButton) reviewSaveButton.disabled = !persisted;
      if (reviewStatus) reviewStatus.disabled = !persisted;
      if (reviewNote) reviewNote.disabled = !persisted;
    }

    // Restore the saved report on page load so it remains a durable brand-level report.
    const savedReportNode = legalPage.querySelector('[data-saved-legal-report]');
    if (savedReportNode) {
      try {
        const savedReport = JSON.parse(savedReportNode.textContent || '{}');
        if (savedReport?.analysis) {
          renderLegalAnalysis(savedReport.analysis);
          resultPanel.hidden = false;
          if (reviewWorkflow) reviewWorkflow.hidden = false;
          setReportPersistence(true, 'Saved with this brand.');
        }
      } catch (_) {
        // Invalid saved JSON should not prevent the rest of Legal Kit from working.
      }
    }

    analyzeButton?.addEventListener('click', async () => {
      const selectedStandards = [...legalPage.querySelectorAll('[data-analysis-standard]:checked')].map(input => input.value);
      if (!selectedStandards.length) { analysisStatus.textContent = 'Select at least one framework to analyze.'; return; }
      const prior = analyzeButton.textContent;
      analysisStatus.textContent = 'Reviewing the selected brand content…';
      resultPanel.hidden = false;
      resultSummary.textContent = '';
      resultFindings.replaceChildren();
      setButtonLoading(analyzeButton, true, 'Analyzing brand…', prior);
      try {
        const response = await api('/api/legal/analyze', { method: 'POST', body: { brand_kit_id: selectedKitId, standards: selectedStandards } });
        renderLegalAnalysis(response.analysis || {});
        analysisStatus.textContent = 'Analysis complete.';
        resultPanel.focus?.({ preventScroll: true });
        if (reviewWorkflow) reviewWorkflow.hidden = false;
        setReviewStatus(response.review_status || 'analysis_ready');
        renderReviewHistory(response.review_history || []);
        setReportPersistence(Boolean(response.persisted), response.persistence_message || 'Report generated.');
      } catch (error) {
        resultSummary.textContent = 'The analysis could not be completed. Check the Gemini configuration and try again.';
        analysisStatus.textContent = 'The analysis could not be completed.';
      } finally { setButtonLoading(analyzeButton, false, '', prior); }
    });

    reviewForm?.addEventListener('submit', async event => {
      event.preventDefault();
      const prior = reviewSaveButton?.textContent || 'Save review update';
      if (reviewFeedback) reviewFeedback.textContent = '';
      if (reviewSaveButton) setButtonLoading(reviewSaveButton, true, 'Saving…', prior);
      try {
        const response = await api('/api/legal/review', { method: 'PUT', body: {
          brand_kit_id: selectedKitId,
          status: reviewStatus?.value || 'analysis_ready',
          note: reviewNote?.value.trim() || ''
        }});
        setReviewStatus(response.status);
        renderReviewHistory(response.history || []);
        if (reviewFeedback) reviewFeedback.textContent = 'Review update saved.';
        if (reviewNote) reviewNote.value = '';
        setReportPersistence(true, 'Review history saved with this brand.');
      } catch (_) {
        if (reviewFeedback) reviewFeedback.textContent = 'The update could not be saved. Check workspace storage and apply the brand review report migration.';
      } finally { if (reviewSaveButton) setButtonLoading(reviewSaveButton, false, '', prior); }
    });
  }

})();

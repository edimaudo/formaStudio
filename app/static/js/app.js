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

  document.querySelectorAll('[data-theme-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.themeChoice === root.dataset.theme)));
  document.querySelectorAll('[data-font-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.fontChoice === root.dataset.fontSize)));

  function openSettings(event) {
    if (!settingsPanel || !settingsBackdrop) return;
    previousSettingsFocus = event?.currentTarget || document.activeElement;
    settingsPanel.hidden = false;
    settingsBackdrop.hidden = false;
    const active = settingsPanel.querySelector(`[data-theme-choice="${root.dataset.theme}"]`);
    (active || settingsPanel.querySelector('button, input, select, textarea, a[href]'))?.focus();
  }
  function closeSettings() {
    if (!settingsPanel || !settingsBackdrop) return;
    settingsPanel.hidden = true;
    settingsBackdrop.hidden = true;
    previousSettingsFocus?.focus?.();
    previousSettingsFocus = null;
  }
  settingsOpeners.forEach(button => button.addEventListener('click', openSettings));
  closeSettingsButtons.forEach(button => button.addEventListener('click', closeSettings));
  settingsBackdrop?.addEventListener('click', closeSettings);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && settingsPanel && !settingsPanel.hidden) { closeSettings(); return; }
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

  document.querySelector('[data-mobile-menu]')?.addEventListener('click', event => {
    const nav = document.querySelector('.public-nav');
    if (!nav) return;
    const expanded = event.currentTarget.getAttribute('aria-expanded') === 'true';
    event.currentTarget.setAttribute('aria-expanded', String(!expanded));
    nav.classList.toggle('mobile-open', !expanded);
  });
  document.querySelector('[data-sidebar-toggle]')?.addEventListener('click', () => {
    document.querySelector('[data-sidebar]')?.classList.toggle('sidebar-open');
  });
  document.addEventListener('click', event => {
    const sidebar = document.querySelector('[data-sidebar]');
    const toggle = document.querySelector('[data-sidebar-toggle]');
    if (sidebar?.classList.contains('sidebar-open') && !sidebar.contains(event.target) && !toggle?.contains(event.target)) {
      sidebar.classList.remove('sidebar-open');
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
      return [...blockList.querySelectorAll('[data-block]')].map(block => ({
        id: block.dataset.blockId,
        type: block.dataset.blockType,
        title: block.querySelector('[data-block-title]')?.value || block.dataset.blockType,
        content: block.querySelector('[data-block-content]')?.value || '',
        asset_url: block.querySelector('[data-block-url]')?.value.trim() || ''
      }));
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

    editor.querySelector('[data-add-block]')?.addEventListener('click', () => {
      const type = editor.querySelector('[data-block-type]').value;
      const blockId = `block-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
      const card = document.createElement('article'); card.className = 'editable-block'; card.dataset.block = ''; card.dataset.blockId = blockId; card.dataset.blockType = type;
      const heading = document.createElement('div'); heading.className = 'block-card-heading';
      const typeLabel = document.createElement('div'); typeLabel.className = 'block-type-label';
      const count = document.createElement('span'); count.className = 'block-number'; count.textContent = String(blockList.children.length + 1).padStart(2, '0');
      const typeText = document.createElement('span'); typeText.textContent = type; typeLabel.append(count, typeText);
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-block-button'; remove.dataset.removeBlock = ''; remove.textContent = 'Remove'; remove.setAttribute('aria-label', `Remove ${type} block`);
      heading.append(typeLabel, remove); card.append(heading);
      card.append(makeLabelInput('Block title', 'input', 'data-block-title', defaultBlockTitle(type)));
      card.append(makeLabelInput('Content and usage notes', 'textarea', 'data-block-content', defaultBlockContent(type)));
      const assetLabel = makeLabelInput('Asset or reference URL (optional)', 'input', 'data-block-url', '');
      assetLabel.querySelector('input').type = 'text'; assetLabel.querySelector('input').placeholder = 'https://... or uploaded file'; assetLabel.querySelector('input').maxLength = 1500; card.append(assetLabel);
      const uploadDetails = document.createElement('details'); uploadDetails.className = 'asset-upload';
      const uploadSummary = document.createElement('summary'); uploadSummary.textContent = 'Upload a file'; uploadDetails.append(uploadSummary);
      const uploadControls = document.createElement('div'); uploadControls.className = 'asset-upload-controls';
      const uploadLabel = document.createElement('label'); uploadLabel.append(document.createTextNode('Choose a file (15 MB max)'));
      const fileInput = document.createElement('input'); fileInput.type = 'file'; fileInput.dataset.blockFile = ''; fileInput.accept = '.png,.jpg,.jpeg,.webp,.gif,.pdf,.mp4,.webm,.glb,.gltf,.woff,.woff2,.ttf,.otf,.svg,.zip,.docx,.pptx'; uploadLabel.append(fileInput);
      const uploadButton = document.createElement('button'); uploadButton.type = 'button'; uploadButton.className = 'button button-secondary button-small'; uploadButton.dataset.uploadAsset = ''; uploadButton.textContent = 'Upload file';
      const uploadFeedback = document.createElement('p'); uploadFeedback.dataset.uploadFeedback = ''; uploadFeedback.setAttribute('role', 'status'); uploadFeedback.setAttribute('aria-live', 'polite');
      uploadControls.append(uploadLabel, uploadButton, uploadFeedback); uploadDetails.append(uploadControls); card.append(uploadDetails);
      const foot = document.createElement('div'); foot.className = 'block-card-foot';
      const note = document.createElement('span'); note.textContent = 'Changes are saved to this kit, not to external files.';
      const orders = document.createElement('div'); orders.className = 'block-order-actions';
      for (const [direction, symbol, label] of [['up', '↑', 'Move block up'], ['down', '↓', 'Move block down']]) { const button = document.createElement('button'); button.type = 'button'; button.dataset.moveBlock = direction; button.textContent = symbol; button.setAttribute('aria-label', label); orders.append(button); }
      foot.append(note, orders); card.append(foot); blockList.append(card); card.scrollIntoView({ behavior: 'smooth', block: 'center' }); card.querySelector('[data-block-title]')?.focus({ preventScroll: true });
    });
    function defaultBlockTitle(type) { return ({ Colors: 'Core palette', Typography: 'Type system', Logos: 'Logo suite', Visuals: 'Visual direction', Videos: 'Motion and video', Icons: 'Icon system', '3D Models': 'Spatial assets', Collaterals: 'Brand applications', Resources: 'Guides and resources', 'Brand Story': 'Brand story' })[type] || type; }
    function defaultBlockContent(type) { return ({ Colors: 'Add hex values and notes on where each color should be used.', Typography: 'Add typefaces, weights, hierarchy, and usage guidance.', Logos: 'Describe approved variations and clear-space rules.', Visuals: 'Describe photography, illustration, art direction, and image usage.', Videos: 'Add motion principles, examples, and video links.', Icons: 'Add icon style, stroke, scale, and usage guidance.', '3D Models': 'Add 3D assets and notes for rendering or handoff.', Collaterals: 'Add packaging, stationery, campaign, or social applications.', Resources: 'Add source files, guidelines, templates, and reference material.', 'Brand Story': 'Tell the story behind the brand in clear, distinctive language.' })[type] || ''; }
    function makeLabelInput(labelText, tagName, dataAttribute, value) {
      const label = document.createElement('label'); label.append(document.createTextNode(labelText));
      const element = document.createElement(tagName); element.setAttribute(dataAttribute, ''); element.value = value;
      if (tagName === 'textarea') element.rows = 3;
      else element.maxLength = dataAttribute === 'data-block-url' ? 1500 : 140;
      label.append(element); return label;
    }
    blockList?.addEventListener('click', async event => {
      const upload = event.target.closest('[data-upload-asset]');
      if (upload) {
        const card = upload.closest('[data-block]');
        const fileInput = card?.querySelector('[data-block-file]');
        const status = card?.querySelector('[data-upload-feedback]');
        const file = fileInput?.files?.[0];
        if (!file) { if (status) status.textContent = 'Choose a file first.'; return; }
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
          const urlInput = card.querySelector('[data-block-url]');
          if (urlInput) urlInput.value = result.asset_url;
          if (status) status.textContent = `${result.filename} uploaded. Save changes to attach it to this kit.`;
        } catch (error) { if (status) status.textContent = error.message; }
        finally { upload.disabled = false; upload.removeAttribute('aria-busy'); upload.textContent = previousText; }
        return;
      }
      const remove = event.target.closest('[data-remove-block]');
      if (remove) { remove.closest('[data-block]')?.remove(); [...blockList.querySelectorAll('[data-block]')].forEach((node, index) => { const n = node.querySelector('.block-number'); if (n) n.textContent = String(index + 1).padStart(2, '0'); }); return; }
      const move = event.target.closest('[data-move-block]');
      if (!move) return;
      const current = move.closest('[data-block]');
      if (move.dataset.moveBlock === 'up' && current.previousElementSibling) blockList.insertBefore(current, current.previousElementSibling);
      if (move.dataset.moveBlock === 'down' && current.nextElementSibling) blockList.insertBefore(current.nextElementSibling, current);
      [...blockList.querySelectorAll('[data-block]')].forEach((node, index) => { const n = node.querySelector('.block-number'); if (n) n.textContent = String(index + 1).padStart(2, '0'); });
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
      if (!field) return;
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
          key_points: [description, existingTagline ? `Current tagline: ${existingTagline}` : '', existingPitch && target !== 'elevator_pitch' ? `Current elevator pitch: ${existingPitch}` : ''].filter(Boolean).join('\n')
        }});
        field.value = result.copy;
        if (status) status.textContent = 'Draft added. Review it, then save the kit.';
        if (feedback) feedback.textContent = `${task} drafted. Save changes to keep it.`;
      } catch (error) {
        if (status) status.textContent = error.message;
      } finally {
        setButtonLoading(button, false, '', prior);
      }
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
      let story = [...blockList.querySelectorAll('[data-block]')].find(block => block.dataset.blockType === 'Brand Story');
      if (!story) { editor.querySelector('[data-block-type]').value = 'Brand Story'; editor.querySelector('[data-add-block]').click(); story = [...blockList.querySelectorAll('[data-block]')].at(-1); }
      story.querySelector('[data-block-content]').value = copy;
      if (feedback) feedback.textContent = 'Copy added to the Brand Story block. Save to keep it.';
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

  document.querySelectorAll('[data-legal-entry]').forEach(card => {
    card.querySelector('[data-save-legal]')?.addEventListener('click', async event => {
      const button = event.currentTarget; const feedback = card.querySelector('[data-legal-feedback]'); const prior = button.textContent;
      setButtonLoading(button, true, 'Saving…', prior);
      try {
        const result = await api(`/api/legal/${encodeURIComponent(card.dataset.entryId)}`, { method: 'PUT', body: {
          status: card.querySelector('[data-legal-status]').value,
          document_url: card.querySelector('[data-legal-url]').value.trim(),
          access_mode: card.querySelector('[data-legal-access]').value,
          notes: card.querySelector('[data-legal-notes]').value
        }});
        if (feedback) feedback.textContent = 'Saved.';
        const label = card.querySelector('[data-legal-status-label]');
        if (label) { label.textContent = result.entry.status.replaceAll('_', ' '); label.classList.toggle('status-live', ['documented', 'verified'].includes(result.entry.status)); label.classList.toggle('status-draft', !['documented', 'verified'].includes(result.entry.status)); }
      } catch (error) { if (feedback) feedback.textContent = error.message; }
      finally { setButtonLoading(button, false, '', prior); }
    });
  });
})();

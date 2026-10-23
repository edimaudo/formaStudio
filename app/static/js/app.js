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

  document.querySelectorAll('[data-guided-create]').forEach(form => {
    const questionFlow = form.querySelector('[data-guided-questions]');
    const reviewPanel = form.querySelector('[data-guided-review]');
    const steps = [...form.querySelectorAll('[data-guided-step]')];
    const backButton = form.querySelector('[data-guided-back]');
    const nextButton = form.querySelector('[data-guided-next]');
    const buildStrategyButton = form.querySelector('[data-guided-build-strategy]');
    const status = form.querySelector('[data-guided-status]');
    const stepLabel = form.querySelector('[data-guided-step-label]');
    const stepTopic = form.querySelector('[data-guided-step-topic]');
    const progress = form.querySelector('[data-guided-progress]');
    const topics = ['Starting point', 'Audience', 'Value', 'Differentiation', 'Personality', 'Voice'];
    if (!questionFlow || !reviewPanel || !steps.length) return;
    let currentStep = Math.max(0, steps.findIndex(step => !step.hidden));
    const initiallyReviewing = form.dataset.guidedStage === 'review' && !reviewPanel.hidden;

    function showStep(index, focus = false) {
      currentStep = Math.max(0, Math.min(steps.length - 1, index));
      steps.forEach((step, i) => { step.hidden = i !== currentStep; });
      if (stepLabel) stepLabel.textContent = `Question ${currentStep + 1} of ${steps.length}`;
      if (stepTopic) stepTopic.textContent = topics[currentStep] || 'Brand strategy';
      if (progress) {
        progress.setAttribute('aria-valuenow', String(currentStep + 1));
        const fill = progress.querySelector('span');
        if (fill) fill.style.width = `${((currentStep + 1) / steps.length) * 100}%`;
      }
      if (backButton) backButton.disabled = currentStep === 0;
      if (nextButton) nextButton.hidden = currentStep === steps.length - 1;
      if (buildStrategyButton) buildStrategyButton.hidden = currentStep !== steps.length - 1;
      if (focus) steps[currentStep].querySelector('textarea, input, select')?.focus();
    }
    function showQuestions(step = currentStep, focus = true) {
      reviewPanel.hidden = true;
      questionFlow.hidden = false;
      form.dataset.guidedStage = 'questions';
      if (status) status.textContent = '';
      showStep(step, focus);
    }
    function currentStepIsValid() {
      const control = steps[currentStep]?.querySelector('textarea, input, select');
      if (!control) return true;
      if (control.required && !control.value.trim()) {
        control.reportValidity();
        return false;
      }
      if (!control.checkValidity()) {
        control.reportValidity();
        return false;
      }
      return true;
    }
    if (initiallyReviewing) {
      questionFlow.hidden = true;
      reviewPanel.hidden = false;
    } else {
      reviewPanel.hidden = true;
      questionFlow.hidden = false;
      showStep(currentStep);
    }
    nextButton?.addEventListener('click', () => {
      if (!currentStepIsValid()) return;
      showStep(currentStep + 1, true);
    });
    backButton?.addEventListener('click', () => showStep(currentStep - 1, true));
    form.querySelectorAll('[data-guided-edit-answers]').forEach(button => button.addEventListener('click', () => showQuestions(0, true)));

    form.addEventListener('submit', async event => {
      if (form.dataset.guidedStage === 'review' && !reviewPanel.hidden) return;
      event.preventDefault();
      if (!currentStepIsValid()) return;
      if (currentStep < steps.length - 1) {
        showStep(currentStep + 1, true);
        return;
      }
      const button = buildStrategyButton;
      const prior = button?.textContent || 'Develop brand strategy';
      if (button) setButtonLoading(button, true, 'Developing strategy…', prior);
      if (status) status.textContent = 'Synthesizing your answers into a proposed positioning, audience, value proposition, personality, and differentiation.';
      try {
        const answers = Object.fromEntries(['project_name', 'idea', 'audience', 'promise', 'difference', 'feeling', 'tone'].map(key => [key, form.querySelector(`[name="${key}"]`)?.value?.trim() || '']));
        const response = await api('/api/ai/brand-strategy', { method: 'POST', body: answers });
        const strategy = response.strategy || {};
        const fields = {
          positioning: 'strategy_positioning',
          primary_audience: 'strategy_audience',
          value_proposition: 'strategy_value_proposition',
          brand_personality: 'strategy_personality',
          differentiation: 'strategy_differentiation'
        };
        Object.entries(fields).forEach(([key, name]) => {
          const input = form.querySelector(`[name="${name}"]`);
          if (input) input.value = String(strategy[key] || '');
        });
        questionFlow.hidden = true;
        reviewPanel.hidden = false;
        form.dataset.guidedStage = 'review';
        if (status) status.textContent = 'Strategy ready to review. Edit any field before creating the brand kit.';
        reviewPanel.querySelector('h3')?.setAttribute('tabindex', '-1');
        reviewPanel.querySelector('h3')?.focus({ preventScroll: true });
      } catch (error) {
        if (status) status.textContent = error.message;
      } finally {
        if (button) setButtonLoading(button, false, '', prior);
        // The final submit button is not used while strategy review is open.
      }
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

    const preferredBodyFonts = {
      'Inter':'Source Serif 4','Roboto':'Merriweather','Open Sans':'Libre Baskerville','Lato':'Merriweather',
      'Montserrat':'Lora','Poppins':'Inter','Source Sans 3':'Source Serif 4','Nunito Sans':'Lora',
      'Work Sans':'Source Serif 4','DM Sans':'DM Serif Display','Manrope':'Literata','IBM Plex Sans':'Source Serif 4',
      'Source Serif 4':'Source Sans 3','Merriweather':'Lato','Playfair Display':'Inter','Libre Baskerville':'Open Sans',
      'Lora':'Nunito Sans','DM Serif Display':'DM Sans','Cormorant Garamond':'Inter','Fraunces':'DM Sans',
      'Bricolage Grotesque':'Source Sans 3','Space Grotesk':'Inter','Sora':'Source Sans 3','Outfit':'Lato',
      'Urbanist':'Source Sans 3','Plus Jakarta Sans':'Lora','Figtree':'Source Serif 4','Rubik':'Lora',
      'Karla':'Libre Baskerville','Cabin':'Lora','Archivo':'Merriweather','Josefin Sans':'Lora',
      'Raleway':'Merriweather','Oswald':'Source Sans 3','Bebas Neue':'Inter','Anton':'Open Sans',
      'IBM Plex Mono':'IBM Plex Sans','Space Mono':'DM Sans','JetBrains Mono':'Inter','Inconsolata':'Inter',
      'Fira Sans':'Lora','Noto Sans':'Noto Serif','Noto Serif':'Noto Sans','Spectral':'Figtree',
      'Crimson Pro':'Manrope','Alegreya':'Work Sans','Literata':'Inter','Gabarito':'Source Serif 4',
      'Epilogue':'Lora','Prata':'DM Sans'
    };
    const countryRegions = {
      'Canada': ['Alberta','British Columbia','Manitoba','New Brunswick','Newfoundland and Labrador','Northwest Territories','Nova Scotia','Nunavut','Ontario','Prince Edward Island','Quebec','Saskatchewan','Yukon'],
      'United States': ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','District of Columbia','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming']
    };
    function selectedColorValues() {
      const colorBlock = [...editor.querySelectorAll('[data-block]')].find(block => block.dataset.blockType === 'Colors');
      return [...(colorBlock?.querySelectorAll('[data-color-row]') || [])]
        .map(row => row.querySelector('[data-color-hex]')?.value.trim().toUpperCase() || '')
        .filter(hex => /^#[0-9A-F]{6}$/.test(hex));
    }
    function safeFontFamily(value, fallback) {
      const font = String(value || '').replace(/["'\\;]/g, '').trim();
      return font ? `"${font}", ${fallback}` : fallback;
    }
    function syncTypographyPreview(block, headingChanged = false) {
      const headingSelect = block.querySelector('[data-typography-field="heading_font"]');
      const bodySelect = block.querySelector('[data-typography-field="body_font"]');
      const accentSelect = block.querySelector('[data-typography-field="accent_font"]');
      if (!headingSelect || !bodySelect) return;
      if (headingChanged && bodySelect.dataset.bodyAuto !== 'false') {
        bodySelect.value = preferredBodyFonts[headingSelect.value] || 'Inter';
        bodySelect.dataset.bodyAuto = 'true';
      }
      const headingFont = headingSelect.value || 'Playfair Display';
      const bodyFont = bodySelect.value || preferredBodyFonts[headingFont] || 'Inter';
      const titleSample = block.querySelector('[data-type-preview-headline]');
      const bodySample = block.querySelector('[data-type-preview-body]');
      const guidance = block.querySelector('[data-type-pair-guidance]');
      const brandName = editor.querySelector('[data-field="brand_name"]')?.value.trim() || 'Your Brand Name';
      if (titleSample) { titleSample.textContent = brandName; titleSample.style.fontFamily = safeFontFamily(headingFont, 'serif'); }
      if (bodySample) bodySample.style.fontFamily = safeFontFamily(bodyFont, 'sans-serif');
      if (guidance) guidance.textContent = `Suggested pairing: ${headingFont} with ${bodyFont}. Both choices remain editable.`;
    }
    function syncLogoPreviews() {
      const brandName = editor.querySelector('[data-field="brand_name"]')?.value.trim() || 'Your Brand';
      const colors = selectedColorValues();
      const primary = colors[0] || '#354F45';
      const accent = colors[2] || colors[1] || '#C97856';
      const typography = [...editor.querySelectorAll('[data-block]')].find(block => block.dataset.blockType === 'Typography');
      const headlineFont = typography?.querySelector('[data-typography-field="heading_font"]')?.value || 'Playfair Display';
      editor.querySelectorAll('[data-block-type="Logos"]').forEach(block => {
        const selectedInput = block.querySelector('[data-logo-direction]:checked');
        const selected = selectedInput?.value || 'wordmark';
        block.querySelectorAll('[data-logo-direction]').forEach(input => {
          const option = input.closest('.logo-template-option');
          if (option) option.classList.toggle('is-selected', input.checked);
        });
        block.querySelectorAll('[data-logo-kind]').forEach(preview => {
          preview.style.setProperty('--logo-primary', primary);
          preview.style.setProperty('--logo-accent', accent);
          preview.style.setProperty('--logo-font', safeFontFamily(headlineFont, 'serif'));
          const kind = preview.dataset.logoKind;
          const symbol = preview.querySelector('.logo-template-symbol');
          const name = preview.querySelector('[data-logo-sample-name]');
          if (name) name.textContent = brandName;
          if (symbol) {
            symbol.textContent = kind === 'emblem' ? '✳' : (kind === 'monogram' || kind === 'combination' ? brandName.slice(0, 1).toUpperCase() : '');
            symbol.hidden = !symbol.textContent;
          }
        });
        const live = block.querySelector('[data-logo-lockup]');
        if (live) {
          live.dataset.logoKind = selected;
          live.style.setProperty('--logo-primary', primary);
          live.style.setProperty('--logo-accent', accent);
          live.style.setProperty('--logo-font', safeFontFamily(headlineFont, 'serif'));
        }
        const liveSymbol = block.querySelector('[data-logo-live-symbol]');
        const liveName = block.querySelector('[data-logo-live-name]');
        if (liveSymbol) {
          liveSymbol.textContent = selected === 'emblem' ? '✳' : (selected === 'monogram' || selected === 'combination' ? brandName.slice(0,1).toUpperCase() : '');
          liveSymbol.hidden = !liveSymbol.textContent;
        }
        if (liveName) liveName.textContent = brandName;
      });
    }
    function initializeTypographyAndLogos() {
      editor.querySelectorAll('[data-block-type="Typography"]').forEach(block => {
        const bodySelect = block.querySelector('[data-typography-field="body_font"]');
        if (bodySelect && bodySelect.dataset.bodyAuto !== 'false') {
          bodySelect.dataset.bodyAuto = bodySelect.dataset.bodyAuto || 'true';
          syncTypographyPreview(block, true);
        } else syncTypographyPreview(block);
        block.querySelector('[data-typography-field="heading_font"]')?.addEventListener('change', () => { syncTypographyPreview(block, true); syncLogoPreviews(); renderFinalPreview(); });
        bodySelect?.addEventListener('change', () => { bodySelect.dataset.bodyAuto = 'false'; syncTypographyPreview(block); syncLogoPreviews(); renderFinalPreview(); });
        block.querySelector('[data-typography-field="accent_font"]')?.addEventListener('change', () => { syncTypographyPreview(block); renderFinalPreview(); });
      });
      editor.querySelectorAll('[data-logo-direction]').forEach(input => input.addEventListener('change', () => { syncLogoPreviews(); renderFinalPreview(); }));
      syncLogoPreviews();
    }
    function initializeMarketSelectors() {
      const country = editor.querySelector('[data-culture-country]');
      const region = editor.querySelector('[data-culture-region]');
      const market = editor.querySelector('[data-culture-market]');
      if (!country || !region || !market) return;
      function updateMarket(rebuild = false) {
        const values = countryRegions[country.value] || countryRegions.Canada;
        if (rebuild) {
          const preferred = country.value === 'Canada' ? 'Ontario' : 'California';
          region.replaceChildren();
          values.forEach(name => { const option = document.createElement('option'); option.value = name; option.textContent = name; region.append(option); });
          region.value = values.includes(preferred) ? preferred : values[0];
        }
        market.value = `${country.value}, ${region.value}`;
      }
      updateMarket();
      country.addEventListener('change', () => { updateMarket(true); });
      region.addEventListener('change', () => updateMarket(false));
    }
    initializeMarketSelectors();

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
          data.logo_direction = block.querySelector('[data-logo-direction]:checked')?.value || 'wordmark';
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
        cultural_country: editor.querySelector('[data-field="cultural_country"]')?.value || 'Canada',
        cultural_region: editor.querySelector('[data-field="cultural_region"]')?.value || 'Ontario',
        blocks: blockData(),
        access_mode: editor.querySelector('[data-field="access_mode"]').value,
        access_password: editor.querySelector('#access-password')?.value || '',
        allowed_emails_text: editor.querySelector('#allowed-emails')?.value || ''
      };
    }
    async function saveKit({ quiet = false, auto = false } = {}) {
      if (!editor.querySelector('[data-field="name"]').value.trim()) throw new Error('Add a project name before saving.');
      if (feedback && !auto && !quiet) feedback.textContent = 'Saving changes…';
      const result = await api(`/api/kits/${encodeURIComponent(kitId)}`, { method: 'PUT', body: kitData() });
      saved = true;
      if (shareUrl && result.share_url) shareUrl.value = result.share_url;
      const openShare = editor.querySelector('[data-open-share]');
      if (openShare && result.share_url) openShare.href = result.share_url;
      if (feedback && !auto) feedback.textContent = quiet ? '' : 'Changes saved.';
      if (!auto) editor.querySelectorAll('[data-share-status]').forEach(node => node.textContent = 'Saved · link stays the same');
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
      if (event.target.matches('[data-field="brand_name"], [data-color-picker], [data-color-hex], [data-color-name], [data-logo-brief], [data-block-content]')) syncLogoPreviews();
      if (event.target.matches('[data-field="brand_name"]')) editor.querySelectorAll('[data-block-type="Typography"]').forEach(block => syncTypographyPreview(block));
      if (event.target.matches('[data-field="tagline"], [data-field="elevator_pitch"]')) {
        const positioning = editor.querySelector('#copy-positioning');
        if (positioning && positioning.dataset.userEdited !== 'true') positioning.value = [editor.querySelector('[data-field="tagline"]')?.value.trim(), editor.querySelector('[data-field="elevator_pitch"]')?.value.trim()].filter(Boolean).join('\n\n');
      }
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
      const brandName = value('[data-field="brand_name"]') || value('[data-field="name"]') || 'Your brand';
      setText('[data-preview-brand]', brandName);
      setText('[data-preview-tagline]', value('[data-field="tagline"]'));
      setText('[data-preview-pitch]', value('[data-field="elevator_pitch"]'));
      setText('[data-preview-industry]', value('[data-field="industry"]'));
      setText('[data-preview-audience]', value('[data-field="audience"]'));
      const categoryWrap = preview.querySelector('[data-preview-category-wrap]');
      const audienceWrap = preview.querySelector('[data-preview-audience-wrap]');
      if (categoryWrap) categoryWrap.hidden = !value('[data-field="industry"]');
      if (audienceWrap) audienceWrap.hidden = !value('[data-field="audience"]');
      const shareBrand = editor.querySelector('[data-share-card-brand]'); if (shareBrand) shareBrand.textContent = brandName;
      const shareDescription = editor.querySelector('[data-share-card-description]'); if (shareDescription) shareDescription.textContent = value('[data-field="tagline"]') || 'The identity and message for this brand.';

      const palette = preview.querySelector('[data-preview-palette]');
      let paletteCount = 0;
      if (palette) {
        palette.replaceChildren();
        const colorBlock = [...editor.querySelectorAll('[data-block]')].find(block => block.dataset.blockType === 'Colors');
        const rows = [...(colorBlock?.querySelectorAll('[data-color-row]') || [])];
        rows.forEach(row => {
          const hex = row.querySelector('[data-color-hex]')?.value.trim() || '';
          const name = row.querySelector('[data-color-name]')?.value.trim() || 'Color';
          if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
          const item = document.createElement('div'); const chip = document.createElement('span'); chip.style.backgroundColor = hex; chip.setAttribute('aria-hidden', 'true');
          const label = document.createElement('strong'); label.textContent = name; const code = document.createElement('code'); code.textContent = hex.toUpperCase();
          item.append(chip, label, code); palette.append(item); paletteCount += 1;
        });
      }
      const paletteSection = preview.querySelector('[data-preview-palette-section]');
      if (paletteSection) paletteSection.hidden = paletteCount === 0;

      const blocks = preview.querySelector('[data-preview-blocks]');
      let populatedBlockCount = 0;
      if (blocks) {
        blocks.replaceChildren();
        [...editor.querySelectorAll('[data-block]')].filter(block => !['3D Models', 'Collaterals', 'Brand Story', 'Colors'].includes(block.dataset.blockType)).forEach(block => {
          const type = block.dataset.blockType;
          const titleText = block.querySelector('[data-block-title]')?.value?.trim() || block.querySelector('.block-card-heading h3')?.textContent?.trim() || type;
          const details = [];
          const content = block.querySelector('[data-block-content]')?.value?.trim() || '';
          if (type === 'Typography') {
            [['Heading', 'heading_font'], ['Body', 'body_font'], ['Accent', 'accent_font']].forEach(([label, key]) => { const text = block.querySelector(`[data-typography-field="${key}"]`)?.value.trim(); if (text) details.push(`${label}: ${text}`); });
          } else if (type === 'Logos') {
            const direction = block.querySelector('[data-logo-direction]')?.value || '';
            const brief = block.querySelector('[data-logo-brief]')?.value.trim() || '';
            if (direction && direction !== 'explore') details.push(`Direction: ${direction}`);
            if (brief) details.push(brief);
          } else if (type === 'Visuals') {
            [['Photography', 'photography'], ['Lighting', 'lighting'], ['Texture', 'texture']].forEach(([label, key]) => { const text = block.querySelector(`[data-visual-field="${key}"]`)?.value.trim(); if (text) details.push(`${label}: ${text}`); });
          } else if (type === 'Videos') {
            [['Pace', 'pace'], ['Editing', 'editing']].forEach(([label, key]) => { const text = block.querySelector(`[data-motion-field="${key}"]`)?.value.trim(); if (text) details.push(`${label}: ${text}`); });
          } else if (type === 'Icons') {
            [['Form', 'form'], ['Density', 'density']].forEach(([label, key]) => { const text = block.querySelector(`[data-icon-field="${key}"]`)?.value.trim(); if (text) details.push(`${label}: ${text}`); });
          }
          if (content) details.push(content);
          const url = block.querySelector('[data-block-url]')?.value.trim() || '';
          if (url) details.push(`Reference: ${url}`);
          if (!details.length) return;
          const card = document.createElement('article'); card.dataset.previewType = type;
          const title = document.createElement('strong'); title.textContent = titleText;
          const paragraph = document.createElement('p'); paragraph.textContent = details.join(' · ');
          card.append(title, paragraph); blocks.append(card); populatedBlockCount += 1;
        });
      }
      const componentsSection = preview.querySelector('[data-preview-components-section]');
      if (componentsSection) componentsSection.hidden = populatedBlockCount === 0;

      const storyBlock = [...editor.querySelectorAll('[data-block]')].find(block => block.dataset.blockType === 'Brand Story');
      const storyValue = storyBlock?.querySelector('[data-block-content]')?.value.trim() || '';
      setText('[data-preview-story]', storyValue);
      const storySection = preview.querySelector('[data-preview-story-section]');
      if (storySection) storySection.hidden = !storyValue;

      const cultureMarket = value('#culture-market');
      const cultureResults = editor.querySelector('[data-culture-results]');
      const culturePlaceholder = cultureResults?.querySelector('.culture-placeholder');
      const generatedCulture = !culturePlaceholder ? cultureResults?.innerText?.trim() || '' : '';
      const cultureSummary = [cultureMarket ? `Market: ${cultureMarket}` : '', generatedCulture].filter(Boolean).join('\n\n');
      setText('[data-preview-culture]', cultureSummary);
      const cultureSection = preview.querySelector('[data-preview-culture-section]');
      if (cultureSection) cultureSection.hidden = !cultureSummary;
    }
    renderFinalPreview();
    initializeTypographyAndLogos();

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
      const output = editor.querySelector(`[data-generated-output="${target}"]`);
      const descriptionField = editor.querySelector(`[data-generation-description="${target}"]`);
      const status = editor.querySelector(`[data-generation-status="${target}"]`);
      const brief = descriptionField?.value.trim() || '';
      if (brief.length < 8) {
        if (status) status.textContent = 'Add a description before generating a draft.';
        descriptionField?.focus();
        return;
      }
      const prior = button.textContent;
      setButtonLoading(button, true, 'Writing…', prior);
      if (status) status.textContent = 'Building a draft from your description and brand context…';
      try {
        const storyDraft = editor.querySelector('[data-block-type="Brand Story"] [data-block-content]')?.value.trim() || '';
        const existingTagline = editor.querySelector('[data-field="tagline"]')?.value.trim() || '';
        const existingPitch = editor.querySelector('[data-field="elevator_pitch"]')?.value.trim() || '';
        const result = await api('/api/ai/copy', { method: 'POST', body: {
          task,
          brand_name: editor.querySelector('[data-field="brand_name"]').value,
          industry: editor.querySelector('[data-field="industry"]').value,
          audience: editor.querySelector('[data-field="audience"]').value,
          positioning: [brief, existingTagline, existingPitch, storyDraft].filter(Boolean).join('\n').slice(0, 1600),
          tone: 'Clear, distinctive and human',
          key_points: [brief, existingTagline ? `Current tagline: ${existingTagline}` : '', existingPitch && target !== 'elevator_pitch' ? `Current elevator pitch: ${existingPitch}` : '', storyDraft ? `Brand story context: ${storyDraft}` : ''].filter(Boolean).join('\n').slice(0, 6000)
        }});
        if (output) output.value = result.copy;
        const applyButton = editor.querySelector(`[data-apply-generated="${target}"]`);
        if (applyButton) applyButton.disabled = !result.copy.trim();
        if (status) status.textContent = 'Draft ready. Review or edit it before using it.';
      } catch (error) {
        if (status) status.textContent = error.message;
      } finally {
        setButtonLoading(button, false, '', prior);
      }
    }));

    editor.querySelectorAll('[data-generated-output]').forEach(output => output.addEventListener('input', () => {
      const button = editor.querySelector(`[data-apply-generated="${output.dataset.generatedOutput}"]`);
      if (button) button.disabled = !output.value.trim();
    }));
    editor.querySelectorAll('[data-apply-generated]').forEach(button => button.addEventListener('click', () => {
      const target = button.dataset.applyGenerated;
      const generated = editor.querySelector(`[data-generated-output="${target}"]`)?.value.trim() || '';
      const field = editor.querySelector(`[data-field="${target}"]`);
      if (!generated || !field) return;
      field.value = generated;
      renderFinalPreview();
      const status = editor.querySelector(`[data-generation-status="${target}"]`);
      if (status) status.textContent = 'Draft applied. It will be saved automatically when you move to another tab.';
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }));

    editor.querySelectorAll('[data-message-mode]').forEach(button => button.addEventListener('click', () => {
      const target = button.dataset.messageMode;
      const prefix = target.startsWith('tagline-') ? 'tagline' : 'pitch';
      editor.querySelectorAll(`[data-message-mode^="${prefix}-"]`).forEach(choice => {
        const active = choice === button;
        choice.classList.toggle('active', active);
        choice.setAttribute('aria-pressed', String(active));
      });
      editor.querySelectorAll(`[data-message-mode-panel^="${prefix}-"]`).forEach(panel => {
        panel.hidden = panel.dataset.messageModePanel !== target;
      });
    }));

    const reframeButton = editor.querySelector('[data-reframe-story]');
    reframeButton?.addEventListener('click', async () => {
      const story = editor.querySelector('[data-block-type="Brand Story"] [data-block-content]');
      const draft = story?.value.trim() || '';
      const status = editor.querySelector('[data-reframe-status]');
      if (draft.length < 12) {
        if (status) status.textContent = 'Write a little more of the story before asking for help reframing it.';
        story?.focus();
        return;
      }
      const prior = reframeButton.textContent;
      setButtonLoading(reframeButton, true, 'Reframing…', prior);
      if (status) status.textContent = 'Improving the flow while preserving your meaning…';
      try {
        const result = await api('/api/ai/copy', { method: 'POST', body: {
          task: 'Reframe brand story', brand_name: editor.querySelector('[data-field="brand_name"]').value,
          industry: editor.querySelector('[data-field="industry"]').value,
          audience: editor.querySelector('[data-field="audience"]').value,
          positioning: [editor.querySelector('[data-field="tagline"]')?.value, editor.querySelector('[data-field="elevator_pitch"]')?.value].filter(Boolean).join('\n'),
          source_story_draft: draft, tone: 'Preserve the original voice; make the narrative more cohesive'
        }});
        const resultPanel = editor.querySelector('[data-reframed-result]');
        const output = editor.querySelector('[data-reframed-story]');
        if (output) output.value = result.copy;
        if (resultPanel) resultPanel.hidden = false;
        if (status) status.textContent = 'Reframed draft ready. Review it before applying.';
      } catch (error) {
        if (status) status.textContent = error.message;
      } finally {
        setButtonLoading(reframeButton, false, '', prior);
      }
    });
    editor.querySelector('[data-apply-reframed-story]')?.addEventListener('click', () => {
      const output = editor.querySelector('[data-reframed-story]')?.value.trim() || '';
      const story = editor.querySelector('[data-block-type="Brand Story"] [data-block-content]');
      if (!output || !story) return;
      story.value = output;
      story.dispatchEvent(new Event('input', { bubbles: true }));
      renderFinalPreview();
      const status = editor.querySelector('[data-reframe-status]');
      if (status) status.textContent = 'Reframed story applied. It will be saved automatically when you move to another tab.';
    });

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
          task: 'Logo concept recommendations', brand_name: editor.querySelector('[data-field="brand_name"]').value,
          industry: editor.querySelector('[data-field="industry"]').value, audience: editor.querySelector('[data-field="audience"]').value,
          positioning: [editor.querySelector('[data-field="tagline"]').value, editor.querySelector('[data-field="elevator_pitch"]').value].filter(Boolean).join('\n'),
          tone: block.querySelector('[data-logo-direction]:checked')?.value || 'wordmark',
          key_points: [brief, `Color palette: ${selectedColorValues().join(', ')}`, `Headline font: ${editor.querySelector('[data-block-type="Typography"] [data-typography-field="heading_font"]')?.value || 'not selected'}`, `Body font: ${editor.querySelector('[data-block-type="Typography"] [data-typography-field="body_font"]')?.value || 'not selected'}`, 'Return three distinct, usable logo concept directions that work with the supplied colors and type system.'].join('\n').slice(0, 1400)
        }});
        block.querySelector('[data-block-content]').value = result.copy; renderFinalPreview();
        if (status) status.textContent = 'Direction generated. Edit it before saving.';
      } catch (error) { if (status) status.textContent = error.message; }
      finally { setButtonLoading(button, false, '', prior); }
    }));

    const cultureButton = editor.querySelector('[data-get-culture]');
    cultureButton?.addEventListener('click', async () => {
      const results = editor.querySelector('[data-culture-results]');
      if (!editor.querySelector('[data-field="industry"]')?.value.trim() || !editor.querySelector('[data-field="audience"]')?.value.trim()) {
        results.replaceChildren();
        const message = document.createElement('p');
        message.textContent = 'Choose a category and primary audience in Brand Definition before analyzing a market.';
        results.append(message);
        return;
      }
      const prior = cultureButton.textContent;
      setButtonLoading(cultureButton, true, 'Analyzing messaging…', prior);
      results.replaceChildren(); const loading = document.createElement('p'); loading.textContent = 'Checking for relevant cultural signals…'; results.append(loading);
      try {
        const response = await api('/api/ai/culture', { method: 'POST', body: {
          brand_name: editor.querySelector('[data-field="brand_name"]').value,
          industry: editor.querySelector('[data-field="industry"]').value,
          audience: editor.querySelector('[data-field="audience"]').value,
          market: editor.querySelector('#culture-market').value,
          values: '',
          positioning: [editor.querySelector('[data-field="tagline"]')?.value, editor.querySelector('[data-field="elevator_pitch"]')?.value].filter(Boolean).join('\n').slice(0, 1000),
          brand_story: ([...editor.querySelectorAll('[data-block]')].find(block => block.dataset.blockType === 'Brand Story')?.querySelector('[data-block-content]')?.value || '').slice(0, 1800)
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
      finally { renderFinalPreview(); setButtonLoading(cultureButton, false, '', prior); }
    });

    // Main and messaging tabs save the current state before switching panels.
    const editorTabs = [...editor.querySelectorAll('[data-editor-tab]')];
    const editorPanels = [...editor.querySelectorAll('[data-editor-panel]')];
    let tabSwitchInProgress = false;
    function activateEditorTab(tab, focus = false) {
      const selected = tab.dataset.editorTab;
      editorTabs.forEach(item => {
        const active = item === tab;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
      });
      editorPanels.forEach(panel => { panel.hidden = panel.dataset.editorPanel !== selected; });
      if (focus) tab.focus();
    }
    async function switchEditorTab(tab, focus = false) {
      if (!tab || tabSwitchInProgress || tab.getAttribute('aria-selected') === 'true') return;
      tabSwitchInProgress = true;
      try {
        await saveKit({ quiet: true, auto: true });
        activateEditorTab(tab, focus);
      } catch (error) {
        if (feedback) feedback.textContent = `Auto-save failed. Staying on this tab: ${error.message}`;
      } finally { tabSwitchInProgress = false; }
    }
    const initialEditorTab = editorTabs.find(tab => tab.getAttribute('aria-selected') === 'true') || editorTabs[0];
    if (initialEditorTab) activateEditorTab(initialEditorTab);
    const requestedTabKey = window.location.hash.replace(/^#/, '');
    const requestedEditorTab = editorTabs.find(tab => tab.dataset.editorTab === requestedTabKey);
    if (requestedEditorTab) activateEditorTab(requestedEditorTab);
    editorTabs.forEach(tab => tab.addEventListener('click', () => switchEditorTab(tab)));
    editor.querySelector('[data-editor-tabs]')?.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const current = editorTabs.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? editorTabs.length - 1 : (Math.max(0, current) + (event.key === 'ArrowRight' ? 1 : -1) + editorTabs.length) % editorTabs.length;
      switchEditorTab(editorTabs[next], true);
    });

    const messageTabs = [...editor.querySelectorAll('[data-message-tab]')];
    const messagePanels = [...editor.querySelectorAll('[data-message-panel]')];
    function activateMessageTab(tab, focus = false) {
      const selected = tab.dataset.messageTab;
      messageTabs.forEach(item => {
        const active = item === tab;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
      });
      messagePanels.forEach(panel => { panel.hidden = panel.dataset.messagePanel !== selected; });
      if (focus) tab.focus();
    }
    async function switchMessageTab(tab, focus = false) {
      if (!tab || tab.getAttribute('aria-selected') === 'true' || tabSwitchInProgress) return;
      tabSwitchInProgress = true;
      try {
        await saveKit({ quiet: true, auto: true });
        activateMessageTab(tab, focus);
      } catch (error) {
        if (feedback) feedback.textContent = `Auto-save failed. Staying on this message: ${error.message}`;
      } finally { tabSwitchInProgress = false; }
    }
    const initialMessageTab = messageTabs.find(tab => tab.getAttribute('aria-selected') === 'true') || messageTabs[0];
    if (initialMessageTab) activateMessageTab(initialMessageTab);
    messageTabs.forEach(tab => tab.addEventListener('click', () => switchMessageTab(tab)));
    editor.querySelector('[data-message-tabs]')?.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const current = messageTabs.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? messageTabs.length - 1 : (Math.max(0, current) + (event.key === 'ArrowRight' ? 1 : -1) + messageTabs.length) % messageTabs.length;
      switchMessageTab(messageTabs[next], true);
    });

    // Inline Legal Kit report uses the same guarded backend pipeline as the Legal Kit workspace page.
    const inlineLegalButton = editor.querySelector('[data-inline-analyze-compliance]');
    const inlineLegalPanel = editor.querySelector('[data-inline-compliance-analysis]');
    const inlineLegalSummary = editor.querySelector('[data-inline-analysis-summary]');
    const inlineLegalFindings = editor.querySelector('[data-inline-analysis-findings]');
    const inlineLegalStatus = editor.querySelector('[data-inline-analysis-status]');
    const inlineLegalPersistence = editor.querySelector('[data-inline-report-persistence]');
    const inlineLegalChecks = [...editor.querySelectorAll('[data-inline-analysis-standard]')];
    function updateInlineLegalSelection() {
      const selected = inlineLegalChecks.filter(input => input.checked);
      if (inlineLegalButton) inlineLegalButton.disabled = selected.length === 0;
      inlineLegalChecks.forEach(input => {
        const scope = editor.querySelector(`[data-inline-analysis-scope="${input.value}"]`);
        if (scope) scope.disabled = !input.checked;
      });
    }
    inlineLegalChecks.forEach(input => input.addEventListener('change', updateInlineLegalSelection));
    updateInlineLegalSelection();
    function addInlineFindingList(parent, label, items) {
      const list = document.createElement('section'); list.className = 'analysis-finding-part';
      const heading = document.createElement('h4'); heading.textContent = label; list.append(heading);
      if (Array.isArray(items) && items.length) {
        const ul = document.createElement('ul');
        items.slice(0, 4).forEach(value => { const li = document.createElement('li'); li.textContent = String(value); ul.append(li); });
        list.append(ul);
      } else {
        const empty = document.createElement('p'); empty.textContent = 'No item was identified in the supplied messaging.'; list.append(empty);
      }
      parent.append(list);
    }
    function renderInlineLegalAnalysis(analysis, report = {}) {
      if (!inlineLegalPanel || !inlineLegalSummary || !inlineLegalFindings) return;
      inlineLegalPanel.hidden = false;
      inlineLegalFindings.replaceChildren();
      inlineLegalSummary.textContent = analysis?.summary || '';
      if (analysis?.analysis_text) {
        const textNode = document.createElement('p'); textNode.className = 'analysis-plain-text'; textNode.textContent = analysis.analysis_text; inlineLegalFindings.append(textNode);
      } else {
        (Array.isArray(analysis?.standards) ? analysis.standards : []).forEach(row => {
          const section = document.createElement('article'); section.className = 'analysis-standard-card';
          const heading = document.createElement('h3'); heading.textContent = row.standard || 'Framework'; section.append(heading);
          const assessment = document.createElement('p'); assessment.className = 'analysis-assessment'; assessment.textContent = row.alignment_assessment || 'Review recommended'; section.append(assessment);
          addInlineFindingList(section, 'Aligned content', row.aligned_content);
          addInlineFindingList(section, 'Potential issues or gaps', row.alignment_gaps);
          addInlineFindingList(section, 'Recommended changes', row.recommended_changes);
          inlineLegalFindings.append(section);
        });
      }
      if (inlineLegalPersistence) {
        const when = report.generated_at ? ` Generated ${new Date(report.generated_at).toLocaleString()}.` : '';
        inlineLegalPersistence.textContent = `${report.persisted === false ? 'Report generated but was not saved.' : 'Alignment report saved.'}${when}`;
      }
    }
    try {
      const savedReport = JSON.parse(editor.querySelector('[data-inline-saved-legal-report]')?.textContent || '{}');
      if (savedReport?.analysis && (savedReport.analysis.summary || savedReport.analysis.standards?.length || savedReport.analysis.analysis_text)) {
        renderInlineLegalAnalysis(savedReport.analysis, savedReport);
      }
    } catch { /* Invalid saved report data should not break the editor. */ }
    inlineLegalButton?.addEventListener('click', async () => {
      const standards = inlineLegalChecks.filter(input => input.checked).map(input => input.value);
      if (!standards.length) { updateInlineLegalSelection(); return; }
      const scopes = Object.fromEntries(standards.map(standard => [standard, editor.querySelector(`[data-inline-analysis-scope="${standard}"]`)?.value || 'All areas']));
      const prior = inlineLegalButton.textContent;
      setButtonLoading(inlineLegalButton, true, 'Analyzing…', prior);
      if (inlineLegalStatus) inlineLegalStatus.textContent = 'Reviewing your tagline, elevator pitch and brand story…';
      try {
        await saveKit({ quiet: true, auto: true });
        const result = await api('/api/legal/analyze', { method: 'POST', body: { brand_kit_id: kitId, standards, scopes } });
        renderInlineLegalAnalysis(result.analysis, result.report || {});
        if (inlineLegalPersistence) inlineLegalPersistence.textContent = result.persistence_message || 'Alignment report generated.';
        if (inlineLegalStatus) inlineLegalStatus.textContent = 'Alignment report ready.';
      } catch (error) {
        if (inlineLegalStatus) inlineLegalStatus.textContent = error.message;
      } finally { setButtonLoading(inlineLegalButton, false, '', prior); updateInlineLegalSelection(); }
    });

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
    const selectedKitId = analyzeButton?.dataset.brandKitId || '';
    const frameworkChecks = [...legalPage.querySelectorAll('[data-analysis-standard]')];
    function updateLegalSelectionState() {
      const selected = frameworkChecks.filter(input => input.checked);
      if (analyzeButton) analyzeButton.disabled = selected.length === 0;
      frameworkChecks.forEach(input => {
        const scope = legalPage.querySelector(`[data-analysis-scope="${input.value}"]`);
        if (scope) scope.disabled = !input.checked;
      });
    }
    frameworkChecks.forEach(input => input.addEventListener('change', updateLegalSelectionState));
    updateLegalSelectionState();

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
      resultSummary.textContent = String(analysis?.summary || 'Review the brand-content alignment observations and recommendations below.');
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

    const savedReportNode = legalPage.querySelector('[data-saved-legal-report]');
    if (savedReportNode) {
      try {
        const savedReport = JSON.parse(savedReportNode.textContent || '{}');
        if (savedReport?.analysis) {
          renderLegalAnalysis(savedReport.analysis);
          resultPanel.hidden = false;
          if (persistenceNote) persistenceNote.textContent = 'Saved with this brand.';
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
        const scopes = Object.fromEntries(selectedStandards.map(standard => [standard, legalPage.querySelector(`[data-analysis-scope="${standard}"]`)?.value || 'All areas']));
        const response = await api('/api/legal/analyze', { method: 'POST', body: { brand_kit_id: selectedKitId, standards: selectedStandards, scopes } });
        renderLegalAnalysis(response.analysis || {});
        analysisStatus.textContent = 'Analysis complete.';
        resultPanel.focus?.({ preventScroll: true });
        if (persistenceNote) persistenceNote.textContent = response.persisted ? 'Report saved with this brand.' : 'Report generated, but could not be saved. Check workspace storage.';
      } catch (error) {
        resultSummary.textContent = 'The analysis could not be completed. Check the analysis connection and try again.';
        analysisStatus.textContent = 'The analysis could not be completed.';
      } finally { setButtonLoading(analyzeButton, false, '', prior); updateLegalSelectionState(); }
    });
  }

})();

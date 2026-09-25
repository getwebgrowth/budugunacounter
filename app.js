/**
 * Budu Guna & Mantra Tally Counter
 * Seamlessly integrates Tasbih.org minimalist zen mode with Tallycount.app multi-counter.
 * Built for Buddhist chant practitioners with local memory & audio haptics.
 */

(function () {
  'use strict';

  // --- Constants & Defaults ---
  const STORAGE_KEY = 'budu_guna_counter_data_v1';
  const CIRCLE_CIRCUMFERENCE = 295.31; // 2 * PI * 47

  const BUDU_GUNA_9_PRESETS = [
    { name: '1. Araham', pali: 'අරහං • The Worthy One', count: 0, goal: 108, step: 1 },
    { name: '2. Sammā-Sambuddho', pali: 'සම්මා සම්බුද්ධෝ • Fully Enlightened', count: 0, goal: 108, step: 1 },
    { name: '3. Vijjā-Carana-Sampanno', pali: 'විජ්ජාචරණ සම්පන්නෝ • Wisdom & Virtue', count: 0, goal: 108, step: 1 },
    { name: '4. Sugato', pali: 'සුගතෝ • The Well-Gone', count: 0, goal: 108, step: 1 },
    { name: '5. Lokavidū', pali: 'ලෝකවිදූ • Knower of Worlds', count: 0, goal: 108, step: 1 },
    { name: '6. Anuttaro Purisadamma-sārathi', pali: 'අනුත්තරෝ පුරිසදම්මසාරථී • Incomparable Leader', count: 0, goal: 108, step: 1 },
    { name: '7. Satthā Deva-Manussānam', pali: 'සත්ථා දේවමනුස්සානං • Teacher of Gods & Men', count: 0, goal: 108, step: 1 },
    { name: '8. Buddho', pali: 'බුද්ධෝ • The Awakened One', count: 0, goal: 108, step: 1 },
    { name: '9. Bhagavā', pali: 'භගවා • The Blessed Lord', count: 0, goal: 108, step: 1 }
  ];

  // --- State ---
  let state = {
    activeCounterId: 'counter-default',
    mode: 'single', // 'single' | 'multi'
    theme: 'gold', // Default: Bodhi Golden Yellow (#FFD631)
    soundEnabled: false, // Default: Music / chime off
    bellEnabled: false, // Default: Bell chime off
    hapticEnabled: true,
    buddhaBgEnabled: false,
    activeWallpaper: 'none',
    buddhaBgOpacity: 0.28,
    counters: [
      {
        id: 'counter-default',
        name: 'Itipi So (Araham)',
        pali: 'අරහං • Araham (The Worthy One)',
        count: 0,
        goal: 108,
        step: 1
      }
    ],
    tileLayout: {
      customized: false,
      counter: { x: 50, y: 20, scale: 1.0 },
      plus: { x: 50, y: 65, scale: 1.0 },
      preset: 'default'
    }
  };

  // --- Web Audio API Engine for Organic Sound Generation ---
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // Wooden Mala Bead Click Sound
  function playBeadClick() {
    if (!state.soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const now = audioCtx.currentTime;

      // Primary acoustic wooden resonance
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      // Pitch drops rapidly like woodblock contact
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);

      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.045);

      // Subtle transient click noise
      const bufferSize = audioCtx.sampleRate * 0.008; // 8ms noise
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1600;
      filter.Q.value = 3;

      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.4, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.01);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);

      noise.start(now);
    } catch (e) {
      console.warn('Audio click error:', e);
    }
  }

  // Singing Bowl / Bell Chime on Goal Milestone
  function playGoalBell() {
    if (!state.bellEnabled || !state.soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const now = audioCtx.currentTime;

      // Temple bell harmonic frequencies (528 Hz Love/Dharma tone + octave + overtone)
      const frequencies = [528, 532, 1056, 1584];
      const gains = [0.4, 0.3, 0.15, 0.08];

      frequencies.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(gains[idx], now);
        // Rich, long serene decay
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 2.5);
      });
    } catch (e) {
      console.warn('Bell chime error:', e);
    }
  }

  // Haptic feedback
  function triggerHaptic(type = 'light') {
    if (!state.hapticEnabled || !navigator.vibrate) return;
    try {
      if (type === 'milestone') {
        navigator.vibrate([25, 40, 35, 40, 50]);
      } else {
        navigator.vibrate(16);
      }
    } catch (e) {
      // Ignore vibration error
    }
  }

  // --- Persistence ---
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state = Object.assign(state, parsed);
        // Ensure no wallpaper by default, yellow theme, and sound off as requested
        if (!state.userCustomizedV3) {
          state.theme = 'gold';
          state.soundEnabled = false;
          state.bellEnabled = false;
          state.buddhaBgEnabled = false;
          state.activeWallpaper = 'none';
          state.userCustomizedV3 = true;
          saveState();
        }
      } else {
        state.theme = 'gold';
        state.soundEnabled = false;
        state.bellEnabled = false;
        state.buddhaBgEnabled = false;
        state.activeWallpaper = 'none';
        state.userCustomizedV3 = true;
      }
    } catch (e) {
      console.error('Failed to parse saved state:', e);
    }

    // Safety checks
    if (!state.counters || state.counters.length === 0) {
      state.counters = [
        {
          id: 'counter-default',
          name: '1. Araham',
          pali: 'අරහං • The Worthy One',
          count: 0,
          goal: 108,
          step: 1
        }
      ];
    }

    if (!state.tileLayout) {
      state.tileLayout = {
        customized: false,
        counter: { x: 50, y: 20, scale: 1.0 },
        plus: { x: 50, y: 65, scale: 1.0 },
        preset: 'default'
      };
    } else {
      if (!state.tileLayout.counter) state.tileLayout.counter = { x: 50, y: 20, scale: 1.0 };
      if (!state.tileLayout.plus) state.tileLayout.plus = { x: 50, y: 65, scale: 1.0 };
    }

    if (!getActiveCounter()) {
      state.activeCounterId = state.counters[0].id;
    }
  }

  function getActiveCounter() {
    return state.counters.find(c => c.id === state.activeCounterId) || state.counters[0];
  }

  // --- DOM Elements ---
  const elApp = document.getElementById('app');
  const elBtnToggleAdvance = document.getElementById('btnToggleAdvance');
  const elBtnToggleSingle = document.getElementById('btnToggleSingle');
  const elBtnAddNewCounterHeader = document.getElementById('btnAddNewCounterHeader');
  const elViewSingle = document.getElementById('viewSingle');
  const elViewMulti = document.getElementById('viewMulti');

  // Single mode elements
  const elSingleChantPali = document.getElementById('singleChantPali');
  const elSingleGoalLapBadge = document.getElementById('singleGoalLapBadge');
  const elLapNumber = document.getElementById('lapNumber');
  const elCounterValueDisplay = document.getElementById('counterValueDisplay');
  const elCounterDirectInput = document.getElementById('counterDirectInput');
  const elCounterGoalProgressText = document.getElementById('counterGoalProgressText');
  const elGoalTrackProgress = document.getElementById('goalTrackProgress');
  const elBtnIncrement = document.getElementById('btnIncrement');
  const elBtnDecrement = document.getElementById('btnDecrement');
  const elBtnResetCounter = document.getElementById('btnResetCounter');
  const elBtnEditValue = document.getElementById('btnEditValue');
  const elBtnBlindModeToggle = document.getElementById('btnBlindModeToggle');
  const elBlindModeOverlay = document.getElementById('blindModeOverlay');
  const elBlindCounterDisplay = document.getElementById('blindCounterDisplay');
  const elBtnExitBlindMode = document.getElementById('btnExitBlindMode');

  // Tile Customization elements
  const elTileCounterCard = document.getElementById('tileCounterCard');
  const elTileIncrementor = document.getElementById('tileIncrementor');
  const elBtnToggleCustomizeTiles = document.getElementById('btnToggleCustomizeTiles');
  const elTilesCustomizeToolbar = document.getElementById('tilesCustomizeToolbar');
  const elBtnResetTilePositions = document.getElementById('btnResetTilePositions');
  const elBtnDoneTilePositions = document.getElementById('btnDoneTilePositions');
  const elCounterTileSizeVal = document.getElementById('counterTileSizeVal');
  const elPlusTileSizeVal = document.getElementById('plusTileSizeVal');

  // Settings Drawer tile controls
  const elBtnLaunchTileCustomizer = document.getElementById('btnLaunchTileCustomizer');
  const elSettingsTilePresetsGrid = document.getElementById('settingsTilePresetsGrid');
  const elSettingsBlindTilePresetsGrid = document.getElementById('settingsBlindTilePresetsGrid');
  const elBlindCounterTile = document.getElementById('blindCounterTile');
  const elBtnResetBlindTile = document.getElementById('btnResetBlindTile');
  const elRangeCounterTileScale = document.getElementById('rangeCounterTileScale');
  const elRangePlusTileScale = document.getElementById('rangePlusTileScale');
  const elLabelCounterTileScale = document.getElementById('labelCounterTileScale');
  const elLabelPlusTileScale = document.getElementById('labelPlusTileScale');
  const elBtnSettingsResetTiles = document.getElementById('btnSettingsResetTiles');
  const elBtnSettingsEditTitle = document.getElementById('btnSettingsEditTitle');
  const elSettingsActiveTitlePreview = document.getElementById('settingsActiveTitlePreview');

  // Header badges
  const elHeaderGoalVal = document.getElementById('headerGoalVal');
  const elHeaderStepVal = document.getElementById('headerStepVal');
  const elActiveChantTitle = document.getElementById('activeChantTitle');
  const elBtnActiveChantName = document.getElementById('btnActiveChantName');
  const elBtnGoalTrigger = document.getElementById('btnGoalTrigger');
  const elBtnStepTrigger = document.getElementById('btnStepTrigger');
  const elBtnSoundToggle = document.getElementById('btnSoundToggle');
  const elIconSoundOn = document.getElementById('iconSoundOn');
  const elIconSoundOff = document.getElementById('iconSoundOff');
  const elBtnInfoToggle = document.getElementById('btnInfoToggle');

  // Multi mode elements
  const elMultiTotalChants = document.getElementById('multiTotalChants');
  const elMultiTotalCountersCount = document.getElementById('multiTotalCountersCount');
  const elMultiCountersGrid = document.getElementById('multiCountersGrid');
  const elBtnAddNewCounter = document.getElementById('btnAddNewCounter');
  const elBtnLoadBuduGunaPreset = document.getElementById('btnLoadBuduGunaPreset');

  // Modals & Drawers
  const elModalGoal = document.getElementById('modalGoal');
  const elInputCustomGoal = document.getElementById('inputCustomGoal');
  const elBtnApplyCustomGoal = document.getElementById('btnApplyCustomGoal');

  const elModalStep = document.getElementById('modalStep');
  const elInputCustomStep = document.getElementById('inputCustomStep');
  const elBtnApplyCustomStep = document.getElementById('btnApplyCustomStep');

  const elModalEdit = document.getElementById('modalEdit');
  const elInputEditCurrentValue = document.getElementById('inputEditCurrentValue');
  const elBtnSaveDirectValue = document.getElementById('btnSaveDirectValue');
  const elEditModalChantName = document.getElementById('editModalChantName');

  const elModalNewCounter = document.getElementById('modalNewCounter');
  const elNewCounterModalTitle = document.getElementById('newCounterModalTitle');
  const elInputNewCounterName = document.getElementById('inputNewCounterName');
  const elInputNewCounterPali = document.getElementById('inputNewCounterPali');
  const elInputNewCounterGoal = document.getElementById('inputNewCounterGoal');
  const elInputNewCounterStep = document.getElementById('inputNewCounterStep');
  const elBtnSaveNewCounter = document.getElementById('btnSaveNewCounter');

  const elDrawerSettings = document.getElementById('drawerSettings');
  const elBtnCloseDrawer = document.getElementById('btnCloseDrawer');

  // Settings inside drawer
  const elCheckSoundEnabled = document.getElementById('checkSoundEnabled');
  const elCheckBellEnabled = document.getElementById('checkBellEnabled');
  const elCheckHapticEnabled = document.getElementById('checkHapticEnabled');
  const elPaletteSwatches = document.querySelectorAll('.palette-swatch');
  const elBtnExportData = document.getElementById('btnExportData');
  const elFileImportBackup = document.getElementById('fileImportBackup');
  const elToastMessage = document.getElementById('toastMessage');

  let editingCounterId = null;

  // --- Toast Notification ---
  let toastTimer = null;
  function showToast(msg) {
    if (!elToastMessage) return;
    elToastMessage.textContent = msg;
    elToastMessage.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      elToastMessage.classList.add('hidden');
    }, 2400);
  }

  // --- Rendering UI ---

  function applyTheme(themeName) {
    state.theme = themeName;
    document.body.className = `theme-${themeName}`;
    elPaletteSwatches.forEach(swatch => {
      swatch.classList.toggle('active', swatch.dataset.theme === themeName);
    });
    saveState();
  }

  const WALLPAPERS = [
    { id: 'none', title: 'Zen Dark', subtitle: 'No Wallpaper' },
    { id: 'buddha-1-stone.jpg', title: 'Ancient Stone', subtitle: 'Lotus Halo' },
    { id: 'buddha-2-golden.jpg', title: 'Golden Shrine', subtitle: 'Candlelit Temple' },
    { id: 'buddha-3-samadhi.jpg', title: 'Samadhi Bodhi', subtitle: 'Gal Vihara' },
    { id: 'buddha-4-bronze.jpg', title: 'Monastic Bronze', subtitle: 'Antique Bronze' },
    { id: 'buddha-5-marble.jpg', title: 'White Marble', subtitle: 'Bamboo Grove' },
    { id: 'buddha-6-sunrise.jpg', title: 'Mountain Dawn', subtitle: 'Sunrise Rays' },
    { id: 'buddha-7-lotus.jpg', title: 'Lotus Pond', subtitle: 'Clay Oil Lamps' },
    { id: 'buddha-8-galaxy.jpg', title: 'Milky Way Bodhi', subtitle: 'Starry Cosmos' },
    { id: 'buddha-9-whitemarble.jpg', title: 'Anuradhapura Marble', subtitle: 'White Alabaster' },
    { id: 'buddha-10-galvihara.jpg', title: 'Gal Vihara', subtitle: 'Granite Monolith' },
    { id: 'buddha-11-emerald.jpg', title: 'Emerald Jade', subtitle: 'Forest Sanctuary' },
    { id: 'buddha-12-amberwood.jpg', title: 'Sandalwood Amber', subtitle: 'Clay Oil Lamps' },
    { id: 'buddha-13-sapphire.jpg', title: 'Twilight Sapphire', subtitle: 'Ruwanwelisaya Night' },
  ];

  function applyBuddhaWallpaper() {
    const isEnabled = Boolean(state.buddhaBgEnabled && state.activeWallpaper && state.activeWallpaper !== 'none');
    const opacity = isEnabled ? (state.buddhaBgOpacity !== undefined ? state.buddhaBgOpacity : 0.28) : 0;
    
    document.documentElement.style.setProperty('--buddha-bg-opacity', opacity);
    document.documentElement.style.setProperty('--buddha-vignette-opacity', isEnabled ? '1' : '0');

    if (isEnabled) {
      document.documentElement.style.setProperty('--buddha-bg-img', `url('images/${state.activeWallpaper}')`);
      document.documentElement.style.setProperty('--buddha-bg-img-mobile', `url('images/mobile/${state.activeWallpaper}')`);
      document.body.classList.add('has-buddha-wallpaper');
    } else {
      document.documentElement.style.setProperty('--buddha-bg-img', 'none');
      document.documentElement.style.setProperty('--buddha-bg-img-mobile', 'none');
      document.body.classList.remove('has-buddha-wallpaper');
    }

    const bgLayer = document.getElementById('buddhaBgLayer');
    if (bgLayer) {
      bgLayer.style.backgroundImage = '';
    }

    // Update status pill badge
    const badge = document.getElementById('wallpaperStatusPill');
    if (badge) {
      if (!isEnabled) {
        badge.textContent = 'None (Zen Dark)';
        badge.classList.remove('active');
      } else {
        const found = WALLPAPERS.find(w => w.id === state.activeWallpaper);
        badge.textContent = found ? found.title : 'Active';
        badge.classList.add('active');
      }
    }

    // Update gallery cards active state
    document.querySelectorAll('.wallpaper-card').forEach(card => {
      const cardId = card.dataset.wallpaper;
      const isActive = (!isEnabled && cardId === 'none') || (isEnabled && cardId === state.activeWallpaper);
      card.classList.toggle('active', isActive);
      card.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });

    // Opacity row visibility
    const elOpacityRow = document.getElementById('wallpaperOpacityRow');
    if (elOpacityRow) {
      if (isEnabled) elOpacityRow.classList.remove('hidden');
      else elOpacityRow.classList.add('hidden');
    }

    // Opacity chips and slider active state
    const currentOp = state.buddhaBgOpacity !== undefined ? state.buddhaBgOpacity : 0.28;
    const currentPct = Math.round(currentOp * 100);

    const elOpacitySlider = document.getElementById('wallpaperOpacitySlider');
    const elOpacityVal = document.getElementById('wallpaperOpacityVal');
    if (elOpacitySlider) elOpacitySlider.value = currentPct;
    if (elOpacityVal) elOpacityVal.textContent = `${currentPct}%`;

    document.querySelectorAll('.opacity-chip').forEach(chip => {
      chip.classList.toggle('active', Math.abs(Number(chip.dataset.opacity) - currentOp) < 0.05);
    });
  }

  function renderHeader() {
    const active = getActiveCounter();
    if (!active) return;

    // Header values
    if (elHeaderGoalVal) {
      elHeaderGoalVal.textContent = active.goal > 0 ? active.goal.toLocaleString() : 'Free';
    }
    if (elHeaderStepVal) {
      elHeaderStepVal.textContent = `+${active.step || 1}`;
    }
    if (elActiveChantTitle) {
      elActiveChantTitle.textContent = active.name || 'Unnamed Chant';
    }
    updateSettingsTitlePreview();

    // Sound toggle icon (if present in header)
    if (elIconSoundOn && elIconSoundOff) {
      if (state.soundEnabled) {
        elIconSoundOn.classList.remove('hidden');
        elIconSoundOff.classList.add('hidden');
      } else {
        elIconSoundOn.classList.add('hidden');
        elIconSoundOff.classList.remove('hidden');
      }
    }

    // Toggle single-mode only controls
    const singleOnlyEls = document.querySelectorAll('.single-mode-only');
    singleOnlyEls.forEach(el => {
      if (state.mode === 'single') {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });

    // Toggle multi-mode only controls
    const multiOnlyEls = document.querySelectorAll('.multi-mode-only');
    multiOnlyEls.forEach(el => {
      if (state.mode === 'multi') {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });

    // Switch main view containers
    if (state.mode === 'single') {
      elViewSingle.classList.remove('hidden');
      elViewMulti.classList.add('hidden');
    } else {
      elViewSingle.classList.add('hidden');
      elViewMulti.classList.remove('hidden');
    }
  }

  function renderSingleCounter() {
    const active = getActiveCounter();
    if (!active) return;

    elSingleChantPali.textContent = active.pali || active.name;
    elCounterValueDisplay.textContent = Number(active.count || 0).toLocaleString();
    elBlindCounterDisplay.textContent = Number(active.count || 0).toLocaleString();

    // Goal calculation & ring
    if (active.goal && active.goal > 0) {
      const count = active.count || 0;
      const goal = active.goal;
      const laps = Math.floor(count / goal);
      const remainder = count % goal;

      elCounterGoalProgressText.textContent = `Goal: ${count.toLocaleString()} / ${goal.toLocaleString()}`;

      if (laps > 0) {
        elSingleGoalLapBadge.classList.remove('hidden');
        elLapNumber.textContent = `${laps + (remainder > 0 ? 1 : 0)}`;
      } else {
        elSingleGoalLapBadge.classList.add('hidden');
      }

      // Progress offset
      const progressFraction = (count === 0) ? 0 : (remainder === 0 && count > 0) ? 1 : remainder / goal;
      const offset = CIRCLE_CIRCUMFERENCE - (progressFraction * CIRCLE_CIRCUMFERENCE);
      elGoalTrackProgress.style.strokeDashoffset = offset;
      elGoalTrackProgress.style.opacity = '1';
    } else {
      elCounterGoalProgressText.textContent = `Free Chant (No Goal)`;
      elSingleGoalLapBadge.classList.add('hidden');
      elGoalTrackProgress.style.strokeDashoffset = CIRCLE_CIRCUMFERENCE;
      elGoalTrackProgress.style.opacity = '0.2';
    }
  }

  function renderMultiCounters() {
    if (!elMultiCountersGrid) return;
    elMultiCountersGrid.innerHTML = '';

    let totalChants = 0;
    state.counters.forEach(counter => {
      totalChants += Number(counter.count || 0);

      const card = document.createElement('div');
      card.className = `counter-card ${counter.id === state.activeCounterId ? 'is-active-focus' : ''}`;
      card.dataset.id = counter.id;

      // Progress bar percentage
      let progressPercent = 0;
      let progressText = 'No goal set';
      if (counter.goal && counter.goal > 0) {
        progressPercent = Math.min(100, Math.round(((counter.count || 0) % counter.goal) / counter.goal * 100));
        if (counter.count >= counter.goal) {
          const laps = Math.floor(counter.count / counter.goal);
          progressText = `Goal: ${counter.goal} (Lap ${laps + (counter.count % counter.goal > 0 ? 1 : 0)})`;
        } else {
          progressText = `Goal: ${counter.count} / ${counter.goal} (${progressPercent}%)`;
        }
      }

      card.innerHTML = `
        <div class="card-header">
          <div class="card-title-box">
            <label for="counter_name_${counter.id}" class="sr-only">Rename counter</label>
            <input type="text" id="counter_name_${counter.id}" name="counter_name_${counter.id}" class="card-title-input" value="${escapeHtml(counter.name)}" title="Click to rename" aria-label="Rename counter">
            <span class="card-subtext">${escapeHtml(counter.pali || '')}</span>
          </div>
          <div class="card-top-actions">
            <button class="card-action-icon-btn btn-edit-counter" title="Edit settings" aria-label="Edit counter">
              <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
            </button>
            <button class="card-action-icon-btn btn-reset-single" title="Reset to 0" aria-label="Reset count">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
            <button class="card-action-icon-btn danger btn-delete-single" title="Delete counter" aria-label="Delete counter">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
            </button>
          </div>
        </div>

        <div class="card-count-box">
          <div class="card-count-value" title="Click to manually edit count">${Number(counter.count || 0).toLocaleString()}</div>
          <div class="card-progress-bar-wrap">
            <div class="card-progress-bar-fill" style="width: ${progressPercent}%;"></div>
          </div>
          <span class="card-progress-text">${progressText}</span>
        </div>

        <div class="card-tap-controls">
          <button class="card-tap-btn btn-plus" aria-label="Add count">+${counter.step || 1}</button>
          <button class="card-tap-btn btn-minus" aria-label="Minus count" title="Undo / Minus count">−</button>
        </div>

        <div class="card-bottom-row">
          <span>Step: +${counter.step || 1}</span>
          <button class="card-zen-focus-btn" title="Open in Tasbih Zen Mode">
            <svg viewBox="0 0 20 20" fill="currentColor" style="width:13px;height:13px"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="10" r="3"/></svg>
            <span>Focus</span>
          </button>
        </div>
      `;

      // Event handlers for the card
      const inputTitle = card.querySelector('.card-title-input');
      inputTitle.addEventListener('change', (e) => {
        counter.name = e.target.value.trim() || 'Counter';
        saveState();
        renderHeader();
        renderSingleCounter();
      });

      // Quick manual edit count
      const countValEl = card.querySelector('.card-count-value');
      countValEl.addEventListener('click', () => {
        openDirectEditModal(counter);
      });

      // Minus button
      const btnMinus = card.querySelector('.btn-minus');
      btnMinus.addEventListener('click', (e) => {
        e.stopPropagation();
        decrementCounter(counter);
      });

      // Plus button
      const btnPlus = card.querySelector('.btn-plus');
      btnPlus.addEventListener('click', (e) => {
        e.stopPropagation();
        incrementCounter(counter);
      });

      // Edit settings
      const btnEdit = card.querySelector('.btn-edit-counter');
      btnEdit.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditCounterModal(counter);
      });

      // Reset
      const btnReset = card.querySelector('.btn-reset-single');
      btnReset.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Reset "${counter.name}" to 0?`)) {
          counter.count = 0;
          saveState();
          renderSingleCounter();
          renderMultiCounters();
          showToast(`"${counter.name}" reset to 0`);
        }
      });

      // Delete
      const btnDelete = card.querySelector('.btn-delete-single');
      btnDelete.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.counters.length <= 1) {
          showToast('Cannot delete the only counter');
          return;
        }
        if (confirm(`Delete counter "${counter.name}"?`)) {
          state.counters = state.counters.filter(c => c.id !== counter.id);
          if (state.activeCounterId === counter.id) {
            state.activeCounterId = state.counters[0].id;
          }
          saveState();
          renderAll();
          showToast('Counter deleted');
        }
      });

      // Focus Zen Mode
      const btnFocus = card.querySelector('.card-zen-focus-btn');
      btnFocus.addEventListener('click', (e) => {
        e.stopPropagation();
        state.activeCounterId = counter.id;
        state.mode = 'single';
        saveState();
        renderAll();
      });

      elMultiCountersGrid.appendChild(card);
    });

    // Update aggregate headers
    elMultiTotalChants.textContent = totalChants.toLocaleString();
    elMultiTotalCountersCount.textContent = state.counters.length;
  }

  function renderAll() {
    renderHeader();
    renderSingleCounter();
    renderMultiCounters();
    applyTileLayout();
  }

  // --- Increment & Decrement Logic ---

  function incrementCounter(counter) {
    const step = Number(counter.step) || 1;
    const prevCount = Number(counter.count) || 0;
    counter.count = prevCount + step;

    // Check goal achievement
    if (counter.goal && counter.goal > 0) {
      const prevLaps = Math.floor(prevCount / counter.goal);
      const newLaps = Math.floor(counter.count / counter.goal);
      if (newLaps > prevLaps || (counter.count % counter.goal === 0 && counter.count > 0)) {
        playGoalBell();
        triggerHaptic('milestone');
        showToast(`Milestone reached! Completed ${counter.goal} chants.`);
      } else {
        playBeadClick();
        triggerHaptic('light');
      }
    } else {
      playBeadClick();
      triggerHaptic('light');
    }

    // Number pulse animation
    if (counter.id === state.activeCounterId) {
      elCounterValueDisplay.classList.remove('pulse');
      void elCounterValueDisplay.offsetWidth; // trigger reflow
      elCounterValueDisplay.classList.add('pulse');
      setTimeout(() => elCounterValueDisplay.classList.remove('pulse'), 140);
    }

    saveState();
    renderSingleCounter();
    renderMultiCounters();
  }

  function decrementCounter(counter) {
    const step = Number(counter.step) || 1;
    const current = Number(counter.count) || 0;
    if (current <= 0) {
      counter.count = 0;
      showToast('Count is already 0');
      return;
    }
    counter.count = Math.max(0, current - step);
    playBeadClick();
    triggerHaptic('light');
    saveState();
    renderSingleCounter();
    renderMultiCounters();
  }

  // --- Modals Management ---

  function openModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('hidden');
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add('hidden');
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-backdrop, .drawer-backdrop').forEach(el => el.classList.add('hidden'));
  }

  function openDirectEditModal(counter) {
    editingCounterId = counter.id;
    elEditModalChantName.textContent = counter.name;
    elInputEditCurrentValue.value = counter.count || 0;
    openModal(elModalEdit);
    setTimeout(() => {
      elInputEditCurrentValue.focus();
      elInputEditCurrentValue.select();
    }, 100);
  }

  function openEditCounterModal(counter) {
    editingCounterId = counter.id;
    elNewCounterModalTitle.textContent = 'Edit Counter Settings';
    elInputNewCounterName.value = counter.name || '';
    elInputNewCounterPali.value = counter.pali || '';
    elInputNewCounterGoal.value = counter.goal || 108;
    elInputNewCounterStep.value = counter.step || 1;
    elBtnSaveNewCounter.textContent = 'Save Changes';
    openModal(elModalNewCounter);
  }

  function openNewCounterModal() {
    editingCounterId = null;
    elNewCounterModalTitle.textContent = 'Add New Counter';
    elInputNewCounterName.value = '';
    elInputNewCounterPali.value = '';
    elInputNewCounterGoal.value = 108;
    elInputNewCounterStep.value = 1;
    elBtnSaveNewCounter.textContent = 'Create Counter';
    openModal(elModalNewCounter);
    setTimeout(() => elInputNewCounterName.focus(), 100);
  }

  // Helper escape
  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, function (m) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[m];
    });
  }

  // --- Event Listeners Setup ---

  function setupEventListeners() {
    // Mode toggles
    if (elBtnToggleAdvance) {
      elBtnToggleAdvance.addEventListener('click', () => {
        state.mode = 'multi';
        saveState();
        renderAll();
      });
    }

    if (elBtnToggleSingle) {
      elBtnToggleSingle.addEventListener('click', () => {
        state.mode = 'single';
        saveState();
        renderAll();
      });
    }

    if (elBtnAddNewCounterHeader) {
      elBtnAddNewCounterHeader.addEventListener('click', () => {
        openNewCounterModal();
      });
    }

    // Single mode main Increment button
    elBtnIncrement.addEventListener('click', () => {
      const active = getActiveCounter();
      if (active) incrementCounter(active);
    });

    // Single mode main Decrement button
    elBtnDecrement.addEventListener('click', () => {
      const active = getActiveCounter();
      if (active) decrementCounter(active);
    });

    // Reset current counter
    elBtnResetCounter.addEventListener('click', () => {
      const active = getActiveCounter();
      if (!active) return;
      if (active.count === 0) {
        showToast('Count is already 0');
        return;
      }
      if (confirm(`Reset "${active.name}" count to 0?`)) {
        active.count = 0;
        saveState();
        renderSingleCounter();
        renderMultiCounters();
        showToast(`Reset count to 0`);
      }
    });

    // Edit value button
    if (elBtnEditValue) {
      elBtnEditValue.addEventListener('click', () => {
        const active = getActiveCounter();
        if (active) openDirectEditModal(active);
      });
    }

    // Click on large counter digits to edit
    elCounterValueDisplay.addEventListener('click', () => {
      const active = getActiveCounter();
      if (active) openDirectEditModal(active);
    });

    // Goal Trigger Modal
    elBtnGoalTrigger.addEventListener('click', () => {
      const active = getActiveCounter();
      // Highlight current goal preset chip
      document.querySelectorAll('#modalGoal [data-goal]').forEach(chip => {
        const val = Number(chip.dataset.goal);
        chip.classList.toggle('active', val === Number(active.goal));
      });
      // Highlight current step preset chip in goal modal
      document.querySelectorAll('#modalGoal [data-step]').forEach(chip => {
        const val = Number(chip.dataset.step);
        chip.classList.toggle('active', val === Number(active.step || 1));
      });
      elInputCustomGoal.value = active.goal || '';
      openModal(elModalGoal);
    });

    // Goal preset chips click
    document.querySelectorAll('#modalGoal [data-goal]').forEach(chip => {
      chip.addEventListener('click', () => {
        const goalVal = Number(chip.dataset.goal);
        const active = getActiveCounter();
        active.goal = goalVal;
        saveState();
        renderAll();
        closeModal(elModalGoal);
        showToast(goalVal > 0 ? `Goal set to ${goalVal.toLocaleString()}` : 'Free chant mode (No goal)');
      });
    });

    // Step chips click inside goal modal
    document.querySelectorAll('#modalGoal [data-step]').forEach(chip => {
      chip.addEventListener('click', () => {
        const stepVal = Number(chip.dataset.step);
        const active = getActiveCounter();
        active.step = stepVal;
        state.step = stepVal;
        saveState();
        renderAll();
        document.querySelectorAll('#modalGoal [data-step]').forEach(c => {
          c.classList.toggle('active', Number(c.dataset.step) === stepVal);
        });
        showToast(`Increment step set to +${stepVal}`);
      });
    });

    // Apply custom goal
    elBtnApplyCustomGoal.addEventListener('click', () => {
      const customVal = parseInt(elInputCustomGoal.value, 10);
      if (isNaN(customVal) || customVal < 0) {
        showToast('Please enter a valid goal number');
        return;
      }
      const active = getActiveCounter();
      active.goal = customVal;
      saveState();
      renderAll();
      closeModal(elModalGoal);
      showToast(customVal > 0 ? `Goal set to ${customVal.toLocaleString()}` : 'Free chant mode');
    });

    // Step Trigger Modal
    if (elBtnStepTrigger) {
      elBtnStepTrigger.addEventListener('click', () => {
        const active = getActiveCounter();
        document.querySelectorAll('#modalStep .preset-chip').forEach(chip => {
          const val = Number(chip.dataset.step);
          chip.classList.toggle('active', val === Number(active.step));
        });
        elInputCustomStep.value = active.step || '';
        openModal(elModalStep);
      });
    }

    // Step preset chips click
    document.querySelectorAll('#modalStep .preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const stepVal = Number(chip.dataset.step);
        const active = getActiveCounter();
        active.step = stepVal;
        saveState();
        renderAll();
        closeModal(elModalStep);
        showToast(`Increment step: +${stepVal}`);
      });
    });

    // Apply custom step
    elBtnApplyCustomStep.addEventListener('click', () => {
      const customVal = parseInt(elInputCustomStep.value, 10);
      if (isNaN(customVal) || customVal <= 0) {
        showToast('Please enter a step of 1 or greater');
        return;
      }
      const active = getActiveCounter();
      active.step = customVal;
      saveState();
      renderAll();
      closeModal(elModalStep);
      showToast(`Increment step: +${customVal}`);
    });

    // Save direct count modal
    elBtnSaveDirectValue.addEventListener('click', () => {
      const val = parseInt(elInputEditCurrentValue.value, 10);
      if (isNaN(val) || val < 0) {
        showToast('Please enter a valid positive number');
        return;
      }
      const targetCounter = state.counters.find(c => c.id === editingCounterId) || getActiveCounter();
      if (targetCounter) {
        targetCounter.count = val;
        saveState();
        renderAll();
        closeModal(elModalEdit);
        showToast(`Count updated to ${val.toLocaleString()}`);
      }
    });

    // Rename chant in single view
    elBtnActiveChantName.addEventListener('click', () => {
      const active = getActiveCounter();
      const newName = prompt('Enter name for this chant:', active.name);
      if (newName !== null && newName.trim() !== '') {
        active.name = newName.trim();
        saveState();
        renderAll();
        showToast('Chant renamed');
      }
    });

    // Sound toggle in header (if present)
    if (elBtnSoundToggle) {
      elBtnSoundToggle.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        saveState();
        renderHeader();
        showToast(state.soundEnabled ? 'Chant Audio: ON' : 'Chant Audio: MUTED');
      });
    }

    // Settings drawer toggle
    elBtnInfoToggle.addEventListener('click', () => {
      openModal(elDrawerSettings);
    });

    elBtnCloseDrawer.addEventListener('click', () => {
      closeModal(elDrawerSettings);
    });

    // Close buttons for modals
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = e.currentTarget.dataset.close;
        const target = document.getElementById(modalId);
        if (target) closeModal(target);
      });
    });

    // Close on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          closeModal(backdrop);
        }
      });
    });

    elDrawerSettings.addEventListener('click', (e) => {
      if (e.target === elDrawerSettings) {
        closeModal(elDrawerSettings);
      }
    });

    // Blind Mode
    function enterBlindMode() {
      document.body.classList.add('is-blind-mode');
      elBlindModeOverlay.removeAttribute('inert');
      elBlindModeOverlay.classList.remove('hidden');
      const active = getActiveCounter();
      elBlindCounterDisplay.textContent = Number(active ? active.count : 0).toLocaleString();
      showToast('Blind Mode activated. Tap anywhere on screen.');
    }

    function exitBlindMode() {
      document.body.classList.remove('is-blind-mode');
      elBlindModeOverlay.classList.add('hidden');
      elBlindModeOverlay.setAttribute('inert', '');
    }

    elBtnBlindModeToggle.addEventListener('click', enterBlindMode);

    // Blind Mode Interactive Tile Dragging
    let lastBlindDragEndTime = 0;

    if (elBlindCounterTile) {
      let bStartX = 0, bStartY = 0;
      let bInitXPercent = 50, bInitYPercent = 16;
      let bIsDragging = false;
      let bHasMoved = false;

      elBlindCounterTile.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const rect = elBlindModeOverlay.getBoundingClientRect();
        const tileRect = elBlindCounterTile.getBoundingClientRect();

        const currentCenterX = (tileRect.left + tileRect.width / 2) - rect.left;
        const currentCenterY = (tileRect.top + tileRect.height / 2) - rect.top;

        bInitXPercent = (currentCenterX / rect.width) * 100;
        bInitYPercent = (currentCenterY / rect.height) * 100;

        bStartX = e.clientX;
        bStartY = e.clientY;
        bIsDragging = true;
        bHasMoved = false;

        try {
          elBlindCounterTile.setPointerCapture(e.pointerId);
        } catch (_) {}
      });

      elBlindCounterTile.addEventListener('pointermove', (e) => {
        if (!bIsDragging) return;
        const dx = e.clientX - bStartX;
        const dy = e.clientY - bStartY;

        if (Math.hypot(dx, dy) > 5) {
          bHasMoved = true;
          elBlindCounterTile.classList.add('is-dragging');
        }

        if (!bHasMoved) return;

        e.preventDefault();
        e.stopPropagation();

        const rect = elBlindModeOverlay.getBoundingClientRect();
        let newX = bInitXPercent + (dx / rect.width) * 100;
        let newY = bInitYPercent + (dy / rect.height) * 100;

        newX = Math.max(15, Math.min(85, newX));
        newY = Math.max(10, Math.min(90, newY));

        elBlindModeOverlay.style.setProperty('--blind-tile-x', `${newX}%`);
        elBlindModeOverlay.style.setProperty('--blind-tile-y', `${newY}%`);

        if (!state.tileLayout.blind) state.tileLayout.blind = {};
        state.tileLayout.blind.x = Math.round(newX);
        state.tileLayout.blind.y = Math.round(newY);
      });

      const handleBlindPointerUp = (e) => {
        if (!bIsDragging) return;
        bIsDragging = false;
        elBlindCounterTile.classList.remove('is-dragging');

        try {
          elBlindCounterTile.releasePointerCapture(e.pointerId);
        } catch (_) {}

        if (bHasMoved) {
          lastBlindDragEndTime = Date.now();
          saveState();
          triggerHaptic('light');
          updateBlindPresetChipsActive();
          showToast('Blind tile position saved');
        } else {
          // If clicked without moving, count +1
          const active = getActiveCounter();
          if (active) incrementCounter(active);
        }
      };

      elBlindCounterTile.addEventListener('pointerup', handleBlindPointerUp);
      elBlindCounterTile.addEventListener('pointercancel', handleBlindPointerUp);
    }

    elBlindModeOverlay.addEventListener('click', (e) => {
      if (Date.now() - lastBlindDragEndTime < 350) return;
      if (e.target.closest('#btnExitBlindMode, #btnResetBlindTile, #blindCounterTile')) return;
      const active = getActiveCounter();
      if (active) incrementCounter(active);
    });

    if (elBtnResetBlindTile) {
      elBtnResetBlindTile.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!state.tileLayout.blind) state.tileLayout.blind = {};
        state.tileLayout.blind.x = 50;
        state.tileLayout.blind.y = 16;
        elBlindModeOverlay.style.setProperty('--blind-tile-x', '50%');
        elBlindModeOverlay.style.setProperty('--blind-tile-y', '16%');
        saveState();
        triggerHaptic('light');
        updateBlindPresetChipsActive();
        showToast('Blind tile centered');
      });
    }

    elBtnExitBlindMode.addEventListener('click', (e) => {
      e.stopPropagation();
      exitBlindMode();
    });

    const elBtnLaunchBlindFromSettings = document.getElementById('btnLaunchBlindFromSettings');
    if (elBtnLaunchBlindFromSettings) {
      elBtnLaunchBlindFromSettings.addEventListener('click', () => {
        closeModal(elDrawerSettings);
        enterBlindMode();
      });
    }

    // Settings inside drawer
    elCheckSoundEnabled.checked = state.soundEnabled;
    elCheckSoundEnabled.addEventListener('change', (e) => {
      state.soundEnabled = e.target.checked;
      saveState();
      renderHeader();
    });

    elCheckBellEnabled.checked = state.bellEnabled;
    elCheckBellEnabled.addEventListener('change', (e) => {
      state.bellEnabled = e.target.checked;
      saveState();
    });

    elCheckHapticEnabled.checked = state.hapticEnabled;
    elCheckHapticEnabled.addEventListener('change', (e) => {
      state.hapticEnabled = e.target.checked;
      saveState();
    });

    // Buddha Wallpaper Gallery & Opacity Settings
    document.querySelectorAll('.wallpaper-card').forEach(card => {
      const handleSelect = () => {
        const wpId = card.dataset.wallpaper;
        if (wpId === 'none') {
          state.buddhaBgEnabled = false;
          state.activeWallpaper = 'none';
          showToast('Wallpaper: Zen Dark (None)');
        } else {
          state.buddhaBgEnabled = true;
          state.activeWallpaper = wpId;
          const cardTitle = card.querySelector('.wallpaper-card-title')?.textContent?.trim() || 'Buddha Wallpaper';
          showToast(`Wallpaper set: ${cardTitle}`);
        }
        triggerHaptic([12]);
        saveState();
        applyBuddhaWallpaper();
      };

      card.addEventListener('click', handleSelect);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSelect();
        }
      });
    });

    document.querySelectorAll('.opacity-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        state.buddhaBgOpacity = Number(chip.dataset.opacity);
        if (state.activeWallpaper === 'none' || !state.buddhaBgEnabled) {
          state.buddhaBgEnabled = true;
          state.activeWallpaper = 'buddha-1-stone.jpg';
        }
        triggerHaptic([8]);
        saveState();
        applyBuddhaWallpaper();
        showToast(`Backdrop visibility: ${chip.textContent.trim()}`);
      });
    });

    const elWallpaperOpacitySlider = document.getElementById('wallpaperOpacitySlider');
    if (elWallpaperOpacitySlider) {
      elWallpaperOpacitySlider.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        state.buddhaBgOpacity = val / 100;
        if (state.activeWallpaper === 'none' || !state.buddhaBgEnabled) {
          state.buddhaBgEnabled = true;
          state.activeWallpaper = 'buddha-1-stone.jpg';
        }
        const elVal = document.getElementById('wallpaperOpacityVal');
        if (elVal) elVal.textContent = `${val}%`;
        document.documentElement.style.setProperty('--buddha-bg-opacity', state.buddhaBgOpacity);
        document.documentElement.style.setProperty('--buddha-vignette-opacity', '1');
        document.body.classList.add('has-buddha-wallpaper');
        document.querySelectorAll('.opacity-chip').forEach(chip => {
          chip.classList.toggle('active', Math.abs(Number(chip.dataset.opacity) - state.buddhaBgOpacity) < 0.04);
        });
      });

      elWallpaperOpacitySlider.addEventListener('change', () => {
        triggerHaptic([8]);
        saveState();
        applyBuddhaWallpaper();
        showToast(`Backdrop intensity: ${Math.round(state.buddhaBgOpacity * 100)}%`);
      });
    }

    // Theme palette switches
    elPaletteSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        const theme = swatch.dataset.theme;
        applyTheme(theme);
        showToast(`Theme updated to ${swatch.innerText.trim()}`);
      });
    });

    // Add New Counter
    elBtnAddNewCounter.addEventListener('click', () => {
      openNewCounterModal();
    });

    // Save New / Edit Counter
    elBtnSaveNewCounter.addEventListener('click', () => {
      const name = elInputNewCounterName.value.trim() || 'New Chant';
      const pali = elInputNewCounterPali.value.trim() || '';
      const goal = parseInt(elInputNewCounterGoal.value, 10) || 0;
      const step = parseInt(elInputNewCounterStep.value, 10) || 1;

      if (editingCounterId) {
        // Edit existing
        const counter = state.counters.find(c => c.id === editingCounterId);
        if (counter) {
          counter.name = name;
          counter.pali = pali;
          counter.goal = goal;
          counter.step = Math.max(1, step);
          showToast(`Updated "${counter.name}"`);
        }
      } else {
        // Create new
        const newCounter = {
          id: `counter-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: name,
          pali: pali,
          count: 0,
          goal: goal,
          step: Math.max(1, step)
        };
        state.counters.push(newCounter);
        state.activeCounterId = newCounter.id;
        showToast(`Created counter "${newCounter.name}"`);
      }

      saveState();
      renderAll();
      closeModal(elModalNewCounter);
    });

    // Load 9 Budu Guna Preset
    elBtnLoadBuduGunaPreset.addEventListener('click', () => {
      if (confirm('Load the 9 Supreme Budu Guna (Navaguna)? This will populate all 9 virtues of the Buddha.')) {
        state.counters = BUDU_GUNA_9_PRESETS.map((item, idx) => ({
          id: `counter-guna-${idx + 1}`,
          name: item.name,
          pali: item.pali,
          count: 0,
          goal: item.goal,
          step: item.step
        }));
        state.activeCounterId = state.counters[0].id;
        saveState();
        renderAll();
        showToast('Loaded 9 Budu Guna counters (නව අරහාදී බුදු ගුණ)');
      }
    });

    // Export Data JSON
    elBtnExportData.addEventListener('click', () => {
      const exportJson = JSON.stringify(state, null, 2);
      const blob = new Blob([exportJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `budu_guna_counter_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Exported backup file successfully!');
    });

    // Import Data JSON
    elFileImportBackup.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (imported.counters && Array.isArray(imported.counters)) {
            state = Object.assign(state, imported);
            saveState();
            applyTheme(state.theme || 'tasbih');
            renderAll();
            showToast('Backup restored successfully!');
          } else {
            showToast('Invalid backup file format');
          }
        } catch (err) {
          showToast('Failed to parse JSON backup file');
        }
      };
      reader.readAsText(file);
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        if (e.key === 'Escape') {
          closeAllModals();
        }
        return;
      }

      if (e.key === 'Escape') {
        closeAllModals();
        exitBlindMode();
        exitTileCustomizeMode(true);
        return;
      }

      const active = getActiveCounter();

      // Spacebar or ArrowUp: Increment
      if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === '+') {
        e.preventDefault();
        if (active) incrementCounter(active);
      }
      // ArrowDown or Minus: Decrement
      else if (e.key === 'ArrowDown' || e.key === '-') {
        e.preventDefault();
        if (active) decrementCounter(active);
      }
      // R: Reset
      else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        elBtnResetCounter.click();
      }
      // M: Toggle Mode
      else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        state.mode = (state.mode === 'single') ? 'multi' : 'single';
        saveState();
        renderAll();
      }
      // B: Toggle Blind Mode
      else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        if (elBlindModeOverlay.classList.contains('hidden')) {
          enterBlindMode();
        } else {
          exitBlindMode();
        }
      }
    });

    setupTileCustomization();
  }

  // --- Widget Tile Customization Engine (Move & Resize on Screen) ---
  function applyTileLayout() {
    if (!state.tileLayout) {
      state.tileLayout = {
        customized: false,
        counter: { x: 50, y: 20, scale: 1.0 },
        plus: { x: 50, y: 65, scale: 1.0 },
        blind: { x: 50, y: 16 },
        preset: 'default'
      };
    }
    if (!state.tileLayout.blind) {
      state.tileLayout.blind = { x: 50, y: 16 };
    }

    const { customized, counter, plus, blind } = state.tileLayout;

    // Apply scale CSS variables
    const counterScale = Number(counter && counter.scale ? counter.scale : 1.0);
    const plusScale = Number(plus && plus.scale ? plus.scale : 1.0);
    elViewSingle.style.setProperty('--counter-tile-scale', counterScale.toString());
    elViewSingle.style.setProperty('--plus-tile-scale', plusScale.toString());

    // Apply blind tile coordinates
    if (elBlindModeOverlay) {
      elBlindModeOverlay.style.setProperty('--blind-tile-x', `${blind.x || 50}%`);
      elBlindModeOverlay.style.setProperty('--blind-tile-y', `${blind.y || 16}%`);
    }

    // Update labels and sliders
    const counterPercent = Math.round(counterScale * 100);
    const plusPercent = Math.round(plusScale * 100);

    if (elCounterTileSizeVal) elCounterTileSizeVal.textContent = `${counterPercent}%`;
    if (elPlusTileSizeVal) elPlusTileSizeVal.textContent = `${plusPercent}%`;
    if (elLabelCounterTileScale) elLabelCounterTileScale.textContent = `${counterPercent}%`;
    if (elLabelPlusTileScale) elLabelPlusTileScale.textContent = `${plusPercent}%`;
    if (elRangeCounterTileScale) elRangeCounterTileScale.value = counterPercent;
    if (elRangePlusTileScale) elRangePlusTileScale.value = plusPercent;

    if (customized) {
      elViewSingle.classList.add('has-custom-tiles');
      elViewSingle.style.setProperty('--counter-tile-x', `${counter.x}%`);
      elViewSingle.style.setProperty('--counter-tile-y', `${counter.y}%`);
      elViewSingle.style.setProperty('--plus-tile-x', `${plus.x}%`);
      elViewSingle.style.setProperty('--plus-tile-y', `${plus.y}%`);
    } else {
      elViewSingle.classList.remove('has-custom-tiles');
      elViewSingle.style.removeProperty('--counter-tile-x');
      elViewSingle.style.removeProperty('--counter-tile-y');
      elViewSingle.style.removeProperty('--plus-tile-x');
      elViewSingle.style.removeProperty('--plus-tile-y');
    }

    updatePresetChipsActive();
    updateBlindPresetChipsActive();
    updateMiniPreview();
  }

  function updateMiniPreview() {
    const elMiniCounter = document.getElementById('miniTileCounter');
    const elMiniPlus = document.getElementById('miniTilePlus');
    if (!elMiniCounter || !elMiniPlus || !state.tileLayout) return;

    const { counter, plus, customized } = state.tileLayout;
    if (customized) {
      elMiniCounter.style.left = `${counter.x}%`;
      elMiniCounter.style.top = `${counter.y}%`;
      elMiniPlus.style.left = `${plus.x}%`;
      elMiniPlus.style.top = `${plus.y}%`;
    } else {
      elMiniCounter.style.left = '50%';
      elMiniCounter.style.top = '20%';
      elMiniPlus.style.left = '50%';
      elMiniPlus.style.top = '65%';
    }
  }

  function updatePresetChipsActive() {
    if (!elSettingsTilePresetsGrid) return;
    const chips = elSettingsTilePresetsGrid.querySelectorAll('.tile-preset-chip');
    chips.forEach(chip => {
      const p = chip.dataset.preset;
      let isActive = false;
      if (!state.tileLayout.customized && p === 'default') {
        isActive = true;
      } else if (state.tileLayout.customized && state.tileLayout.preset === p) {
        isActive = true;
      }
      chip.classList.toggle('active', isActive);
    });

    if (elTilesCustomizeToolbar) {
      const toolbarChips = elTilesCustomizeToolbar.querySelectorAll('.toolbar-preset-btn');
      toolbarChips.forEach(chip => {
        const p = chip.dataset.preset;
        let isActive = false;
        if (!state.tileLayout.customized && p === 'default') {
          isActive = true;
        } else if (state.tileLayout.customized && state.tileLayout.preset === p) {
          isActive = true;
        }
        chip.style.borderColor = isActive ? 'var(--color-accent)' : '';
        chip.style.color = isActive ? 'var(--color-accent)' : '';
        chip.style.fontWeight = isActive ? '700' : 'normal';
      });
    }
  }

  function updateBlindPresetChipsActive() {
    if (!elSettingsBlindTilePresetsGrid) return;
    const chips = elSettingsBlindTilePresetsGrid.querySelectorAll('.blind-preset-chip');
    const bx = (state.tileLayout && state.tileLayout.blind && state.tileLayout.blind.x) || 50;
    const by = (state.tileLayout && state.tileLayout.blind && state.tileLayout.blind.y) || 16;
    chips.forEach(chip => {
      const pos = chip.dataset.blindPos;
      let active = false;
      if (pos === 'top-center' && Math.abs(bx - 50) < 8 && Math.abs(by - 16) < 8) active = true;
      else if (pos === 'top-right' && bx > 65 && by < 30) active = true;
      else if (pos === 'bottom-center' && Math.abs(bx - 50) < 8 && by > 65) active = true;
      else if (pos === 'bottom-right' && bx > 65 && by > 65) active = true;
      chip.classList.toggle('active', active);
    });
  }

  function enterTileCustomizeMode() {
    if (state.mode !== 'single') {
      state.mode = 'single';
      renderAll();
    }
    closeModal(elDrawerSettings);
    document.body.classList.add('is-customizing-tiles');
    if (elTilesCustomizeToolbar) elTilesCustomizeToolbar.classList.remove('hidden');

    // If not customized yet, set standard center coordinates as starting point
    if (!state.tileLayout.customized) {
      state.tileLayout.counter.x = 50;
      state.tileLayout.counter.y = 22;
      state.tileLayout.plus.x = 50;
      state.tileLayout.plus.y = 65;
      state.tileLayout.customized = true;
      applyTileLayout();
    }

    showToast('Layout unlocked: drag tiles or adjust sizes');
  }

  function updateSettingsTitlePreview() {
    if (elSettingsActiveTitlePreview) {
      const active = getActiveCounter();
      elSettingsActiveTitlePreview.textContent = `Current: ${active.name || '1. Araham'}`;
    }
  }

  function exitTileCustomizeMode(save = true) {
    document.body.classList.remove('is-customizing-tiles');
    if (elTilesCustomizeToolbar) elTilesCustomizeToolbar.classList.add('hidden');
    if (elBtnToggleCustomizeTiles) elBtnToggleCustomizeTiles.classList.add('hidden');
    if (save) {
      saveState();
      showToast('Tile Layout Saved');
    }
  }

  function resetTileLayout() {
    state.tileLayout = {
      customized: false,
      counter: { x: 50, y: 20, scale: 1.0 },
      plus: { x: 50, y: 65, scale: 1.0 },
      blind: { x: 50, y: 16 },
      preset: 'default'
    };
    applyTileLayout();
    saveState();
    if (elBtnToggleCustomizeTiles) elBtnToggleCustomizeTiles.classList.add('hidden');
    showToast('All custom tile positions cleared & reset to center');
  }

  function applyTilePreset(presetName) {
    if (presetName === 'default') {
      resetTileLayout();
      return;
    }

    state.tileLayout.customized = true;
    state.tileLayout.preset = presetName;

    if (presetName === 'buddha-gaze') {
      // Moves counter card up and plus button down into water reflections
      // Clears Buddha statue face, chest & meditation mudra
      state.tileLayout.counter = { x: 50, y: 13, scale: 0.85 };
      state.tileLayout.plus = { x: 50, y: 85, scale: 0.82 };
    } else if (presetName === 'zen-clear') {
      // Moves both tiles to the right margin, leaving center vertical axis 100% UNBLOCKED
      state.tileLayout.counter = { x: 74, y: 13, scale: 0.82 };
      state.tileLayout.plus = { x: 74, y: 82, scale: 0.85 };
    } else if (presetName === 'right-thumb') {
      // Positioned for easy one-hand right-thumb tapping
      state.tileLayout.counter = { x: 36, y: 14, scale: 0.85 };
      state.tileLayout.plus = { x: 75, y: 78, scale: 0.90 };
    } else if (presetName === 'left-thumb') {
      // Positioned for easy one-hand left-thumb tapping
      state.tileLayout.counter = { x: 64, y: 14, scale: 0.85 };
      state.tileLayout.plus = { x: 25, y: 78, scale: 0.90 };
    }

    applyTileLayout();
    saveState();
    showToast(`Preset applied: ${presetName}`);
  }

  function setupTileCustomization() {
    const tiles = [
      { el: elTileCounterCard, key: 'counter' },
      { el: elTileIncrementor, key: 'plus' }
    ];

    tiles.forEach(({ el, key }) => {
      if (!el) return;

      let startX = 0, startY = 0;
      let initialXPercent = 50, initialYPercent = 50;
      let isDragging = false;
      let longPressTimer = null;

      // Pointer down
      el.addEventListener('pointerdown', (e) => {
        // If clicking on direct input, title rename button, or size stepper buttons, skip dragging
        if (e.target.closest('input, .active-chant-title-btn, .btn-step-size')) {
          return;
        }

        const isCustomizing = document.body.classList.contains('is-customizing-tiles');

        if (!isCustomizing) {
          // Detect long-press (600ms) to unlock tile customization mode smoothly
          longPressTimer = setTimeout(() => {
            triggerHaptic('medium');
            enterTileCustomizeMode();
          }, 600);
          return;
        }

        // We ARE in customize mode: begin dragging this tile
        e.preventDefault();
        e.stopPropagation();

        const viewRect = elViewSingle.getBoundingClientRect();
        const tileRect = el.getBoundingClientRect();

        const currentCenterX = (tileRect.left + tileRect.width / 2) - viewRect.left;
        const currentCenterY = (tileRect.top + tileRect.height / 2) - viewRect.top;

        initialXPercent = (currentCenterX / viewRect.width) * 100;
        initialYPercent = (currentCenterY / viewRect.height) * 100;

        startX = e.clientX;
        startY = e.clientY;
        isDragging = true;

        el.classList.add('is-dragging');
        try {
          el.setPointerCapture(e.pointerId);
        } catch (_) {}
      });

      // Pointer move
      el.addEventListener('pointermove', (e) => {
        if (longPressTimer) {
          // If moved more than 8px before long press fires, cancel it
          if (Math.hypot(e.clientX - startX, e.clientY - startY) > 8) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
          }
        }

        if (!isDragging) return;

        e.preventDefault();
        e.stopPropagation();

        const viewRect = elViewSingle.getBoundingClientRect();
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newX = initialXPercent + (dx / viewRect.width) * 100;
        let newY = initialYPercent + (dy / viewRect.height) * 100;

        // Boundaries clamp to prevent tile from leaving the viewport
        newX = Math.max(14, Math.min(86, newX));
        newY = Math.max(10, Math.min(90, newY));

        state.tileLayout.customized = true;
        delete state.tileLayout.preset; // Manual drag overrides preset
        state.tileLayout[key].x = Math.round(newX * 10) / 10;
        state.tileLayout[key].y = Math.round(newY * 10) / 10;

        elViewSingle.classList.add('has-custom-tiles');
        elViewSingle.style.setProperty(`--${key}-tile-x`, `${state.tileLayout[key].x}%`);
        elViewSingle.style.setProperty(`--${key}-tile-y`, `${state.tileLayout[key].y}%`);
      });

      // Pointer up / cancel
      const finishDrag = (e) => {
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        if (isDragging) {
          isDragging = false;
          el.classList.remove('is-dragging');
          try {
            el.releasePointerCapture(e.pointerId);
          } catch (_) {}
          saveState();
        }
      };

      el.addEventListener('pointerup', finishDrag);
      el.addEventListener('pointercancel', finishDrag);
    });

    // Stepper buttons (− / +) on tile handles
    document.querySelectorAll('.btn-step-size').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tileKey = btn.dataset.tile; // 'counter' | 'plus'
        const isPlus = btn.classList.contains('btn-size-plus');
        const currentScale = state.tileLayout[tileKey].scale || 1.0;
        let newScale = isPlus ? currentScale + 0.1 : currentScale - 0.1;
        newScale = Math.max(0.65, Math.min(1.45, Math.round(newScale * 10) / 10));

        state.tileLayout[tileKey].scale = newScale;
        applyTileLayout();
        saveState();
        triggerHaptic('light');
      });
    });

    // Toggle button in bottom controls
    if (elBtnToggleCustomizeTiles) {
      elBtnToggleCustomizeTiles.addEventListener('click', () => {
        if (document.body.classList.contains('is-customizing-tiles')) {
          exitTileCustomizeMode(true);
        } else {
          enterTileCustomizeMode();
        }
      });
    }

    // Launch button in settings drawer
    if (elBtnLaunchTileCustomizer) {
      elBtnLaunchTileCustomizer.addEventListener('click', () => {
        enterTileCustomizeMode();
      });
    }

    // Toolbar Reset & Done
    if (elBtnResetTilePositions) {
      elBtnResetTilePositions.addEventListener('click', resetTileLayout);
    }
    if (elBtnDoneTilePositions) {
      elBtnDoneTilePositions.addEventListener('click', () => exitTileCustomizeMode(true));
    }

    // Presets in toolbar & settings
    document.querySelectorAll('.toolbar-preset-btn, .tile-preset-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.currentTarget.dataset.preset;
        if (preset) applyTilePreset(preset);
      });
    });

    // Settings drawer reset
    if (elBtnSettingsResetTiles) {
      elBtnSettingsResetTiles.addEventListener('click', resetTileLayout);
    }

    // Settings drawer rename chant title
    if (elBtnSettingsEditTitle) {
      elBtnSettingsEditTitle.addEventListener('click', () => {
        const active = getActiveCounter();
        const newName = prompt('Enter name for this chant:', active.name);
        if (newName !== null && newName.trim() !== '') {
          active.name = newName.trim();
          saveState();
          renderAll();
          updateSettingsTitlePreview();
          showToast('Chant title updated');
        }
      });
    }

    // Blind tile presets in settings drawer
    document.querySelectorAll('.blind-preset-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pos = e.currentTarget.dataset.blindPos;
        if (!state.tileLayout.blind) state.tileLayout.blind = { x: 50, y: 16 };
        if (pos === 'top-center') state.tileLayout.blind = { x: 50, y: 16 };
        else if (pos === 'top-right') state.tileLayout.blind = { x: 78, y: 14 };
        else if (pos === 'bottom-center') state.tileLayout.blind = { x: 50, y: 84 };
        else if (pos === 'bottom-right') state.tileLayout.blind = { x: 78, y: 84 };
        applyTileLayout();
        saveState();
        triggerHaptic('light');
        showToast(`Blind tile: ${pos.replace('-', ' ')}`);
      });
    });

    // Settings drawer scale sliders
    if (elRangeCounterTileScale) {
      elRangeCounterTileScale.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        state.tileLayout.counter.scale = val / 100;
        applyTileLayout();
      });
      elRangeCounterTileScale.addEventListener('change', () => {
        saveState();
      });
    }

    if (elRangePlusTileScale) {
      elRangePlusTileScale.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        state.tileLayout.plus.scale = val / 100;
        applyTileLayout();
      });
      elRangePlusTileScale.addEventListener('change', () => {
        saveState();
      });
    }
  }

  // --- Initialize App ---
  function init() {
    loadState();
    applyTheme(state.theme || 'gold');
    applyBuddhaWallpaper();
    setupEventListeners();
    renderAll();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

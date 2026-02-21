/* DiscordGenius interactions: accordions, modals, request/subscribe placeholders */
(function () {
  const PRICE = 299; // founders plan price

  // 3D Sine Wave Grid Background
  const canvas = document.getElementById('waveGrid');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width, height, centerX, centerY, cols, rows;
    let isVisible = true;
    let animationId = null;
    const gridSize = 33;

    // Pre-allocated grid buffer: 3 floats (px, py, z) per point
    let gridBuf = null;
    let gridBufCols = 0;
    let gridBufRows = 0;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
      centerX = width / 2;
      centerY = height / 2;
      cols = Math.ceil(width / gridSize) + 12;
      rows = Math.ceil(height / gridSize) + 12;
      // Reallocate grid buffer only when dimensions change
      if (cols !== gridBufCols || rows !== gridBufRows) {
        gridBuf = new Float64Array(cols * rows * 3);
        gridBufCols = cols;
        gridBufRows = rows;
      }
    }
    resize();

    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resize, 100);
    });

    // Intersection Observer — also controls rAF scheduling
    const observer = new IntersectionObserver((entries) => {
      const wasVisible = isVisible;
      isVisible = entries[0].isIntersecting;
      // Restart the animation loop when canvas becomes visible again
      if (isVisible && !wasVisible && !reduced) {
        lastFrameTime = 0;
        animationId = requestAnimationFrame(animate);
      }
    }, { threshold: 0.1 });
    observer.observe(canvas);

    const perspective = 900;
    const waveAmp = 35;
    const scrollSpeed = 0.25;
    let offsetX = 0;
    let time = 0;
    let lastFrameTime = 0;

    function computeGrid() {
      const startX = -gridSize * 3 - (offsetX % gridSize);
      const startY = -gridSize * 3;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const worldX = offsetX + startX + col * gridSize;
          const worldY = startY + row * gridSize;
          const sx = worldX * 0.01;
          const sy = worldY * 0.01;
          const z = Math.sin(sx * 0.8 + time * 0.3) * Math.cos(sy * 0.6 + time * 0.2) * waveAmp +
            Math.sin(sx * 1.6 + sy * 1.2 + time * 0.25) * (waveAmp * 0.25);
          const scale = perspective / (perspective + z);
          const px = centerX + (startX + col * gridSize - centerX) * scale;
          const py = centerY + (startY + row * gridSize - centerY) * scale;
          const idx = (row * cols + col) * 3;
          gridBuf[idx] = px;
          gridBuf[idx + 1] = py;
          gridBuf[idx + 2] = z;
        }
      }
    }

    function drawGrid() {
      ctx.clearRect(0, 0, width, height);
      computeGrid();

      const invWaveAmp3 = 1 / (waveAmp * 3);

      // Draw horizontal lines
      for (let row = 0; row < rows; row++) {
        ctx.beginPath();
        let zSum = 0;
        for (let col = 0; col < cols; col++) {
          const idx = (row * cols + col) * 3;
          const px = gridBuf[idx], py = gridBuf[idx + 1];
          zSum += gridBuf[idx + 2];
          if (col === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        const opacity = Math.max(0.15, Math.min(0.55, 1 - (zSum / cols) * invWaveAmp3));
        const hue = (time * 20 + row * 15) % 360;
        const vaporHue = hue < 180 ? 300 + (hue * 0.5) : 180 + ((hue - 180) * 0.3);
        ctx.shadowBlur = 12;
        ctx.shadowColor = `hsla(${vaporHue}, 85%, 65%, ${opacity * 0.7})`;
        ctx.strokeStyle = `rgba(0, 229, 255, ${opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw vertical lines
      for (let col = 0; col < cols; col++) {
        ctx.beginPath();
        let zSum = 0;
        for (let row = 0; row < rows; row++) {
          const idx = (row * cols + col) * 3;
          const px = gridBuf[idx], py = gridBuf[idx + 1];
          zSum += gridBuf[idx + 2];
          if (row === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        const opacity = Math.max(0.15, Math.min(0.55, 1 - (zSum / rows) * invWaveAmp3));
        const hue = (time * 20 + col * 15) % 360;
        const vaporHue = hue < 180 ? 300 + (hue * 0.5) : 180 + ((hue - 180) * 0.3);
        ctx.shadowBlur = 12;
        ctx.shadowColor = `hsla(${vaporHue}, 85%, 65%, ${opacity * 0.7})`;
        ctx.strokeStyle = `rgba(0, 229, 255, ${opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Reset shadow to prevent state accumulation
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
    }

    function animate(timestamp) {
      if (reduced || !isVisible) {
        animationId = null;
        return;
      }
      // Real delta time (clamped to avoid jumps after tab switch)
      if (lastFrameTime > 0) {
        const dt = Math.min((timestamp - lastFrameTime) / 1000, 0.1);
        time += dt;
        offsetX += scrollSpeed * (dt / 0.016);
      }
      lastFrameTime = timestamp;
      drawGrid();
      animationId = requestAnimationFrame(animate);
    }
    animationId = requestAnimationFrame(animate);
  }

  // Show topbar when nav scrolls out of view
  const nav = document.querySelector('.nav');
  const topbar = document.querySelector('.topbar');
  if (nav && topbar) {
    const navObserver = new IntersectionObserver((entries) => {
      const navVisible = entries[0].isIntersecting;
      topbar.classList.toggle('is-visible', !navVisible);
    }, { threshold: 0.1 });
    navObserver.observe(nav);
  }

  // Accordions - entire card is clickable
  const accordions = document.querySelectorAll('[data-accordion]');
  accordions.forEach(acc => {
    const panel = acc.querySelector('[data-panel]');
    if (!panel) return;

    acc.addEventListener('click', (e) => {
      // Prevent if clicking on links or buttons inside
      if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;

      const isOpen = acc.classList.toggle('is-open');
      acc.setAttribute('aria-expanded', String(isOpen));
    });

    // Make keyboard accessible
    acc.setAttribute('role', 'button');
    acc.setAttribute('tabindex', '0');
    acc.setAttribute('aria-expanded', 'false');

    acc.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        acc.click();
      }
    });
  });

  // Simple parallax on hero background
  const heroBg = document.querySelector('.hero__bg');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (heroBg && !reduced) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY * 0.1;
      heroBg.style.transform = `translate3d(0, ${y}px, 0)`;
    }, { passive: true });
  }

  // Modal helpers with focus trap
  const focusableSelectors = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]';
  let lastActive = null;
  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    lastActive = document.activeElement;
    modal.hidden = false;
    const focusables = modal.querySelectorAll(focusableSelectors);
    if (focusables.length) focusables[0].focus();
    document.addEventListener('keydown', onKey);
  }
  function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    document.removeEventListener('keydown', onKey);
    if (lastActive) lastActive.focus();
  }
  function onKey(e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal:not([hidden])').forEach(m => closeModal(m));
    }
    if (e.key === 'Tab') {
      const modal = document.querySelector('.modal:not([hidden])');
      if (!modal) return;
      const focusables = [...modal.querySelectorAll(focusableSelectors)];
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  }
  document.querySelectorAll('[data-open-subscribe]').forEach(btn => btn.addEventListener('click', () => {
    document.getElementById('modal-price').textContent = String(PRICE);
    openModal('subscribe-modal');
  }));
  document.querySelectorAll('[data-open-question]').forEach(btn => btn.addEventListener('click', () => openModal('question-modal')));
  document.querySelectorAll('[data-open-call]').forEach(btn => btn.addEventListener('click', (e) => {
    const book = document.getElementById('book');
    if (book) { e.preventDefault(); book.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else { openModal('call-modal'); }
  }));
  document.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', () => {
    const modal = el.closest('.modal');
    closeModal(modal);
  }));

  // Subscribe placeholder
  const proceed = document.getElementById('proceed-subscribe');
  if (proceed) {
    proceed.addEventListener('click', () => {
      try { localStorage.setItem('djSubscribed', 'true'); } catch (e) { }
      const success = document.getElementById('subscribe-success');
      if (success) success.hidden = false;
    });
  }

  // Question form placeholder storing to localStorage and confirming submission
  const qForm = document.getElementById('question-form');
  if (qForm) {
    qForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = document.getElementById('q-text').value.trim();
      const contact = document.getElementById('q-contact').value.trim();
      if (!text || !contact) return;
      
      const submitBtn = qForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;

      try {
        const response = await fetch('/api/questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ text, contact }),
        });
        
        if (!response.ok) {
          throw new Error(`Submit failed (${response.status})`);
        }
        
        const success = document.getElementById('question-success');
        if (success) success.hidden = false;
        qForm.reset();
      } catch (err) {
        console.error('[question] submit failed', err);
        alert('Failed to send question. Please try again or email developer@discordgenius.com directly.');
      } finally {
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  }

  // Pseudo authentication for booking gate
  const authState = { provider: null, email: null };
  try {
    const saved = JSON.parse(localStorage.getItem('djAuth') || 'null');
    if (saved && saved.provider) {
      authState.provider = saved.provider;
      authState.email = saved.email || null;
      document.body.classList.add('is-auth');
    }
  } catch (e) { }
  function setAuth(provider, email) {
    authState.provider = provider; authState.email = email || null;
    try { localStorage.setItem('djAuth', JSON.stringify(authState)); } catch (e) { }
    document.body.classList.add('is-auth');
  }
  document.querySelectorAll('[data-auth-provider]').forEach(btn => btn.addEventListener('click', () => {
    const provider = btn.getAttribute('data-auth-provider');
    if (provider === 'email') {
      const input = document.getElementById('auth-email');
      const val = input && input.value.trim();
      if (!val) { input && input.focus(); return; }
      setAuth('email', val);
    } else {
      setAuth(provider);
    }
  }));

  // FAQ category switching
  const tabs = document.querySelectorAll('[data-faq-tab]');
  const cats = document.querySelectorAll('[data-faq-category]');
  function activateTab(key) {
    tabs.forEach(t => {
      const active = t.getAttribute('data-faq-tab') === key;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', String(active));
    });
    cats.forEach(c => {
      const show = c.getAttribute('data-faq-category') === key;
      c.classList.toggle('is-active', show);
    });
  }
  tabs.forEach(t => t.addEventListener('click', () => activateTab(t.getAttribute('data-faq-tab'))));
  if (tabs.length) activateTab('bots');

  initBookingScheduler();

  function initBookingScheduler() {
    const form = document.getElementById('booking-form');
    if (!form) return;
    if (typeof window.flatpickr !== 'function') {
      console.warn('[booking] Flatpickr not loaded');
      return;
    }
    const timezoneHidden = form.querySelector('#book-timezone');
    const timezoneLabel = form.querySelector('[data-calendar-timezone]');
    const dateInput = (() => {
      const existing = form.querySelector('[data-calendar-input]');
      if (existing) return existing;
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'date';
      input.id = 'book-date';
      input.setAttribute('data-calendar-input', 'true');
      input.classList.add('calendar-ghost-input');
      form.appendChild(input);
      return input;
    })();
    dateInput.classList.add('calendar-ghost-input');
    const inlineCalendarEl = form.querySelector('[data-calendar-inline]');
    const selectedLabel = form.querySelector('[data-calendar-selected]');
    const stateEl = form.querySelector('[data-calendar-state]');
    const loadingEl = form.querySelector('[data-calendar-loading]');
    const timepickerEl = form.querySelector('[data-timepicker]');
    const timepickerRange = form.querySelector('[data-timepicker-range]');
    const timepickerStartLabel = form.querySelector('[data-timepicker-start]');
    const timepickerEndLabel = form.querySelector('[data-timepicker-end]');
    const timepickerTicks = form.querySelector('[data-timepicker-ticks]');
    const emptyEl = form.querySelector('[data-calendar-empty]');
    const calendarErrorEl = form.querySelector('[data-calendar-error]');
    const hiddenSlotInput = form.querySelector('#book-slot');
    const submitBtn = form.querySelector('[data-booking-submit]');
    const errorEl = form.querySelector('[data-booking-error]');
    const successEl = form.querySelector('[data-booking-success]');
    if (!timezoneHidden || !dateInput || !inlineCalendarEl || !timepickerEl || !timepickerRange || !hiddenSlotInput || !submitBtn) return;

    const MINUTE = 60 * 1000;
    const MIN_LEAD_MS = 60 * MINUTE;
    const BOOKING_WINDOW_DAYS = 60;
    const DAY_WINDOW_START_MINUTES = 8 * 60; // 8:00 GMT
    const DAY_WINDOW_END_MINUTES = 16 * 60; // 16:00 GMT
    const WINDOW_DURATION_MINUTES = 15;
    const WINDOW_STEP_MINUTES = 5;
    const fallbackTimezone = 'Etc/GMT';
    const detectedTimezone = (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || fallbackTimezone;
      } catch (_err) {
        return fallbackTimezone;
      }
    })();

    const initialTimezone = (() => {
      const preset = timezoneHidden.value?.trim();
      if (preset) return preset;
      return detectedTimezone || fallbackTimezone;
    })();
    timezoneHidden.value = initialTimezone;

    const state = {
      timezone: initialTimezone,
      availability: {},
      selectedDate: null,
      selectedSlot: null,
      usingMock: false,
      minDate: null,
      maxDate: null,
      datepicker: null,
      timeWindows: [],
      selectedWindowIndex: null,
    };

    const computeBounds = () => {
      const minDate = startOfDay(new Date(Date.now() + MIN_LEAD_MS));
      const maxDate = addDays(minDate, BOOKING_WINDOW_DAYS - 1);
      state.minDate = minDate;
      state.maxDate = maxDate;
    };

    const setTimezoneLabel = () => {
      if (timezoneLabel) {
        timezoneLabel.textContent = state.timezone;
      }
      timezoneHidden.value = state.timezone;
    };

    const setStateMessage = (variant, message) => {
      if (!stateEl) return;
      stateEl.textContent = message || '';
      stateEl.dataset.variant = variant;
      stateEl.hidden = !message;
    };

    const showLoading = (show) => {
      if (loadingEl) loadingEl.hidden = !show;
      if (timepickerEl) timepickerEl.hidden = true;
      if (emptyEl) emptyEl.hidden = true;
      if (calendarErrorEl) calendarErrorEl.hidden = true;
      dateInput.disabled = show;
      inlineCalendarEl.classList.toggle('is-disabled', show);
    };

    const disableUnavailableDates = () => false;

    const initDatepicker = () => {
      if (state.datepicker) {
        state.datepicker.set('minDate', state.minDate);
        state.datepicker.set('maxDate', state.maxDate);
        state.datepicker.set('disable', [disableUnavailableDates]);
        return;
      }
      inlineCalendarEl.innerHTML = '';
      state.datepicker = window.flatpickr(dateInput, {
        minDate: state.minDate,
        maxDate: state.maxDate,
        dateFormat: 'Y-m-d',
        defaultDate: null,
        disable: [disableUnavailableDates],
        disableMobile: true,
        shorthandCurrentMonth: true,
        inline: true,
        appendTo: inlineCalendarEl,
        onChange: (selectedDates) => {
          const selected = selectedDates?.[0];
          if (!selected) {
            state.selectedDate = null;
            state.selectedSlot = null;
            state.selectedWindowIndex = null;
            state.timeWindows = [];
            hiddenSlotInput.value = '';
            renderTimepicker();
            updateSelectedLabel(null);
            return;
          }
          const key = isoDay(selected);
          handleDateSelection(key);
        },
      });
    };

    const handleDateSelection = (dayKey) => {
      state.selectedDate = dayKey;
      state.selectedSlot = null;
      state.selectedWindowIndex = null;
      state.timeWindows = buildDailyWindows(dayKey);
      hiddenSlotInput.value = '';
      renderTimepicker();
      updateSelectedLabel(new Date(`${dayKey}T00:00:00Z`));
    };

    const renderTimepicker = () => {
      if (!timepickerEl || !timepickerRange) return;
      if (!state.selectedDate) {
        timepickerEl.hidden = true;
        emptyEl.hidden = true;
        submitBtn.disabled = true;
        setStateMessage('info', 'Select a date to view available times.');
        return;
      }
      const windows = state.timeWindows.length ? state.timeWindows : buildDailyWindows(state.selectedDate);
      state.timeWindows = windows;
      if (!windows.length) {
        timepickerEl.hidden = true;
        emptyEl.hidden = true;
        submitBtn.disabled = true;
        setStateMessage('warning', 'No windows available for that day.');
        return;
      }
      emptyEl.hidden = true;
      const defaultIndex = typeof state.selectedWindowIndex === 'number' && windows[state.selectedWindowIndex]
        ? state.selectedWindowIndex
        : 0;
      timepickerRange.max = Math.max(windows.length - 1, 0);
      timepickerRange.value = defaultIndex;
      timepickerRange.disabled = false;
      updateTimepickerTicks(windows);
      selectWindowByIndex(defaultIndex, { announce: false });
      timepickerEl.hidden = false;
      setStateMessage(
        state.usingMock ? 'warning' : 'hint',
        state.usingMock
          ? 'Showing sample availability while the live scheduler is finishing up.'
          : 'Slide to pick a 15-minute window between 8am-4pm GMT.',
      );
    };

    const selectWindowByIndex = (index, options = {}) => {
      if (!state.timeWindows.length) {
        submitBtn.disabled = true;
        hiddenSlotInput.value = '';
        updateTimepickerLabels(null);
        return;
      }
      const clamped = Math.max(0, Math.min(state.timeWindows.length - 1, Number(index) || 0));
      const window = state.timeWindows[clamped];
      if (!window) return;
      state.selectedWindowIndex = clamped;
      state.selectedSlot = window.startIso;
      hiddenSlotInput.value = window.startIso;
      submitBtn.disabled = false;
      updateTimepickerLabels(window);
      if (options.announce !== false) {
        setStateMessage('success', `Window selected: ${formatWindowRange(window, state.timezone)}. Submit to confirm.`);
      }
    };

    const updateTimepickerLabels = (window) => {
      if (!timepickerStartLabel || !timepickerEndLabel) return;
      if (!window) {
        timepickerStartLabel.textContent = '--';
        timepickerEndLabel.textContent = '--';
        return;
      }
      timepickerStartLabel.textContent = formatSlotLabel(window.startIso, state.timezone);
      timepickerEndLabel.textContent = formatSlotLabel(window.endIso, state.timezone);
    };

    const updateTimepickerTicks = (windows) => {
      if (!timepickerTicks) return;
      timepickerTicks.innerHTML = '';
      if (!windows.length) return;
      const tickMinutes = [];
      for (let minute = DAY_WINDOW_START_MINUTES; minute <= DAY_WINDOW_END_MINUTES; minute += 60) {
        tickMinutes.push(minute);
      }
      const baseDateKey = state.selectedDate || isoDay(state.minDate);
      tickMinutes.forEach((minute) => {
        const tickDate = minutesToIso(baseDateKey, minute);
        const span = document.createElement('span');
        span.textContent = formatHourLabel(tickDate, state.timezone);
        timepickerTicks.appendChild(span);
      });
    };

    const buildDailyWindows = (dayKey) => {
      if (!dayKey) return [];
      const parts = dayKey.split('-').map(Number);
      if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return [];
      const [year, month, day] = parts;
      const base = Date.UTC(year, month - 1, day);
      const windows = [];
      for (let start = DAY_WINDOW_START_MINUTES; start <= DAY_WINDOW_END_MINUTES - WINDOW_DURATION_MINUTES; start += WINDOW_STEP_MINUTES) {
        const startDate = new Date(base);
        startDate.setUTCHours(0, start, 0, 0);
        const endDate = new Date(startDate.getTime() + WINDOW_DURATION_MINUTES * MINUTE);
        windows.push({
          startIso: startDate.toISOString(),
          endIso: endDate.toISOString(),
          startMinutes: start,
        });
      }
      return windows;
    };

    const minutesToIso = (dayKey, totalMinutes) => {
      const parts = dayKey.split('-').map(Number);
      if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return new Date().toISOString();
      const [year, month, day] = parts;
      const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      date.setUTCMinutes(totalMinutes, 0, 0);
      return date.toISOString();
    };

    const formatWindowRange = (window, timezone) => {
      return `${formatSlotLabel(window.startIso, timezone)} — ${formatSlotLabel(window.endIso, timezone)}`;
    };

    const formatHourLabel = (isoString, timezone) => {
      try {
        return new Intl.DateTimeFormat('en', { hour: 'numeric', timeZone: timezone }).format(new Date(isoString));
      } catch (_err) {
        return new Intl.DateTimeFormat('en', { hour: 'numeric' }).format(new Date(isoString));
      }
    };

    timepickerRange.addEventListener('input', () => {
      selectWindowByIndex(timepickerRange.value, { announce: true });
    });
    timepickerRange.addEventListener('change', () => {
      selectWindowByIndex(timepickerRange.value, { announce: true });
    });

    const applyAvailability = (payload) => {
      if (payload?.timezone) {
        state.timezone = payload.timezone;
      }
      initDatepicker();
      state.datepicker.set('disable', [disableUnavailableDates]);
      const firstAvailable = isoDay(state.minDate);
      state.datepicker.setDate(firstAvailable, true, 'Y-m-d');
      handleDateSelection(firstAvailable);
      setTimezoneLabel();
    };

    const refreshAvailability = async () => {
      computeBounds();
      showLoading(true);
      setStateMessage('info', 'Refreshing availability…');
      const shouldMock = window.location.protocol === 'file:';
      try {
        if (shouldMock) {
          throw new Error('Skip fetch on file protocol');
        }
        const data = await fetchAvailabilityWindow(state.minDate, state.maxDate, state.timezone);
        state.usingMock = false;
        applyAvailability(data);
      } catch (error) {
        console.warn('[booking] Falling back to mock availability', error.message);
        state.usingMock = true;
        const mock = buildMockAvailability(state.minDate, state.maxDate);
        applyAvailability(mock);
        setStateMessage('warning', 'Live booking is almost ready. These slots are examples.');
      } finally {
        showLoading(false);
      }
    };

    // Hidden timezone must still reflect detected preference
    setTimezoneLabel();

    const updateSelectedLabel = (dateObj) => {
      if (!selectedLabel) return;
      if (!dateObj || Number.isNaN(dateObj.getTime())) {
        selectedLabel.textContent = 'Pick a date to view available times.';
        return;
      }
      try {
        const formatter = new Intl.DateTimeFormat('en', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          timeZone: state.timezone,
        });
        selectedLabel.textContent = `Selected: ${formatter.format(dateObj)}`;
      } catch (_err) {
        selectedLabel.textContent = `Selected: ${dateObj.toDateString()}`;
      }
    };

    const showFormError = (message) => {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.hidden = !message;
    };

    const showFormSuccess = (show) => {
      if (successEl) successEl.hidden = !show;
    };

    const disableForm = () => {
      submitBtn.disabled = true;
      submitBtn.dataset.loading = 'true';
    };

    const enableForm = () => {
      submitBtn.disabled = !state.selectedSlot;
      delete submitBtn.dataset.loading;
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      showFormError('');
      showFormSuccess(false);
      const formData = new FormData(form);
      const payload = {
        name: formData.get('name')?.trim() || 'Intro Call Guest',
        email: formData.get('email')?.trim(),
        timezone: formData.get('timezone') || state.timezone,
        agenda: formData.get('agenda')?.trim() || '',
        slot: formData.get('slot'),
      };
      if (!payload.slot) {
        showFormError('Pick a time slot before submitting.');
        return;
      }
      disableForm();
      try {
        const response = await fetch('/api/calls/book', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error(`Booking failed (${response.status})`);
        }
        showFormSuccess(true);
        form.reset();
        hiddenSlotInput.value = '';
        state.selectedSlot = null;
        state.selectedDate = null;
        state.datepicker?.clear();
        refreshAvailability();
        updateSelectedLabel(null);
      } catch (error) {
        console.error('[booking] submit failed', error);
        showFormError('Something went wrong booking your call. Please try again or email developer@discordgenius.com.');
      } finally {
        enableForm();
      }
    });

    computeBounds();
    refreshAvailability().finally(() => {
      setTimezoneLabel();
      updateSelectedLabel(null);
      initDatepicker();
      enableForm();
    });
  }

  function populateTimezones(select, preferred, fallback) {
    const placeholder = select.querySelector('option[value=""]');
    if (placeholder) {
      placeholder.selected = false;
    }
    const values = typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : ['Etc/GMT', 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'];
    const fragment = document.createDocumentFragment();
    values.forEach((tz) => {
      const option = document.createElement('option');
      option.value = tz;
      option.textContent = tz;
      fragment.appendChild(option);
    });
    select.appendChild(fragment);
    const target = values.includes(preferred) ? preferred : fallback;
    select.value = target;
  }

  function startOfDay(date) {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  function startOfWeek(date) {
    const d = startOfDay(date);
    const day = d.getUTCDay();
    const diff = (day + 6) % 7;
    d.setUTCDate(d.getUTCDate() - diff);
    return d;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() + days);
    return d;
  }

  function isoDay(date) {
    return date.toISOString().slice(0, 10);
  }

  function clampToRange(date, min, max) {
    if (date.getTime() < min.getTime()) return new Date(min);
    if (date.getTime() > max.getTime()) return new Date(max);
    return date;
  }

  function formatWeekday(date, timezone) {
    try {
      return new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: timezone }).format(date);
    } catch (_err) {
      return new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date);
    }
  }

  function formatMonthDay(date, timezone) {
    try {
      return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: timezone }).format(date);
    } catch (_err) {
      return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
    }
  }

  function formatSlotLabel(slotIso, timezone) {
    const date = new Date(slotIso);
    try {
      return new Intl.DateTimeFormat('en', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: timezone,
      }).format(date);
    } catch (_err) {
      return new Intl.DateTimeFormat('en', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    }
  }

  function buildMockAvailability(startDate, endDate) {
    const slots = {};
    for (let cursor = new Date(startDate); cursor <= endDate; cursor = addDays(cursor, 1)) {
      const key = isoDay(cursor);
      slots[key] = [9, 11, 14, 16].map((hour) => {
        const slot = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate(), hour, 0, 0));
        return slot.toISOString();
      });
    }
    return {
      timezone: 'Etc/GMT',
      durationMinutes: 15,
      slots,
    };
  }

  async function fetchAvailabilityWindow(rangeStart, rangeEnd, timezone) {
    const params = new URLSearchParams({
      start: isoDay(rangeStart),
      end: isoDay(rangeEnd),
      timezone,
    });
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 5000) : null;
    try {
      const response = await fetch(`/api/calls/availability?${params.toString()}`, {
        headers: { Accept: 'application/json' },
        signal: controller?.signal,
      });
      if (!response.ok) {
        throw new Error(`Availability request failed with ${response.status}`);
      }
      return response.json();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
})();




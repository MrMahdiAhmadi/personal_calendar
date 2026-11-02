/* =====================================================================
   Pomodoro Timer Module (Persistent Floating Timer, Notification & Calendar Sync)
   ===================================================================== */

let pomodoroState = {
  isRunning: false,
  isPaused: false,
  mode: "focus",        // "focus" | "shortBreak" | "longBreak"
  secondsLeft: 25 * 60,
  intervalId: null,
  isCollapsed: false,
  // The block target to which this timer belongs
  activeTarget: null,   // { weekKey, dayId, blockIndex }
  settings: {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 30, // Default synced with schedule break block duration
    sessionsUntilLong: 3  // 3 * 25m = 75m focus + 2 * 5m short = 85m ~ 90m work block
  }
};

let defaultDocumentTitle = document.title || "24-Hour Time Blocking Planner";

/**
 * Returns the corresponding calendar break block metadata for a given target work block.
 */
function pomodoroGetNextCalendarBreak(target) {
  if (!target || typeof SCHEDULE_METADATA === 'undefined') return null;
  const currentMeta = SCHEDULE_METADATA[target.blockIndex];
  if (!currentMeta) return null;

  // If this is a work block, look for the next break block
  if (currentMeta.type === 'work') {
    // Next block index in cyclic/linear schedule
    const nextIdx = target.blockIndex + 1;
    if (nextIdx < SCHEDULE_METADATA.length && SCHEDULE_METADATA[nextIdx].type === 'break') {
      return {
        blockIndex: nextIdx,
        meta: SCHEDULE_METADATA[nextIdx],
        durationMins: SCHEDULE_METADATA[nextIdx].durationMins
      };
    }
  }

  // Fallback to configured break block minutes
  const breakMins = (typeof AppSettings !== 'undefined' && AppSettings.get)
    ? (AppSettings.get('breakBlockMins') || 30)
    : 30;

  return {
    blockIndex: target.blockIndex + 1,
    meta: null,
    durationMins: breakMins
  };
}

/**
 * Calculates long break minutes and sessions count dynamically based on the target block.
 */
function pomodoroSyncSettingsForTarget(target) {
  if (!target || typeof SCHEDULE_METADATA === 'undefined') return;
  const meta = SCHEDULE_METADATA[target.blockIndex];
  if (!meta) return;

  const workDuration = meta.durationMins || 90;
  // If work block is 90 min: 3 sessions of 25m (75m work + 2*5m break = 85m ~ 90m)
  // If 50-60 min: 2 sessions
  // If <= 30 min: 1 session
  if (workDuration <= 30) {
    pomodoroState.settings.sessionsUntilLong = 1;
  } else if (workDuration <= 60) {
    pomodoroState.settings.sessionsUntilLong = 2;
  } else if (workDuration <= 100) {
    pomodoroState.settings.sessionsUntilLong = 3;
  } else {
    pomodoroState.settings.sessionsUntilLong = 4;
  }

  const nextBreak = pomodoroGetNextCalendarBreak(target);
  if (nextBreak && nextBreak.durationMins) {
    pomodoroState.settings.longBreakMinutes = nextBreak.durationMins;
  }
}

/**
 * Returns the total duration in seconds for a given timer mode.
 */
function pomodoroGetDurationForMode(mode) {
  if (mode === 'shortBreak') {
    return pomodoroState.settings.shortBreakMinutes * 60;
  } else if (mode === 'longBreak') {
    return pomodoroState.settings.longBreakMinutes * 60;
  }
  return pomodoroState.settings.focusMinutes * 60;
}

/**
 * Requests Notification permission if not already granted or denied.
 */
function pomodoroRequestNotificationPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(err => {
        console.warn('Notification permission error:', err);
      });
    }
  }
}

/**
 * Triggers a browser desktop notification if permitted.
 */
function pomodoroSendNotification(title, body) {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body: body,
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        tag: 'pomodoro-timer'
      });
      notif.onclick = () => {
        window.focus();
        if (pomodoroState.activeTarget && typeof openEditModal === 'function') {
          const { weekKey, dayId, blockIndex } = pomodoroState.activeTarget;
          openEditModal(weekKey, dayId, blockIndex);
        }
        notif.close();
      };
    } catch (e) {
      console.warn('Error showing Notification:', e);
    }
  }
}

/**
 * Updates document.title to show live time and status.
 */
function pomodoroUpdateDocumentTitle() {
  if (!pomodoroState.isRunning && !pomodoroState.isPaused) {
    document.title = defaultDocumentTitle;
    return;
  }

  const mins = Math.floor(pomodoroState.secondsLeft / 60);
  const secs = pomodoroState.secondsLeft % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  let modeLabel = '🍅';
  if (pomodoroState.mode === 'shortBreak') {
    modeLabel = '☕';
  } else if (pomodoroState.mode === 'longBreak') {
    modeLabel = '🌴';
  }

  const pauseIndicator = pomodoroState.isPaused ? '⏸ ' : '';
  document.title = `${pauseIndicator}(${timeStr}) ${modeLabel} | ${defaultDocumentTitle}`;
}

/**
 * Plays a gentle, pleasant beep using the Web Audio API without external files.
 */
function pomodoroPlayBeep() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (e) {
    console.warn('AudioContext playback error:', e);
  }
}

/**
 * Initializes or binds the Pomodoro section inside openEditModal().
 * Reads block pomodoro stats, handles active vs inactive timer.
 */
function pomodoroInit() {
  if (!activeModalTarget) return;

  const currentIsActiveTimer = pomodoroState.activeTarget &&
    pomodoroState.activeTarget.weekKey === activeModalTarget.weekKey &&
    pomodoroState.activeTarget.dayId === activeModalTarget.dayId &&
    pomodoroState.activeTarget.blockIndex === activeModalTarget.blockIndex;

  const timerActiveElsewhere = (pomodoroState.isRunning || pomodoroState.isPaused) &&
    pomodoroState.activeTarget && !currentIsActiveTimer;

  // Manage "Timer running for another block" warning/switch UI inside modal
  const conflictBanner = document.getElementById('pomodoroActiveConflictBanner');
  if (conflictBanner) {
    if (timerActiveElsewhere) {
      conflictBanner.classList.remove('hidden');
      const otherBlock = getBlockData(pomodoroState.activeTarget.weekKey, pomodoroState.activeTarget.dayId, pomodoroState.activeTarget.blockIndex);
      const otherMeta = SCHEDULE_METADATA[pomodoroState.activeTarget.blockIndex];
      const otherTitle = (otherBlock && otherBlock.title) || (otherMeta ? getDefaultBlockTitle(otherMeta) : 'Block');
      const textEl = document.getElementById('pomodoroConflictText');
      if (textEl) {
        textEl.textContent = I18N.t('pomodoro_active_other_block', { title: otherTitle });
      }
    } else {
      conflictBanner.classList.add('hidden');
    }
  }

  // If timer is already running for this block, preserve its state!
  if (currentIsActiveTimer) {
    pomodoroUpdateDisplay();
    pomodoroUpdateModePills();
    pomodoroUpdateFloatingBar();
    return;
  }

  // If timer is not running at all, set target to this opened block
  if (!pomodoroState.isRunning && !pomodoroState.isPaused) {
    pomodoroState.activeTarget = { ...activeModalTarget };
    pomodoroSyncSettingsForTarget(pomodoroState.activeTarget);
    pomodoroState.mode = 'focus';
    pomodoroState.secondsLeft = pomodoroGetDurationForMode('focus');
    pomodoroUpdateDisplay();
    pomodoroUpdateModePills();
    pomodoroUpdateFloatingBar();
  } else {
    // Timer is active on another block, but still render the current modal stats
    pomodoroUpdateDisplay();
    pomodoroUpdateModePills();
  }
}

/**
 * Switches the active timer target to the current active modal target block.
 */
function pomodoroSwitchToCurrentModalTarget() {
  if (!activeModalTarget) return;

  // Reset current timer
  if (pomodoroState.intervalId) {
    clearInterval(pomodoroState.intervalId);
    pomodoroState.intervalId = null;
  }

  pomodoroState.isRunning = false;
  pomodoroState.isPaused = false;
  pomodoroState.activeTarget = { ...activeModalTarget };
  pomodoroSyncSettingsForTarget(pomodoroState.activeTarget);
  pomodoroState.mode = 'focus';
  pomodoroState.secondsLeft = pomodoroGetDurationForMode('focus');

  pomodoroInit();
  pomodoroUpdateFloatingBar();
  pomodoroUpdateDocumentTitle();
  if (typeof showToast === 'function') {
    showToast(I18N.t('pomodoro_switch_to_this_block'));
  }
}

/**
 * Starts or resumes the countdown interval.
 */
function pomodoroStart() {
  if (pomodoroState.isRunning) return;

  // Request browser notification permission gently on first start
  pomodoroRequestNotificationPermission();

  // If no target set, use active modal target if present
  if (!pomodoroState.activeTarget && activeModalTarget) {
    pomodoroState.activeTarget = { ...activeModalTarget };
    pomodoroSyncSettingsForTarget(pomodoroState.activeTarget);
  }

  pomodoroState.isRunning = true;
  pomodoroState.isPaused = false;

  if (pomodoroState.intervalId) {
    clearInterval(pomodoroState.intervalId);
  }

  pomodoroState.intervalId = setInterval(pomodoroTick, 1000);
  pomodoroUpdateDisplay();
  pomodoroUpdateFloatingBar();
  pomodoroUpdateDocumentTitle();
}

/**
 * Pauses the interval, preserving secondsLeft.
 */
function pomodoroPause() {
  if (!pomodoroState.isRunning) return;

  if (pomodoroState.intervalId) {
    clearInterval(pomodoroState.intervalId);
    pomodoroState.intervalId = null;
  }

  pomodoroState.isRunning = false;
  pomodoroState.isPaused = true;
  pomodoroUpdateDisplay();
  pomodoroUpdateFloatingBar();
  pomodoroUpdateDocumentTitle();
}

/**
 * Clears interval, resets secondsLeft to current mode duration.
 */
function pomodoroReset() {
  if (pomodoroState.intervalId) {
    clearInterval(pomodoroState.intervalId);
    pomodoroState.intervalId = null;
  }

  pomodoroState.isRunning = false;
  pomodoroState.isPaused = false;
  pomodoroState.secondsLeft = pomodoroGetDurationForMode(pomodoroState.mode);

  pomodoroUpdateDisplay();
  pomodoroUpdateFloatingBar();
  pomodoroUpdateDocumentTitle();
}

/**
 * Called every 1000ms by setInterval.
 */
function pomodoroTick() {
  if (pomodoroState.secondsLeft > 0) {
    pomodoroState.secondsLeft--;
    pomodoroUpdateDisplay();
    pomodoroUpdateFloatingBar();
    pomodoroUpdateDocumentTitle();
  }

  if (pomodoroState.secondsLeft <= 0) {
    if (pomodoroState.intervalId) {
      clearInterval(pomodoroState.intervalId);
      pomodoroState.intervalId = null;
    }
    pomodoroState.isRunning = false;
    pomodoroState.isPaused = false;
    pomodoroOnSessionComplete();
  }
}

/**
 * Handles timer completion for focus or break sessions.
 */
function pomodoroOnSessionComplete() {
  pomodoroPlayBeep();

  const target = pomodoroState.activeTarget;
  let targetBlockTitle = '';
  if (target) {
    const block = getBlockData(target.weekKey, target.dayId, target.blockIndex);
    const meta = SCHEDULE_METADATA[target.blockIndex];
    targetBlockTitle = (block && block.title) || (meta ? getDefaultBlockTitle(meta) : 'Block');
  }

  if (pomodoroState.mode === 'focus') {
    // Show toast and browser notification
    if (typeof showToast === 'function') {
      showToast(I18N.t('pomodoro_session_done'));
    }
    pomodoroSendNotification(
      I18N.t('pomodoro_notif_focus_title'),
      `${targetBlockTitle ? targetBlockTitle + ' — ' : ''}${I18N.t('pomodoro_notif_focus_body')}`
    );

    // Persist stats to active target block
    let blockSessions = 0;
    if (target) {
      const { weekKey, dayId, blockIndex } = target;
      const block = getBlockData(weekKey, dayId, blockIndex);
      if (!block.pomodoro) {
        block.pomodoro = { sessions: 0, totalFocusMinutes: 0 };
      }
      block.pomodoro.sessions = (block.pomodoro.sessions || 0) + 1;
      block.pomodoro.totalFocusMinutes = (block.pomodoro.totalFocusMinutes || 0) + pomodoroState.settings.focusMinutes;
      blockSessions = block.pomodoro.sessions;
      pomodoroSaveStatsForTarget(target);
    }

    // Check if sessions reached the threshold for the long break
    const cycleLimit = pomodoroState.settings.sessionsUntilLong || 3;
    const isLong = (blockSessions % cycleLimit === 0);

    if (isLong) {
      // Synchronize with the next Calendar Break block!
      const nextBreak = pomodoroGetNextCalendarBreak(target);
      if (nextBreak && nextBreak.meta) {
        const breakTitle = getDefaultBlockTitle(nextBreak.meta);
        if (typeof showToast === 'function') {
          showToast(I18N.t('pomodoro_calendar_break_started', { title: breakTitle }));
        }
      }
      pomodoroSetMode('longBreak');
    } else {
      pomodoroSetMode('shortBreak');
    }
  } else {
    // Break finished
    if (typeof showToast === 'function') {
      showToast(I18N.t('pomodoro_break_done'));
    }
    pomodoroSendNotification(
      I18N.t('pomodoro_notif_break_title'),
      I18N.t('pomodoro_notif_break_body')
    );
    pomodoroSetMode('focus');
  }

  pomodoroUpdateFloatingBar();
  pomodoroUpdateDocumentTitle();
}

/**
 * Switches between "focus" | "shortBreak" | "longBreak", resets timer.
 */
function pomodoroSetMode(mode) {
  if (pomodoroState.intervalId) {
    clearInterval(pomodoroState.intervalId);
    pomodoroState.intervalId = null;
  }

  pomodoroState.mode = mode;
  pomodoroState.isRunning = false;
  pomodoroState.isPaused = false;
  pomodoroState.secondsLeft = pomodoroGetDurationForMode(mode);

  pomodoroUpdateModePills();
  pomodoroUpdateDisplay();
  pomodoroUpdateFloatingBar();
  pomodoroUpdateDocumentTitle();
}

/**
 * Updates the mode pills active/inactive classes inside modal.
 */
function pomodoroUpdateModePills() {
  const pills = {
    focus: document.getElementById('pomodoroModeFocus'),
    shortBreak: document.getElementById('pomodoroModeShortBreak'),
    longBreak: document.getElementById('pomodoroModeLongBreak')
  };

  const activeClasses = ['bg-indigo-600', 'text-white', 'shadow-sm'];
  const inactiveClasses = ['text-slate-600', 'dark:text-slate-400', 'hover:text-slate-900', 'dark:hover:text-slate-200'];

  Object.entries(pills).forEach(([m, el]) => {
    if (!el) return;
    if (m === pomodoroState.mode) {
      el.classList.add(...activeClasses);
      el.classList.remove(...inactiveClasses);
      el.classList.add('font-semibold');
      el.classList.remove('font-medium');
    } else {
      el.classList.remove(...activeClasses);
      el.classList.add(...inactiveClasses);
      el.classList.remove('font-semibold');
      el.classList.add('font-medium');
    }
  });

  // Calendar sync hint on long break
  const longBreakHint = document.getElementById('pomodoroLongBreakCalendarHint');
  if (longBreakHint) {
    if (pomodoroState.mode === 'longBreak') {
      longBreakHint.classList.remove('hidden');
      const durationMins = pomodoroState.settings.longBreakMinutes;
      longBreakHint.textContent = I18N.t('pomodoro_calendar_break_desc', { mins: durationMins });
    } else {
      longBreakHint.classList.add('hidden');
    }
  }
}

/**
 * Formats total minutes as "1h 15m" or "45m" (hiding hours if 0).
 */
function pomodoroFormatFocusTime(totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  }
  return `${mins}m`;
}

/**
 * Updates #pomodoroDisplay, progress bar, session dots, stats, and buttons inside modal.
 */
function pomodoroUpdateDisplay() {
  // 1. MM:SS Countdown Display
  const mins = Math.floor(pomodoroState.secondsLeft / 60);
  const secs = pomodoroState.secondsLeft % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const displayEl = document.getElementById('pomodoroDisplay');
  if (displayEl) {
    displayEl.textContent = timeStr;
  }

  // 2. Progress Bar
  const totalDuration = pomodoroGetDurationForMode(pomodoroState.mode);
  const percent = totalDuration > 0 ? (pomodoroState.secondsLeft / totalDuration) * 100 : 0;
  const progressBar = document.getElementById('pomodoroProgressBar');
  if (progressBar) {
    progressBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    if (pomodoroState.mode === 'focus') {
      progressBar.classList.add('bg-indigo-500');
      progressBar.classList.remove('bg-emerald-500');
    } else {
      progressBar.classList.add('bg-emerald-500');
      progressBar.classList.remove('bg-indigo-500');
    }
  }

  // 3. Action buttons (Start / Pause / Resume)
  const startBtn = document.getElementById('pomodoroStartBtn');
  const startBtnLabel = document.getElementById('pomodoroStartBtnLabel');
  const pauseBtn = document.getElementById('pomodoroPauseBtn');

  if (startBtn && pauseBtn) {
    if (pomodoroState.isRunning) {
      startBtn.classList.add('hidden');
      startBtn.classList.remove('flex');
      pauseBtn.classList.remove('hidden');
      pauseBtn.classList.add('flex');
    } else {
      startBtn.classList.remove('hidden');
      startBtn.classList.add('flex');
      pauseBtn.classList.add('hidden');
      pauseBtn.classList.remove('flex');

      if (startBtnLabel) {
        startBtnLabel.textContent = pomodoroState.isPaused
          ? I18N.t('pomodoro_resume')
          : I18N.t('pomodoro_start');
      }
    }
  }

  // 4. Session dots and Block Stats
  // Display target block stats (either active modal block or timer target)
  const target = (typeof activeModalTarget !== 'undefined' && activeModalTarget) ? activeModalTarget : pomodoroState.activeTarget;
  let sessions = 0;
  let totalFocusMinutes = 0;
  if (target) {
    const { weekKey, dayId, blockIndex } = target;
    const block = getBlockData(weekKey, dayId, blockIndex);
    if (block && block.pomodoro) {
      sessions = block.pomodoro.sessions || 0;
      totalFocusMinutes = block.pomodoro.totalFocusMinutes || 0;
    }
  }

  const dotsEl = document.getElementById('pomodoroSessionDots');
  const ratioEl = document.getElementById('pomodoroSessionRatio');
  const statsEl = document.getElementById('pomodoroFocusStat');

  if (dotsEl) {
    const cycleLimit = pomodoroState.settings.sessionsUntilLong || 3;
    const filledInCycle = sessions % cycleLimit;
    let dotsHtml = '';
    for (let i = 0; i < cycleLimit; i++) {
      if (i < filledInCycle) {
        dotsHtml += '<span class="text-indigo-500">●</span>';
      } else {
        dotsHtml += '<span class="text-slate-300 dark:text-slate-600">○</span>';
      }
    }
    dotsEl.innerHTML = dotsHtml;

    if (ratioEl) {
      ratioEl.textContent = `(${filledInCycle} of ${cycleLimit})`;
    }
  }

  if (statsEl) {
    statsEl.textContent = pomodoroFormatFocusTime(totalFocusMinutes);
  }
}

/**
 * Updates the Persistent Floating Timer Bar on the main page.
 */
function pomodoroUpdateFloatingBar() {
  const bar = document.getElementById('pomodoroFloatingBar');
  if (!bar) return;

  // Show floating bar if timer is running or paused
  const shouldShow = pomodoroState.isRunning || pomodoroState.isPaused;
  if (!shouldShow) {
    bar.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
    bar.classList.remove('translate-y-0', 'opacity-100');
    return;
  }

  bar.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none');
  bar.classList.add('translate-y-0', 'opacity-100');

  // Time String
  const mins = Math.floor(pomodoroState.secondsLeft / 60);
  const secs = pomodoroState.secondsLeft % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const timeEl = document.getElementById('pomodoroFloatingTime');
  if (timeEl) {
    timeEl.textContent = timeStr;
  }

  // Progress Bar
  const totalDuration = pomodoroGetDurationForMode(pomodoroState.mode);
  const percent = totalDuration > 0 ? (pomodoroState.secondsLeft / totalDuration) * 100 : 0;
  const progressEl = document.getElementById('pomodoroFloatingProgress');
  if (progressEl) {
    progressEl.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    if (pomodoroState.mode === 'focus') {
      progressEl.classList.add('bg-indigo-500');
      progressEl.classList.remove('bg-emerald-500');
    } else {
      progressEl.classList.add('bg-emerald-500');
      progressEl.classList.remove('bg-indigo-500');
    }
  }

  // Mode Icon & Label
  const modeBadge = document.getElementById('pomodoroFloatingModeBadge');
  const targetTitleEl = document.getElementById('pomodoroFloatingTargetTitle');

  if (modeBadge) {
    if (pomodoroState.mode === 'focus') {
      modeBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center gap-1';
      modeBadge.innerHTML = '<span>🍅</span> <span>' + I18N.t('pomodoro_focus') + '</span>';
    } else if (pomodoroState.mode === 'shortBreak') {
      modeBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1';
      modeBadge.innerHTML = '<span>☕</span> <span>' + I18N.t('pomodoro_short_break') + '</span>';
    } else {
      modeBadge.className = 'px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1';
      modeBadge.innerHTML = '<span>🌴</span> <span>' + I18N.t('pomodoro_long_break') + '</span>';
    }
  }

  if (targetTitleEl && pomodoroState.activeTarget) {
    const { weekKey, dayId, blockIndex } = pomodoroState.activeTarget;
    const block = getBlockData(weekKey, dayId, blockIndex);
    const meta = SCHEDULE_METADATA[blockIndex];
    const title = (block && block.title) || (meta ? getDefaultBlockTitle(meta) : 'Focus Block');
    targetTitleEl.textContent = title;
  }

  // Floating Play / Pause Buttons
  const playBtn = document.getElementById('pomodoroFloatingPlayBtn');
  const pauseBtn = document.getElementById('pomodoroFloatingPauseBtn');

  if (playBtn && pauseBtn) {
    if (pomodoroState.isRunning) {
      playBtn.classList.add('hidden');
      pauseBtn.classList.remove('hidden');
    } else {
      playBtn.classList.remove('hidden');
      pauseBtn.classList.add('hidden');
    }
  }
}

/**
 * Opens the target block's edit modal from the floating bar.
 */
function pomodoroOpenTargetBlockModal() {
  if (!pomodoroState.activeTarget) return;
  const { weekKey, dayId, blockIndex } = pomodoroState.activeTarget;
  if (typeof openEditModal === 'function') {
    openEditModal(weekKey, dayId, blockIndex);
  }
}

/**
 * Writes completed session data back to the block via getBlockData() + saveAppData().
 */
function pomodoroSaveStatsForTarget(target) {
  if (!target) return;
  const { weekKey, dayId, blockIndex } = target;
  const block = getBlockData(weekKey, dayId, blockIndex);

  saveAppData();

  if (typeof SupabaseSync !== 'undefined' && SupabaseSync.isConfigured) {
    SupabaseSync.upsertBlock(weekKey, dayId, blockIndex, block);
  }
}

/**
 * Backward compatibility alias for pomodoroSaveStats.
 */
function pomodoroSaveStats() {
  if (pomodoroState.activeTarget) {
    pomodoroSaveStatsForTarget(pomodoroState.activeTarget);
  } else if (activeModalTarget) {
    pomodoroSaveStatsForTarget(activeModalTarget);
  }
}

/**
 * Toggles collapse state of #pomodoroSection.
 */
function pomodoroToggleCollapse() {
  pomodoroState.isCollapsed = !pomodoroState.isCollapsed;
  const section = document.getElementById('pomodoroSection');
  const icon = document.getElementById('pomodoroToggleIcon');

  if (section) {
    if (pomodoroState.isCollapsed) {
      section.classList.add('hidden');
    } else {
      section.classList.remove('hidden');
    }
  }

  if (icon) {
    if (pomodoroState.isCollapsed) {
      icon.classList.add('-rotate-90');
    } else {
      icon.classList.remove('-rotate-90');
    }
  }
}

/**
 * Non-destructive cleanup when edit modal closes:
 * Keeps interval running and shows floating timer bar!
 */
function pomodoroCleanup() {
  // We do NOT clear interval here so timer keeps counting in background!
  pomodoroUpdateFloatingBar();
}

// Wire Event Listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('pomodoroToggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', pomodoroToggleCollapse);
  }

  const startBtn = document.getElementById('pomodoroStartBtn');
  if (startBtn) {
    startBtn.addEventListener('click', pomodoroStart);
  }

  const pauseBtn = document.getElementById('pomodoroPauseBtn');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', pomodoroPause);
  }

  const resetBtn = document.getElementById('pomodoroResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', pomodoroReset);
  }

  const modeFocus = document.getElementById('pomodoroModeFocus');
  if (modeFocus) {
    modeFocus.addEventListener('click', () => pomodoroSetMode('focus'));
  }

  const modeShort = document.getElementById('pomodoroModeShortBreak');
  if (modeShort) {
    modeShort.addEventListener('click', () => pomodoroSetMode('shortBreak'));
  }

  const modeLong = document.getElementById('pomodoroModeLongBreak');
  if (modeLong) {
    modeLong.addEventListener('click', () => pomodoroSetMode('longBreak'));
  }

  // Conflict switch button inside block modal
  const conflictSwitchBtn = document.getElementById('pomodoroConflictSwitchBtn');
  if (conflictSwitchBtn) {
    conflictSwitchBtn.addEventListener('click', pomodoroSwitchToCurrentModalTarget);
  }

  // Floating Bar Controls
  const floatingPlayBtn = document.getElementById('pomodoroFloatingPlayBtn');
  if (floatingPlayBtn) {
    floatingPlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      pomodoroStart();
    });
  }

  const floatingPauseBtn = document.getElementById('pomodoroFloatingPauseBtn');
  if (floatingPauseBtn) {
    floatingPauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      pomodoroPause();
    });
  }

  const floatingResetBtn = document.getElementById('pomodoroFloatingResetBtn');
  if (floatingResetBtn) {
    floatingResetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      pomodoroReset();
    });
  }

  const floatingOpenBtn = document.getElementById('pomodoroFloatingOpenBtn');
  if (floatingOpenBtn) {
    floatingOpenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      pomodoroOpenTargetBlockModal();
    });
  }

  const floatingBar = document.getElementById('pomodoroFloatingBar');
  if (floatingBar) {
    floatingBar.addEventListener('click', (e) => {
      // If clicked on bar background, open the block modal
      if (!e.target.closest('button')) {
        pomodoroOpenTargetBlockModal();
      }
    });
  }
});

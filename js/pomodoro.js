/* =====================================================================
   Pomodoro Timer Module for Block Edit Modal
   ===================================================================== */

let pomodoroState = {
  isRunning: false,
  isPaused: false,
  mode: "focus",        // "focus" | "shortBreak" | "longBreak"
  secondsLeft: 25 * 60,
  intervalId: null,
  isCollapsed: false,
  settings: {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    sessionsUntilLong: 4
  }
};

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

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.warn('AudioContext playback error:', e);
  }
}

/**
 * Initializes the Pomodoro section inside openEditModal().
 * Reads the block's pomodoro stats, resets timer state, syncs UI.
 */
function pomodoroInit() {
  // Clear any existing running timer
  pomodoroCleanup();

  pomodoroState.mode = 'focus';
  pomodoroState.secondsLeft = pomodoroGetDurationForMode('focus');
  pomodoroState.isRunning = false;
  pomodoroState.isPaused = false;

  // Render stats and timer UI
  pomodoroUpdateDisplay();
  pomodoroUpdateModePills();
}

/**
 * Starts or resumes the countdown interval.
 */
function pomodoroStart() {
  if (pomodoroState.isRunning) return;

  pomodoroState.isRunning = true;
  pomodoroState.isPaused = false;

  if (pomodoroState.intervalId) {
    clearInterval(pomodoroState.intervalId);
  }

  pomodoroState.intervalId = setInterval(pomodoroTick, 1000);
  pomodoroUpdateDisplay();
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
}

/**
 * Called every 1000ms by setInterval.
 */
function pomodoroTick() {
  if (pomodoroState.secondsLeft > 0) {
    pomodoroState.secondsLeft--;
    pomodoroUpdateDisplay();
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

  if (pomodoroState.mode === 'focus') {
    if (typeof showToast === 'function') {
      showToast(I18N.t('pomodoro_session_done'));
    }

    // Persist stats to current block
    let blockSessions = 0;
    if (activeModalTarget) {
      const { weekKey, dayId, blockIndex } = activeModalTarget;
      const block = getBlockData(weekKey, dayId, blockIndex);
      if (!block.pomodoro) {
        block.pomodoro = { sessions: 0, totalFocusMinutes: 0 };
      }
      block.pomodoro.sessions = (block.pomodoro.sessions || 0) + 1;
      block.pomodoro.totalFocusMinutes = (block.pomodoro.totalFocusMinutes || 0) + pomodoroState.settings.focusMinutes;
      blockSessions = block.pomodoro.sessions;
      pomodoroSaveStats();
    }

    // Auto-switch to break mode
    // Every 4 sessions -> long break; otherwise short break
    const isLong = (blockSessions % pomodoroState.settings.sessionsUntilLong === 0);
    const nextMode = isLong ? 'longBreak' : 'shortBreak';
    pomodoroSetMode(nextMode);
  } else {
    // Break finished
    if (typeof showToast === 'function') {
      showToast(I18N.t('pomodoro_break_done'));
    }
    pomodoroSetMode('focus');
  }
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
}

/**
 * Updates the mode pills active/inactive classes.
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
 * Updates #pomodoroDisplay, progress bar, session dots, stats, and buttons.
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
  let sessions = 0;
  let totalFocusMinutes = 0;
  if (activeModalTarget) {
    const { weekKey, dayId, blockIndex } = activeModalTarget;
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
    const cycleLimit = pomodoroState.settings.sessionsUntilLong;
    const filledInCycle = sessions % cycleLimit;
    // e.g. filled = 3 -> ●●●○
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
 * Writes completed session data back to the block via getBlockData() + saveAppData().
 * Also upserts to Supabase if configured.
 */
function pomodoroSaveStats() {
  if (!activeModalTarget) return;
  const { weekKey, dayId, blockIndex } = activeModalTarget;
  const block = getBlockData(weekKey, dayId, blockIndex);

  saveAppData();

  if (typeof SupabaseSync !== 'undefined' && SupabaseSync.isConfigured) {
    SupabaseSync.upsertBlock(weekKey, dayId, blockIndex, block);
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
 * Clears interval, stops any running timer without persisting ephemeral state.
 * Called in closeEditModal().
 */
function pomodoroCleanup() {
  if (pomodoroState.intervalId) {
    clearInterval(pomodoroState.intervalId);
    pomodoroState.intervalId = null;
  }
  pomodoroState.isRunning = false;
  pomodoroState.isPaused = false;
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
});

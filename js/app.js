/* =====================================================================
   Main Application Entry & Event Wiring (Bilingual Support)
   ===================================================================== */

window.addEventListener('DOMContentLoaded', () => {
  // 0. Load App Settings early
  if (typeof AppSettings !== 'undefined' && AppSettings.load) {
    AppSettings.load();
    if (typeof generateScheduleDefinition === 'function') {
      SCHEDULE_METADATA = generateScheduleDefinition(
        AppSettings.get('workBlockMins'),
        AppSettings.get('breakBlockMins'),
        AppSettings.get('bedtime'),
        AppSettings.get('wakeTime')
      );
    }
  }

  // Service Worker Registration for PWA / Offline Support
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('[SW] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[SW] Service Worker registration failed:', err);
        });
    });
  }

  // 1. Initialize Internationalization (Default: English)
  I18N.init();

  // 2. Initialize Supabase Client
  SupabaseSync.init();

  // 3. Setup Supabase connection status listener
  SupabaseSync.onStatusChange((status) => {
    const badge = document.getElementById('supabaseStatusBadge');
    if (!badge) return;

    if (status === 'connected') {
      badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 cursor-pointer hover:opacity-80 transition';
      badge.innerHTML = `<span class="status-indicator-dot bg-emerald-500"></span><span>${I18N.t('cloud_connected')}</span>`;
      badge.title = 'Supabase Connected';
    } else if (status === 'syncing') {
      badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 cursor-pointer hover:opacity-80 transition';
      badge.innerHTML = `<span class="status-indicator-dot bg-indigo-500 animate-ping"></span><span>${I18N.t('cloud_syncing')}</span>`;
      badge.title = 'Syncing...';
    } else {
      badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800 cursor-pointer hover:opacity-80 transition';
      badge.innerHTML = `<span class="status-indicator-dot bg-amber-500"></span><span>${I18N.t('cloud_local')}</span>`;
      badge.title = 'Local Storage Mode';
    }
  });

  // 4. Load Application Data
  loadAppData();
  populateTagsDropdowns();
  renderCustomTagsList();
  syncViewButtonsUI();
  updateHideBreaksUI();
  renderDayTabs();
  renderCurrentView();

  // 5. Live Iran Clock
  setInterval(updateLiveIranTicker, 1000);

  // Network Online / Offline Status Listener
  function updateNetworkStatus() {
    const offlineBadge = document.getElementById('offlineStatusBadge');
    if (!offlineBadge) return;
    if (navigator.onLine) {
      offlineBadge.classList.add('hidden');
      offlineBadge.classList.remove('inline-flex');
    } else {
      offlineBadge.classList.remove('hidden');
      offlineBadge.classList.add('inline-flex');
      if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
      }
    }
  }

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();

  // 6. Mobile Tools Toolbar Toggle
  const mobileToolsToggleBtn = document.getElementById('mobileToolsToggleBtn');
  const headerActionsToolbar = document.getElementById('headerActionsToolbar');
  if (mobileToolsToggleBtn && headerActionsToolbar) {
    mobileToolsToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = headerActionsToolbar.classList.contains('hidden');
      if (isHidden) {
        headerActionsToolbar.classList.remove('hidden');
        headerActionsToolbar.classList.add('flex');
        mobileToolsToggleBtn.classList.add('bg-indigo-100', 'dark:bg-indigo-950', 'text-indigo-600', 'dark:text-indigo-400');
      } else {
        headerActionsToolbar.classList.add('hidden');
        headerActionsToolbar.classList.remove('flex');
        headerActionsToolbar.classList.remove('bg-indigo-100', 'dark:bg-indigo-950', 'text-indigo-600', 'dark:text-indigo-400');
      }
    });

    // Close mobile toolbar if clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth < 768 && !headerActionsToolbar.contains(e.target) && e.target !== mobileToolsToggleBtn) {
        headerActionsToolbar.classList.add('hidden');
        headerActionsToolbar.classList.remove('flex');
        mobileToolsToggleBtn.classList.remove('bg-indigo-100', 'dark:bg-indigo-950', 'text-indigo-600', 'dark:text-indigo-400');
      }
    });
  }

  // 6a. Keyboard Shortcuts Modal Listeners
  const shortcutsBtn = document.getElementById('shortcutsBtn');
  if (shortcutsBtn) shortcutsBtn.addEventListener('click', openShortcutsModal);

  const closeShortcutsModalBtn = document.getElementById('closeShortcutsModalBtn');
  if (closeShortcutsModalBtn) closeShortcutsModalBtn.addEventListener('click', closeShortcutsModal);

  const doneShortcutsModalBtn = document.getElementById('doneShortcutsModalBtn');
  if (doneShortcutsModalBtn) doneShortcutsModalBtn.addEventListener('click', closeShortcutsModal);

  const shortcutsModal = document.getElementById('shortcutsModal');
  if (shortcutsModal) {
    shortcutsModal.addEventListener('click', (e) => {
      if (e.target.id === 'shortcutsModal') closeShortcutsModal();
    });
  }

  // 6b. Settings Modal Listeners
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) settingsBtn.addEventListener('click', openSettingsModal);

  const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
  if (closeSettingsModalBtn) closeSettingsModalBtn.addEventListener('click', closeSettingsModal);

  const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
  if (cancelSettingsBtn) cancelSettingsBtn.addEventListener('click', closeSettingsModal);

  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', saveSettingsModalChanges);

  // Block duration and sleep time live calculation listeners inside settings modal
  const workBlockInput = document.getElementById('settingsWorkBlockInput');
  const breakBlockInput = document.getElementById('settingsBreakBlockInput');
  const bedtimeInput = document.getElementById('settingsBedtimeInput');
  const wakeTimeInput = document.getElementById('settingsWakeTimeInput');

  if (workBlockInput) {
    workBlockInput.addEventListener('input', () => {
      if (typeof updateSettingsCyclesHelper === 'function') updateSettingsCyclesHelper();
    });
  }
  if (bedtimeInput) {
    bedtimeInput.addEventListener('input', () => {
      if (typeof updateSettingsCyclesHelper === 'function') updateSettingsCyclesHelper();
    });
  }
  if (wakeTimeInput) {
    wakeTimeInput.addEventListener('input', () => {
      if (typeof updateSettingsCyclesHelper === 'function') updateSettingsCyclesHelper();
    });
  }
  if (breakBlockInput) {
    breakBlockInput.addEventListener('input', () => {
      if (typeof updateSettingsCyclesHelper === 'function') updateSettingsCyclesHelper();
    });
  }

  // Timezone radio listeners inside settings modal
  const tzTypeRadios = document.querySelectorAll('input[name="settingsTimezoneType"]');
  tzTypeRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      const customTzContainer = document.getElementById('settingsCustomTzContainer');
      const customTzInput = document.getElementById('settingsCustomTzInput');
      const tzError = document.getElementById('settingsTzError');
      if (radio.value === 'custom') {
        if (customTzContainer) customTzContainer.classList.remove('hidden');
        if (customTzInput && !customTzInput.value) customTzInput.value = 'Asia/Tehran';
      } else {
        if (customTzContainer) customTzContainer.classList.add('hidden');
        if (tzError) tzError.classList.add('hidden');
      }
    });
  });

  // 7. Supabase Modal Listeners
  const supabaseBadge = document.getElementById('supabaseStatusBadge');
  if (supabaseBadge) supabaseBadge.addEventListener('click', openSupabaseModal);

  const openSupabaseBtn = document.getElementById('openSupabaseBtn');
  if (openSupabaseBtn) openSupabaseBtn.addEventListener('click', openSupabaseModal);

  const closeSupabaseBtn = document.getElementById('closeSupabaseBtn');
  if (closeSupabaseBtn) closeSupabaseBtn.addEventListener('click', closeSupabaseModal);

  const saveSupabaseBtn = document.getElementById('saveSupabaseBtn');
  if (saveSupabaseBtn) saveSupabaseBtn.addEventListener('click', saveSupabaseSettings);

  const uploadToSupabaseBtn = document.getElementById('uploadToSupabaseBtn');
  if (uploadToSupabaseBtn) uploadToSupabaseBtn.addEventListener('click', uploadLocalDataToSupabase);

  // 8. Tasks Hub Listeners
  document.getElementById('openTasksHubBtn').addEventListener('click', openTasksHubModal);
  document.getElementById('openTasksHubFromBlockBtn').addEventListener('click', openTasksHubModal);
  document.getElementById('closeTasksHubBtn').addEventListener('click', closeTasksHubModal);
  document.getElementById('doneTasksHubBtn').addEventListener('click', closeTasksHubModal);
  document.getElementById('tasksHubAddNewTaskBtn').addEventListener('click', addSharedTaskFromHub);
  document.getElementById('tasksHubNewTaskTitle').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSharedTaskFromHub();
    }
  });

  // 9. Quick task addition in Block Modal
  document.getElementById('modalQuickAddTaskBtn').addEventListener('click', addQuickTaskFromBlock);
  document.getElementById('modalQuickNewTaskInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addQuickTaskFromBlock();
    }
  });

  document.getElementById('modalTagSelect').addEventListener('change', () => {
    renderModalBlockTasks();
  });

  // 10. Toggle Hide/Show Breaks
  document.getElementById('toggleBreaksBtn').addEventListener('click', () => {
    hideBreaks = !hideBreaks;
    SafeStorage.setItem(CONFIG.HIDE_BREAKS_KEY, hideBreaks);
    updateHideBreaksUI();
    renderCurrentView();
    showToast(hideBreaks ? I18N.t('toast_block_reset') : I18N.t('toast_block_saved'));
  });

  // 11. View Modes
  document.getElementById('viewWeeklyMatrixBtn').addEventListener('click', () => {
    currentViewMode = 'weekly';
    SafeStorage.setItem(CONFIG.VIEW_KEY, 'weekly');
    syncViewButtonsUI();
    renderDayTabs();
    renderCurrentView();
  });

  document.getElementById('viewDailyVerticalBtn').addEventListener('click', () => {
    currentViewMode = 'daily-vertical';
    SafeStorage.setItem(CONFIG.VIEW_KEY, 'daily-vertical');
    syncViewButtonsUI();
    renderDayTabs();
    renderCurrentView();
  });

  document.getElementById('viewDailyHorizontalBtn').addEventListener('click', () => {
    currentViewMode = 'daily-horizontal';
    SafeStorage.setItem(CONFIG.VIEW_KEY, 'daily-horizontal');
    syncViewButtonsUI();
    renderDayTabs();
    renderCurrentView();
  });

  // 12. Week Navigation
  document.getElementById('prevWeekBtn').addEventListener('click', () => {
    weekOffset--;
    renderCurrentView();
  });
  document.getElementById('nextWeekBtn').addEventListener('click', () => {
    weekOffset++;
    renderCurrentView();
  });
  document.getElementById('todayWeekBtn').addEventListener('click', () => {
    weekOffset = 0;
    const currentTime = getCurrentTime();
    selectedDayId = currentTime.todayIranDayId;
    renderDayTabs();
    renderCurrentView();
  });

  // 13. Theme toggle
  document.getElementById('themeToggleBtn').addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    SafeStorage.setItem(CONFIG.THEME_KEY, isDark ? 'dark' : 'light');
  });

  // 14. Dropdowns (Reset & Backup)
  const resetMenuBtn = document.getElementById('resetMenuBtn');
  const resetDropdown = document.getElementById('resetDropdown');
  const backupMenuBtn = document.getElementById('backupMenuBtn');
  const backupDropdown = document.getElementById('backupDropdown');

  resetMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetDropdown.classList.toggle('hidden');
    backupDropdown.classList.add('hidden');
  });

  backupMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    backupDropdown.classList.toggle('hidden');
    resetDropdown.classList.add('hidden');
  });

  document.addEventListener('click', () => {
    resetDropdown.classList.add('hidden');
    backupDropdown.classList.add('hidden');
  });

  // 15. Reset Operations
  document.getElementById('triggerResetDayBtn').addEventListener('click', () => {
    resetDropdown.classList.add('hidden');
    promptResetDay();
  });
  document.getElementById('triggerResetWeekBtn').addEventListener('click', () => {
    resetDropdown.classList.add('hidden');
    promptResetWeek();
  });

  document.getElementById('confirmCancelBtn').addEventListener('click', closeConfirmDialog);
  document.getElementById('confirmAcceptBtn').addEventListener('click', () => {
    if (typeof pendingConfirmAction === 'function') {
      pendingConfirmAction();
    }
    closeConfirmDialog();
  });

  // 16. Backup Operations
  document.getElementById('exportJsonBtn').addEventListener('click', exportToJson);
  document.getElementById('copyJsonBtn').addEventListener('click', copyJsonToClipboard);
  document.getElementById('importJsonInput').addEventListener('change', importFromJson);
  document.getElementById('pasteJsonBtn').addEventListener('click', () => {
    backupDropdown.classList.add('hidden');
    openPasteBackupModal();
  });
  document.getElementById('closePasteBackupBtn').addEventListener('click', closePasteBackupModal);
  document.getElementById('cancelPasteBackupBtn').addEventListener('click', closePasteBackupModal);
  document.getElementById('applyPasteBackupBtn').addEventListener('click', applyPastedBackup);

  // 17. Jump to current active block
  document.getElementById('jumpCurrentBtn').addEventListener('click', scrollToCurrentBlock);

  // 18. Block Modal listeners
  document.getElementById('closeModalBtn').addEventListener('click', closeEditModal);
  document.getElementById('modalCancelBtn').addEventListener('click', closeEditModal);
  document.getElementById('modalSaveBtn').addEventListener('click', saveBlockModalChanges);

  // 19. Tags Manager Modal listeners
  document.getElementById('openTagsMgrBtn').addEventListener('click', openTagsModal);
  document.getElementById('openTagsMgrFromModal').addEventListener('click', openTagsModal);
  document.getElementById('closeTagsModalBtn').addEventListener('click', closeTagsModal);
  document.getElementById('doneTagsModalBtn').addEventListener('click', closeTagsModal);
  document.getElementById('addNewTagBtn').addEventListener('click', addNewCustomTag);

  // 20. Backdrop dismissals
  document.getElementById('blockModal').addEventListener('click', (e) => {
    if (e.target.id === 'blockModal') closeEditModal();
  });
  document.getElementById('tasksHubModal').addEventListener('click', (e) => {
    if (e.target.id === 'tasksHubModal') closeTasksHubModal();
  });
  document.getElementById('tagsModal').addEventListener('click', (e) => {
    if (e.target.id === 'tagsModal') closeTagsModal();
  });
  document.getElementById('pasteBackupModal').addEventListener('click', (e) => {
    if (e.target.id === 'pasteBackupModal') closePasteBackupModal();
  });
  document.getElementById('confirmDialog').addEventListener('click', (e) => {
    if (e.target.id === 'confirmDialog') closeConfirmDialog();
  });
  const sbModal = document.getElementById('supabaseModal');
  if (sbModal) {
    sbModal.addEventListener('click', (e) => {
      if (e.target.id === 'supabaseModal') closeSupabaseModal();
    });
  }

  // 21. Global Keyboard Navigation & Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEditModal();
      closeTasksHubModal();
      closeTagsModal();
      closePasteBackupModal();
      closeConfirmDialog();
      closeSupabaseModal();
      closeSettingsModal();
      closeShortcutsModal();
      return;
    }

    // Ignore single key shortcuts if user is currently typing in an input, textarea, or select
    const targetTag = e.target.tagName;
    if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT' || e.target.isContentEditable) {
      return;
    }

    // Also ignore if Ctrl / Meta / Alt is held down so we don't interfere with browser shortcuts
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    const key = e.key.toLowerCase();

    if (e.key === '?' || (e.shiftKey && key === '/')) {
      e.preventDefault();
      const modal = document.getElementById('shortcutsModal');
      if (modal && !modal.classList.contains('hidden')) {
        closeShortcutsModal();
      } else {
        openShortcutsModal();
      }
    } else if (key === 'w') {
      e.preventDefault();
      currentViewMode = 'weekly';
      SafeStorage.setItem(CONFIG.VIEW_KEY, 'weekly');
      syncViewButtonsUI();
      renderDayTabs();
      renderCurrentView();
    } else if (key === 'v') {
      e.preventDefault();
      currentViewMode = 'daily-vertical';
      SafeStorage.setItem(CONFIG.VIEW_KEY, 'daily-vertical');
      syncViewButtonsUI();
      renderDayTabs();
      renderCurrentView();
    } else if (key === 'h') {
      e.preventDefault();
      currentViewMode = 'daily-horizontal';
      SafeStorage.setItem(CONFIG.VIEW_KEY, 'daily-horizontal');
      syncViewButtonsUI();
      renderDayTabs();
      renderCurrentView();
    } else if (key === 't') {
      e.preventDefault();
      weekOffset = 0;
      const currentTime = getCurrentTime();
      selectedDayId = currentTime.todayIranDayId;
      renderDayTabs();
      renderCurrentView();
    } else if (key === 'j') {
      e.preventDefault();
      scrollToCurrentBlock();
    } else if (e.key === '[') {
      e.preventDefault();
      weekOffset--;
      renderCurrentView();
    } else if (e.key === ']') {
      e.preventDefault();
      weekOffset++;
      renderCurrentView();
    } else if (key === 'b') {
      e.preventDefault();
      const hubModal = document.getElementById('tasksHubModal');
      if (hubModal && !hubModal.classList.contains('hidden')) {
        closeTasksHubModal();
      } else {
        openTasksHubModal();
      }
    }
  });

  const settingsModal = document.getElementById('settingsModal');
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target.id === 'settingsModal') closeSettingsModal();
    });
  }
});

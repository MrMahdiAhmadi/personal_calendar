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

  // Service Worker Registration for PWA / Offline Support with instant update detection
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('[SW] Service Worker registered with scope:', reg.scope);

          // Proactively check for new service worker on deploy
          reg.update().catch(() => {});

          // Check for updates when tab or app returns to foreground
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              reg.update().catch(() => {});
            }
          });
        })
        .catch((err) => {
          console.warn('[SW] Service Worker registration failed:', err);
        });
    });

    // When the new Service Worker activates and takes control, seamlessly reload if an update occurred
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('[SW] New version activated, reloading to latest deployment...');
        window.location.reload();
      }
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

  // 4. Load Application Data from Local Cache for Instant Paint
  loadAppData();
  populateTagsDropdowns();
  renderCustomTagsList();
  syncViewButtonsUI();
  updateHideBreaksUI();
  renderDayTabs();
  renderCurrentView();

  // If Supabase is configured and browser is online, immediately fetch authoritative cloud state
  if (SupabaseSync.isConfigured && navigator.onLine && typeof syncFromSupabase === 'function') {
    syncFromSupabase();
  }

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

  window.addEventListener('online', () => {
    updateNetworkStatus();
    if (typeof triggerDatabaseSync === 'function') {
      triggerDatabaseSync(false);
    }
  });
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();

  // Note: Background auto-sync on focus/visibilitychange intentionally removed to prevent unexpected overwrites or race conditions.

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

  // 6b. Settings Modal Listeners & Tabs
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) settingsBtn.addEventListener('click', () => openSettingsModal('preferences'));

  const tabBtnPref = document.getElementById('settingsTabBtn-preferences');
  const tabBtnCloud = document.getElementById('settingsTabBtn-cloud');
  const tabBtnBackup = document.getElementById('settingsTabBtn-backup');
  const tabBtnTags = document.getElementById('settingsTabBtn-tags');

  if (tabBtnPref) tabBtnPref.addEventListener('click', () => switchSettingsTab('preferences'));
  if (tabBtnCloud) tabBtnCloud.addEventListener('click', () => switchSettingsTab('cloud'));
  if (tabBtnBackup) tabBtnBackup.addEventListener('click', () => switchSettingsTab('backup'));
  if (tabBtnTags) tabBtnTags.addEventListener('click', () => switchSettingsTab('tags'));

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
  const openTasksHubBtn = document.getElementById('openTasksHubBtn');
  if (openTasksHubBtn) openTasksHubBtn.addEventListener('click', openTasksHubModal);

  const openTasksHubFromBlockBtn = document.getElementById('openTasksHubFromBlockBtn');
  if (openTasksHubFromBlockBtn) openTasksHubFromBlockBtn.addEventListener('click', openTasksHubModal);

  const closeTasksHubBtn = document.getElementById('closeTasksHubBtn');
  if (closeTasksHubBtn) closeTasksHubBtn.addEventListener('click', closeTasksHubModal);

  const doneTasksHubBtn = document.getElementById('doneTasksHubBtn');
  if (doneTasksHubBtn) doneTasksHubBtn.addEventListener('click', closeTasksHubModal);

  const tasksHubAddNewTaskBtn = document.getElementById('tasksHubAddNewTaskBtn');
  if (tasksHubAddNewTaskBtn) tasksHubAddNewTaskBtn.addEventListener('click', addSharedTaskFromHub);

  const tasksHubNewTaskTitle = document.getElementById('tasksHubNewTaskTitle');
  if (tasksHubNewTaskTitle) {
    tasksHubNewTaskTitle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSharedTaskFromHub();
      }
    });
  }

  // 8b. Time Insights Modal Listeners
  const openInsightsBtn = document.getElementById('openInsightsBtn');
  if (openInsightsBtn) openInsightsBtn.addEventListener('click', openInsightsModal);

  const closeInsightsModalBtn = document.getElementById('closeInsightsModalBtn');
  if (closeInsightsModalBtn) closeInsightsModalBtn.addEventListener('click', closeInsightsModal);

  const doneInsightsModalBtn = document.getElementById('doneInsightsModalBtn');
  if (doneInsightsModalBtn) doneInsightsModalBtn.addEventListener('click', closeInsightsModal);

  const insightsModal = document.getElementById('insightsModal');
  if (insightsModal) {
    insightsModal.addEventListener('click', (e) => {
      if (e.target.id === 'insightsModal') closeInsightsModal();
    });
  }

  // 8c. Mobile Bottom Navigation Listeners
  const mobileNavToday = document.getElementById('mobileNavToday');
  const mobileNavWeek = document.getElementById('mobileNavWeek');
  const mobileNavTasks = document.getElementById('mobileNavTasks');
  const mobileNavInsights = document.getElementById('mobileNavInsights');

  if (mobileNavToday) {
    mobileNavToday.addEventListener('click', () => {
      weekOffset = 0;
      const currentTime = getCurrentTime();
      selectedDayId = currentTime.todayIranDayId;
      currentViewMode = 'daily-vertical';
      SafeStorage.setItem(CONFIG.VIEW_KEY, 'daily-vertical');
      syncViewButtonsUI();
      renderDayTabs();
      renderCurrentView();
      scrollToCurrentBlock();
    });
  }

  if (mobileNavWeek) {
    mobileNavWeek.addEventListener('click', () => {
      currentViewMode = 'weekly';
      SafeStorage.setItem(CONFIG.VIEW_KEY, 'weekly');
      syncViewButtonsUI();
      renderDayTabs();
      renderCurrentView();
    });
  }

  if (mobileNavTasks) {
    mobileNavTasks.addEventListener('click', () => {
      openTasksHubModal();
    });
  }

  if (mobileNavInsights) {
    mobileNavInsights.addEventListener('click', () => {
      openInsightsModal();
    });
  }

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

  // 12. Week Navigation & Routine Automation
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

  // Copy Previous Week Routine
  const copyPrevWeekBtn = document.getElementById('copyPrevWeekBtn');
  if (copyPrevWeekBtn) {
    copyPrevWeekBtn.addEventListener('click', copyPreviousWeekRoutine);
  }

  // Routine Templates Modal Listeners
  const openTemplatesBtn = document.getElementById('openTemplatesBtn');
  if (openTemplatesBtn) {
    openTemplatesBtn.addEventListener('click', openTemplatesModal);
  }

  const closeTemplatesModalBtn = document.getElementById('closeTemplatesModalBtn');
  if (closeTemplatesModalBtn) {
    closeTemplatesModalBtn.addEventListener('click', closeTemplatesModal);
  }

  const doneTemplatesModalBtn = document.getElementById('doneTemplatesModalBtn');
  if (doneTemplatesModalBtn) {
    doneTemplatesModalBtn.addEventListener('click', closeTemplatesModal);
  }

  const saveWeekAsTemplateBtn = document.getElementById('saveWeekAsTemplateBtn');
  if (saveWeekAsTemplateBtn) {
    saveWeekAsTemplateBtn.addEventListener('click', saveCurrentWeekAsTemplate);
  }

  const newTemplateNameInput = document.getElementById('newTemplateNameInput');
  if (newTemplateNameInput) {
    newTemplateNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveCurrentWeekAsTemplate();
      }
    });
  }

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

  if (resetMenuBtn && resetDropdown) {
    resetMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetDropdown.classList.toggle('hidden');
      if (backupDropdown) backupDropdown.classList.add('hidden');
    });
  }

  if (backupMenuBtn && backupDropdown) {
    backupMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      backupDropdown.classList.toggle('hidden');
      if (resetDropdown) resetDropdown.classList.add('hidden');
    });
  }

  document.addEventListener('click', () => {
    if (resetDropdown) resetDropdown.classList.add('hidden');
    if (backupDropdown) backupDropdown.classList.add('hidden');
  });

  // 15. Reset Operations
  const triggerResetDayBtn = document.getElementById('triggerResetDayBtn');
  if (triggerResetDayBtn) {
    triggerResetDayBtn.addEventListener('click', () => {
      if (resetDropdown) resetDropdown.classList.add('hidden');
      promptResetDay();
    });
  }

  const triggerResetWeekBtn = document.getElementById('triggerResetWeekBtn');
  if (triggerResetWeekBtn) {
    triggerResetWeekBtn.addEventListener('click', () => {
      if (resetDropdown) resetDropdown.classList.add('hidden');
      promptResetWeek();
    });
  }

  const triggerClearLocalStoreBtn = document.getElementById('triggerClearLocalStoreBtn');
  if (triggerClearLocalStoreBtn) {
    triggerClearLocalStoreBtn.addEventListener('click', () => {
      if (typeof promptClearLocalStore === 'function') {
        promptClearLocalStore();
      }
    });
  }

  const triggerClearCloudDbBtn = document.getElementById('triggerClearCloudDbBtn');
  if (triggerClearCloudDbBtn) {
    triggerClearCloudDbBtn.addEventListener('click', () => {
      if (typeof promptClearCloudDatabase === 'function') {
        promptClearCloudDatabase();
      }
    });
  }

  const confirmCancelBtn = document.getElementById('confirmCancelBtn');
  if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', closeConfirmDialog);

  const confirmAcceptBtn = document.getElementById('confirmAcceptBtn');
  if (confirmAcceptBtn) {
    confirmAcceptBtn.addEventListener('click', () => {
      if (typeof pendingConfirmAction === 'function') {
        pendingConfirmAction();
      }
      closeConfirmDialog();
    });
  }

  // 16. Backup Operations
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportToJson);

  const copyJsonBtn = document.getElementById('copyJsonBtn');
  if (copyJsonBtn) copyJsonBtn.addEventListener('click', copyJsonToClipboard);

  const importJsonInput = document.getElementById('importJsonInput');
  if (importJsonInput) importJsonInput.addEventListener('change', importFromJson);

  const pasteJsonBtn = document.getElementById('pasteJsonBtn');
  if (pasteJsonBtn) {
    pasteJsonBtn.addEventListener('click', () => {
      if (backupDropdown) backupDropdown.classList.add('hidden');
      openPasteBackupModal();
    });
  }

  const closePasteBackupBtn = document.getElementById('closePasteBackupBtn');
  if (closePasteBackupBtn) closePasteBackupBtn.addEventListener('click', closePasteBackupModal);

  const cancelPasteBackupBtn = document.getElementById('cancelPasteBackupBtn');
  if (cancelPasteBackupBtn) cancelPasteBackupBtn.addEventListener('click', closePasteBackupModal);

  const applyPasteBackupBtn = document.getElementById('applyPasteBackupBtn');
  if (applyPasteBackupBtn) applyPasteBackupBtn.addEventListener('click', applyPastedBackup);

  // 17. Manual Database Sync Button Listener
  const manualSyncBtn = document.getElementById('manualSyncBtn');
  if (manualSyncBtn) {
    manualSyncBtn.addEventListener('click', () => {
      if (typeof triggerDatabaseSync === 'function') {
        triggerDatabaseSync(true);
      }
    });
  }

  // 17b. Jump to current active block
  document.getElementById('jumpCurrentBtn').addEventListener('click', scrollToCurrentBlock);

  // 18. Block Modal listeners
  document.getElementById('closeModalBtn').addEventListener('click', saveBlockModalChanges);
  document.getElementById('modalCancelBtn').addEventListener('click', closeEditModal);
  document.getElementById('modalSaveBtn').addEventListener('click', saveBlockModalChanges);

  // 19. Tags Manager Modal listeners
  const openTagsMgrBtn = document.getElementById('openTagsMgrBtn');
  if (openTagsMgrBtn) openTagsMgrBtn.addEventListener('click', openTagsModal);

  const openTagsMgrFromModal = document.getElementById('openTagsMgrFromModal');
  if (openTagsMgrFromModal) openTagsMgrFromModal.addEventListener('click', openTagsModal);

  const addNewTagBtn = document.getElementById('addNewTagBtn');
  if (addNewTagBtn) addNewTagBtn.addEventListener('click', addNewCustomTag);

  // 20. Backdrop dismissals
  const blockModal = document.getElementById('blockModal');
  if (blockModal) {
    blockModal.addEventListener('click', (e) => {
      if (e.target.id === 'blockModal') saveBlockModalChanges();
    });
  }

  const tasksHubModal = document.getElementById('tasksHubModal');
  if (tasksHubModal) {
    tasksHubModal.addEventListener('click', (e) => {
      if (e.target.id === 'tasksHubModal') closeTasksHubModal();
    });
  }

  const tmplModal = document.getElementById('templatesModal');
  if (tmplModal) {
    tmplModal.addEventListener('click', (e) => {
      if (e.target.id === 'templatesModal') closeTemplatesModal();
    });
  }
  document.getElementById('pasteBackupModal').addEventListener('click', (e) => {
    if (e.target.id === 'pasteBackupModal') closePasteBackupModal();
  });
  document.getElementById('confirmDialog').addEventListener('click', (e) => {
    if (e.target.id === 'confirmDialog') closeConfirmDialog();
  });

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
      closeTemplatesModal();
      closeInsightsModal();
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

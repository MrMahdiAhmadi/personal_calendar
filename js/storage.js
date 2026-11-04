/* =====================================================================
   Safe Storage Engine & App State Manager
   ===================================================================== */

const SafeStorage = {
  memoryStore: {},
  isAvailable() {
    try {
      const test = '__tb_test__';
      window.localStorage.setItem(test, test);
      window.localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  },
  getItem(key) {
    if (this.isAvailable()) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {}
    }
    return this.memoryStore[key] || null;
  },
  setItem(key, value) {
    if (this.isAvailable()) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (e) {}
    }
    this.memoryStore[key] = String(value);
  }
};

const AppSettings = {
  _data: { ...DEFAULT_SETTINGS },

  load() {
    try {
      const saved = localStorage.getItem(CONFIG.SETTINGS_KEY);
      if (saved) this._data = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch(e) {}
    return this;
  },

  save() {
    try {
      localStorage.setItem(CONFIG.SETTINGS_KEY, JSON.stringify(this._data));
    } catch(e) {}
  },

  get(key) { return this._data[key]; },

  set(key, value) {
    this._data[key] = value;
    this.save();
  },

  getTimezone() {
    const tz = this._data.timezone;
    if (tz === 'system') {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tehran';
      } catch (e) {
        return 'Asia/Tehran';
      }
    }
    return tz;
  }
};

/* Application State */
let customTags = [];
let sharedTasksBank = []; // Array of { id, tagId, title, completed, completedAt }
let weeklyTemplates = []; // Array of { id, name, createdAt, blocksData: { dayId: { blockIndex: { title, tagId, notes, blockTasks } } } }
let weekOffset = 0;
let selectedDayId = 'sat';
let currentViewMode = 'weekly';
let hideBreaks = false;
let activeHubFilterTag = 'all';

// weeksData[weekKey][dayId][blockIndex] = { title, status, tagId, notes, blockTasks }
let weeksData = {};

let activeModalTarget = null; // { weekKey, dayId, blockIndex }
let pendingConfirmAction = null;

function loadAppData() {
  // 1. Tags
  try {
    const storedTags = SafeStorage.getItem(CONFIG.TAGS_KEY);
    customTags = storedTags ? JSON.parse(storedTags) : [...DEFAULT_TAGS];
  } catch (e) {
    customTags = [...DEFAULT_TAGS];
  }

  // 2. Shared Tasks Bank
  try {
    const storedTasks = SafeStorage.getItem(CONFIG.TASKS_BANK_KEY);
    const parsedTasks = storedTasks ? JSON.parse(storedTasks) : [...DEFAULT_TASK_BANK];
    sharedTasksBank = parsedTasks.map(t => ({
      ...t,
      completed: !!t.completed,
      completedAt: t.completedAt || null
    }));
  } catch (e) {
    sharedTasksBank = [...DEFAULT_TASK_BANK];
  }

  // 3. Master blocks data
  try {
    const storedData = SafeStorage.getItem(CONFIG.STORAGE_KEY);
    weeksData = storedData ? JSON.parse(storedData) : {};
  } catch (e) {
    weeksData = {};
  }

  // 3.5 Weekly Templates
  try {
    const storedTemplates = SafeStorage.getItem(CONFIG.TEMPLATES_KEY);
    weeklyTemplates = storedTemplates ? JSON.parse(storedTemplates) : [];
  } catch (e) {
    weeklyTemplates = [];
  }

  // 4. Preferences
  hideBreaks = SafeStorage.getItem(CONFIG.HIDE_BREAKS_KEY) === 'true';
  const savedView = SafeStorage.getItem(CONFIG.VIEW_KEY);
  if (savedView && ['weekly', 'daily-vertical', 'daily-horizontal'].includes(savedView)) {
    currentViewMode = savedView;
  } else if (window.innerWidth < 768) {
    // Default to daily vertical on mobile screens for a vastly better touch experience
    currentViewMode = 'daily-vertical';
  }

  const savedTheme = SafeStorage.getItem(CONFIG.THEME_KEY);
  if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }

  const currentTime = typeof getCurrentTime === 'function' ? getCurrentTime() : getIranTime();
  selectedDayId = currentTime.todayIranDayId;
  ensureWeekStructure(getWeekKey(weekOffset));

  // Asynchronously sync from Supabase if connected
  if (typeof SupabaseSync !== 'undefined' && SupabaseSync.isConfigured) {
    syncFromSupabase();
  }

  // Initialize auto-sync scheduler
  initAutoSync();
}

let autoSyncTimerId = null;

function initAutoSync() {
  stopAutoSync();

  const enabled = AppSettings.get('autoSyncEnabled') !== false;
  const intervalMins = parseInt(AppSettings.get('autoSyncInterval'), 10);

  // If enabled and interval > 0, schedule periodic sync
  if (enabled && !isNaN(intervalMins) && intervalMins > 0) {
    const ms = intervalMins * 60 * 1000;
    autoSyncTimerId = setInterval(() => {
      console.log(`[AutoSync] Triggering scheduled sync (${intervalMins}m interval)...`);
      triggerDatabaseSync(false);
    }, ms);
    console.log(`[AutoSync] Scheduled every ${intervalMins} minutes.`);
  } else {
    console.log('[AutoSync] Disabled.');
  }
}

function stopAutoSync() {
  if (autoSyncTimerId) {
    clearInterval(autoSyncTimerId);
    autoSyncTimerId = null;
  }
}

function restartAutoSync() {
  initAutoSync();
}

let isSyncInProgress = false;

async function triggerDatabaseSync(interactive = false) {
  if (isSyncInProgress) {
    if (interactive) {
      showToast(typeof I18N !== 'undefined' ? I18N.t('toast_sync_manual_started') : 'Syncing database...');
    }
    return;
  }

  // Check if Supabase is configured
  if (!SupabaseSync.isConfigured) {
    if (interactive) {
      const msg = typeof I18N !== 'undefined'
        ? I18N.t('toast_sync_not_configured')
        : 'Supabase is not configured yet. Open Settings > Cloud Sync to configure.';
      showToast(msg);
      if (typeof openSettingsModal === 'function') {
        openSettingsModal('cloud');
      }
    }
    return;
  }

  // Check network status
  if (!navigator.onLine) {
    if (interactive) {
      const offlineMsg = typeof I18N !== 'undefined'
        ? I18N.t('offline_tooltip')
        : 'No internet connection. Working fully offline from local cache.';
      showToast(offlineMsg);
    }
    return;
  }

  isSyncInProgress = true;
  setManualSyncBtnSpinning(true);

  if (interactive) {
    const startMsg = typeof I18N !== 'undefined'
      ? I18N.t('toast_sync_manual_started')
      : 'Syncing database...';
    showToast(startMsg);
  }

  try {
    await syncFromSupabase();
    if (interactive) {
      const successMsg = typeof I18N !== 'undefined'
        ? I18N.t('toast_sync_manual_success')
        : 'Database synced successfully ☁️';
      showToast(successMsg);
    }
  } catch (err) {
    console.error('[Sync] Manual/scheduled sync error:', err);
    if (interactive) {
      showToast('Error syncing with database.');
    }
  } finally {
    isSyncInProgress = false;
    setManualSyncBtnSpinning(false);
  }
}

function setManualSyncBtnSpinning(isSpinning) {
  const syncBtn = document.getElementById('manualSyncBtn');
  const syncIcon = document.getElementById('manualSyncIcon');
  if (syncBtn) {
    if (isSpinning) {
      syncBtn.classList.add('pointer-events-none', 'opacity-70');
    } else {
      syncBtn.classList.remove('pointer-events-none', 'opacity-70');
    }
  }
  if (syncIcon) {
    if (isSpinning) {
      syncIcon.classList.add('animate-spin');
    } else {
      syncIcon.classList.remove('animate-spin');
    }
  }
}

async function syncFromSupabase() {
  if (!SupabaseSync.isConfigured) return;

  try {
    const [cloudTags, cloudTasks, cloudBlocks, cloudSettings, cloudTemplates] = await Promise.all([
      SupabaseSync.fetchTags(),
      SupabaseSync.fetchTasks(),
      SupabaseSync.fetchAllBlocks(),
      SupabaseSync.fetchSettings ? SupabaseSync.fetchSettings() : Promise.resolve(null),
      SupabaseSync.fetchTemplates ? SupabaseSync.fetchTemplates() : Promise.resolve(null)
    ]);

    let changed = false;

    if (cloudSettings && typeof cloudSettings === 'object') {
      let scheduleNeedsRebuild = false;
      const rawWork = cloudSettings.workBlockMins;
      const rawBreak = cloudSettings.breakBlockMins;
      const rawBed = cloudSettings.bedtime;
      const rawWake = cloudSettings.wakeTime;
      const rawTz = cloudSettings.timezone;
      const rawCal = cloudSettings.calendarType;
      const rawLang = cloudSettings.language;

      const cloudWork = rawWork !== undefined ? parseInt(rawWork, 10) : NaN;
      const cloudBreak = rawBreak !== undefined ? parseInt(rawBreak, 10) : NaN;

      if (!isNaN(cloudWork) && cloudWork >= 10 && cloudWork <= 180 && cloudWork !== AppSettings.get('workBlockMins')) {
        AppSettings.set('workBlockMins', cloudWork);
        scheduleNeedsRebuild = true;
      }
      if (!isNaN(cloudBreak) && cloudBreak >= 5 && cloudBreak <= 60 && cloudBreak !== AppSettings.get('breakBlockMins')) {
        AppSettings.set('breakBlockMins', cloudBreak);
        scheduleNeedsRebuild = true;
      }
      if (rawBed && typeof rawBed === 'string' && rawBed !== AppSettings.get('bedtime')) {
        AppSettings.set('bedtime', rawBed);
        scheduleNeedsRebuild = true;
      }
      if (rawWake && typeof rawWake === 'string' && rawWake !== AppSettings.get('wakeTime')) {
        AppSettings.set('wakeTime', rawWake);
        scheduleNeedsRebuild = true;
      }
      if (rawTz && typeof rawTz === 'string' && rawTz !== AppSettings.get('timezone')) {
        AppSettings.set('timezone', rawTz);
        changed = true;
      }
      if (rawCal && typeof rawCal === 'string' && rawCal !== AppSettings.get('calendarType')) {
        AppSettings.set('calendarType', rawCal);
        changed = true;
      }
      if (rawLang && typeof rawLang === 'string' && rawLang !== AppSettings.get('language')) {
        AppSettings.set('language', rawLang);
        if (typeof I18N !== 'undefined' && I18N.setLanguage && I18N.currentLang !== rawLang) {
          I18N.setLanguage(rawLang);
        }
        changed = true;
      }

      if (scheduleNeedsRebuild && typeof generateScheduleDefinition === 'function') {
        SCHEDULE_METADATA = generateScheduleDefinition(
          AppSettings.get('workBlockMins'),
          AppSettings.get('breakBlockMins'),
          AppSettings.get('bedtime'),
          AppSettings.get('wakeTime')
        );
        changed = true;

        // If Settings modal is currently open, update its inputs
        const workInput = document.getElementById('settingsWorkBlockInput');
        const breakInput = document.getElementById('settingsBreakBlockInput');
        const bedInput = document.getElementById('settingsBedtimeInput');
        const wakeInput = document.getElementById('settingsWakeTimeInput');
        if (workInput) workInput.value = AppSettings.get('workBlockMins');
        if (breakInput) breakInput.value = AppSettings.get('breakBlockMins');
        if (bedInput) bedInput.value = AppSettings.get('bedtime');
        if (wakeInput) wakeInput.value = AppSettings.get('wakeTime');
        if (typeof updateSettingsCyclesHelper === 'function') updateSettingsCyclesHelper();
      }
    }

    // 1. Supabase as Authoritative Source of Truth for Custom Tags:
    // When Supabase is configured and returns tags, cloud tags define the authoritative set.
    if (cloudTags && Array.isArray(cloudTags)) {
      const tagMap = new Map();
      cloudTags.forEach(t => tagMap.set(t.id, t));

      // If there are existing local custom tags created while offline, also sync them up
      customTags.forEach(localTag => {
        if (!tagMap.has(localTag.id)) {
          tagMap.set(localTag.id, localTag);
          if (SupabaseSync.isConfigured) {
            SupabaseSync.upsertTag(localTag);
          }
        }
      });

      const updatedTags = Array.from(tagMap.values());
      if (JSON.stringify(updatedTags) !== JSON.stringify(customTags)) {
        customTags = updatedTags;
        SafeStorage.setItem(CONFIG.TAGS_KEY, JSON.stringify(customTags));
        if (typeof populateTagsDropdowns === 'function') populateTagsDropdowns();
        if (typeof renderCustomTagsList === 'function') renderCustomTagsList();
        if (typeof renderTasksHubFilterTabs === 'function') renderTasksHubFilterTabs();
        changed = true;
      }
    }

    // 2. Supabase as Authoritative Source of Truth for Task Bank:
    // Cloud task state is the primary reference. Local changes made offline are uploaded.
    if (cloudTasks && Array.isArray(cloudTasks)) {
      const deletedIds = new Set(typeof getDeletedTaskIds === 'function' ? getDeletedTaskIds() : []);
      const cloudTaskMap = new Map();
      cloudTasks.forEach(ct => cloudTaskMap.set(ct.id, ct));

      const mergedTasks = [];
      const seenIds = new Set();

      // Cloud tasks take precedence:
      for (const ct of cloudTasks) {
        if (deletedIds.has(ct.id)) {
          SupabaseSync.deleteTask(ct.id);
          continue;
        }
        mergedTasks.push(ct);
        seenIds.add(ct.id);
      }

      // Check if any offline-created local tasks need to be uploaded to Supabase
      for (const localTask of sharedTasksBank) {
        if (deletedIds.has(localTask.id)) {
          if (cloudTaskMap.has(localTask.id)) {
            SupabaseSync.deleteTask(localTask.id);
          }
          continue;
        }

        if (!seenIds.has(localTask.id)) {
          mergedTasks.push(localTask);
          seenIds.add(localTask.id);
          if (SupabaseSync.isConfigured) {
            SupabaseSync.upsertTask(localTask);
          }
        }
      }

      const beforeStr = JSON.stringify(sharedTasksBank);
      const afterStr = JSON.stringify(mergedTasks);
      if (beforeStr !== afterStr) {
        sharedTasksBank = mergedTasks;
        SafeStorage.setItem(CONFIG.TASKS_BANK_KEY, JSON.stringify(sharedTasksBank));
        if (typeof renderTasksHubList === 'function') renderTasksHubList();
        if (typeof activeModalTarget !== 'undefined' && activeModalTarget && typeof renderModalBlockTasks === 'function') renderModalBlockTasks();
        changed = true;
      }
    }

    // 3. Supabase as Authoritative Source of Truth for Scheduled Blocks:
    // Supabase cloud data is the reference. When Device 2 edits any block, Device 1 reflects it completely.
    if (cloudBlocks && typeof cloudBlocks === 'object') {
      let blocksChanged = false;

      // Supabase is the primary reference: overwrite/update local blocks with cloud blocks
      Object.keys(cloudBlocks).forEach(wKey => {
        if (!weeksData[wKey]) {
          weeksData[wKey] = {};
        }
        Object.keys(cloudBlocks[wKey]).forEach(dId => {
          if (!weeksData[wKey][dId]) {
            weeksData[wKey][dId] = {};
          }
          Object.keys(cloudBlocks[wKey][dId]).forEach(bIdx => {
            const cloudBlock = cloudBlocks[wKey][dId][bIdx];
            const localBlock = weeksData[wKey][dId][bIdx];

            // Normalize block comparison ignoring updatedAt
            const normalizedCloud = {
              title: cloudBlock.title || '',
              status: cloudBlock.status || 'pending',
              tagId: cloudBlock.tagId || 'misc',
              notes: cloudBlock.notes || '',
              blockTasks: cloudBlock.blockTasks || {},
              taskOrder: Array.isArray(cloudBlock.taskOrder) ? cloudBlock.taskOrder : [],
              pomodoro: (cloudBlock.pomodoro && typeof cloudBlock.pomodoro === 'object') ? cloudBlock.pomodoro : { sessions: 0, totalFocusMinutes: 0 }
            };

            const normalizedLocal = localBlock ? {
              title: localBlock.title || '',
              status: localBlock.status || 'pending',
              tagId: localBlock.tagId || 'misc',
              notes: localBlock.notes || '',
              blockTasks: localBlock.blockTasks || {},
              taskOrder: Array.isArray(localBlock.taskOrder) ? localBlock.taskOrder : [],
              pomodoro: (localBlock.pomodoro && typeof localBlock.pomodoro === 'object') ? localBlock.pomodoro : { sessions: 0, totalFocusMinutes: 0 }
            } : null;

            if (!normalizedLocal || JSON.stringify(normalizedLocal) !== JSON.stringify(normalizedCloud)) {
              weeksData[wKey][dId][bIdx] = {
                ...normalizedCloud
              };
              blocksChanged = true;
            }
          });
        });
      });

      // Also check if local memory had blocks that were never pushed to Supabase (e.g. offline created)
      const offlineBlocksToUpload = [];
      Object.keys(weeksData).forEach(wKey => {
        if (wKey.startsWith('__')) return;
        Object.keys(weeksData[wKey] || {}).forEach(dId => {
          Object.keys(weeksData[wKey][dId] || {}).forEach(bIdx => {
            const localBlock = weeksData[wKey][dId][bIdx];
            const hasCloudBlock = cloudBlocks[wKey] && cloudBlocks[wKey][dId] && cloudBlocks[wKey][dId][bIdx];
            if (!hasCloudBlock && localBlock) {
              const hasContent = (localBlock.title && localBlock.title.trim() !== '') ||
                                (localBlock.notes && localBlock.notes.trim() !== '') ||
                                (localBlock.status && localBlock.status !== 'pending') ||
                                (localBlock.blockTasks && Object.keys(localBlock.blockTasks).length > 0) ||
                                (localBlock.tagId && localBlock.tagId !== 'misc');
              if (hasContent) {
                offlineBlocksToUpload.push({
                  weekKey: wKey,
                  dayId: dId,
                  blockIndex: parseInt(bIdx, 10),
                  blockData: localBlock
                });
              }
            }
          });
        });
      });

      if (offlineBlocksToUpload.length > 0 && SupabaseSync.isConfigured) {
        if (typeof SupabaseSync.batchUpsertBlocks === 'function') {
          SupabaseSync.batchUpsertBlocks(offlineBlocksToUpload);
        } else {
          offlineBlocksToUpload.forEach(item => {
            SupabaseSync.upsertBlock(item.weekKey, item.dayId, item.blockIndex, item.blockData);
          });
        }
      }

      if (blocksChanged) {
        SafeStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(weeksData));
        changed = true;
      }
    }

    if (cloudTemplates && Array.isArray(cloudTemplates)) {
      weeklyTemplates = cloudTemplates;
      SafeStorage.setItem(CONFIG.TEMPLATES_KEY, JSON.stringify(weeklyTemplates));
      if (typeof renderTemplatesList === 'function') renderTemplatesList();
      changed = true;
    }

    if (changed) {
      if (typeof renderDayTabs === 'function') renderDayTabs();
      renderCurrentView();
      updateCompletionCounters();
      if (typeof updateLiveIranTicker === 'function') updateLiveIranTicker();
      const toastMsg = (typeof I18N !== 'undefined' && I18N.t)
        ? I18N.t('toast_cloud_synced')
        : 'Data synced with Supabase ☁️';
      showToast(toastMsg);
    }
  } catch (e) {
    console.warn('[Sync] Background sync error:', e);
  }
}

function saveAppData() {
  SafeStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(weeksData));
  updateCompletionCounters();
}

function saveTagsData() {
  SafeStorage.setItem(CONFIG.TAGS_KEY, JSON.stringify(customTags));
  populateTagsDropdowns();
  renderCustomTagsList();
  renderTasksHubFilterTabs();
  renderCurrentView();
}

function saveTasksBank() {
  SafeStorage.setItem(CONFIG.TASKS_BANK_KEY, JSON.stringify(sharedTasksBank));
  renderTasksHubList();
  if (activeModalTarget) {
    renderModalBlockTasks();
  }
  renderCurrentView();
}

function saveTemplatesData(templateToSync = null) {
  SafeStorage.setItem(CONFIG.TEMPLATES_KEY, JSON.stringify(weeklyTemplates));
  if (typeof SupabaseSync !== 'undefined' && SupabaseSync.isConfigured) {
    if (templateToSync) {
      SupabaseSync.upsertTemplate(templateToSync);
    } else {
      // Sync all or save fallback
      weeklyTemplates.forEach(t => SupabaseSync.upsertTemplate(t));
    }
  }
}

// Check if a week has any user-entered content (titles, notes, or tasks)
function getWeekDataSummary(weekKey) {
  const week = weeksData[weekKey];
  if (!week) return { count: 0, tagIds: [] };

  let count = 0;
  const tagSet = new Set();

  DAYS_OF_WEEK.forEach(day => {
    const dayData = week[day.id];
    if (dayData) {
      Object.keys(dayData).forEach(bIdx => {
        const blk = dayData[bIdx];
        if (!blk) return;
        const hasTitle = blk.title && blk.title.trim() !== '';
        const hasNotes = blk.notes && blk.notes.trim() !== '';
        const assignedTasks = Object.keys(blk.blockTasks || {}).filter(k => blk.blockTasks[k].assigned);
        if (hasTitle || hasNotes || assignedTasks.length > 0) {
          count++;
          if (blk.tagId) tagSet.add(blk.tagId);
        }
      });
    }
  });

  return { count, tagIds: Array.from(tagSet) };
}

function hasWeekData(weekKey) {
  return getWeekDataSummary(weekKey).count > 0;
}

// Extract sanitized routine structure from a source week:
// resets status to 'pending', task items completed to false, pomodoro counters reset
function extractRoutineFromWeek(sourceWeekKey) {
  const sourceWeek = weeksData[sourceWeekKey];
  if (!sourceWeek) return null;

  const routine = {};
  let totalBlocks = 0;
  const tagSet = new Set();

  DAYS_OF_WEEK.forEach(day => {
    routine[day.id] = {};
    const dayData = sourceWeek[day.id] || {};
    Object.keys(dayData).forEach(bIdx => {
      const blk = dayData[bIdx];
      if (!blk) return;
      const hasTitle = blk.title && blk.title.trim() !== '';
      const hasNotes = blk.notes && blk.notes.trim() !== '';
      const assignedTasks = Object.keys(blk.blockTasks || {}).filter(k => blk.blockTasks[k].assigned);

      // Only copy blocks that user has customized or given title/notes/tasks
      if (hasTitle || hasNotes || assignedTasks.length > 0 || (blk.tagId && blk.tagId !== 'misc')) {
        totalBlocks++;
        if (blk.tagId) tagSet.add(blk.tagId);

        // Sanitize block tasks: keep assigned flag, set completed to false
        const cleanTasks = {};
        if (blk.blockTasks) {
          Object.keys(blk.blockTasks).forEach(tid => {
            if (blk.blockTasks[tid].assigned) {
              cleanTasks[tid] = {
                assigned: true,
                completed: false
              };
            }
          });
        }

        routine[day.id][bIdx] = {
          title: blk.title || '',
          status: 'pending', // always start fresh!
          tagId: blk.tagId || 'misc',
          notes: blk.notes || '',
          blockTasks: cleanTasks,
          taskOrder: Array.isArray(blk.taskOrder) ? [...blk.taskOrder] : [],
          pomodoro: { sessions: 0, totalFocusMinutes: 0 }
        };
      }
    });
  });

  if (totalBlocks === 0) return null;
  return {
    blocksData: routine,
    totalBlocks,
    tagIds: Array.from(tagSet)
  };
}

// Apply sanitized routine blocks to a target week
function applyRoutineToWeek(targetWeekKey, routineBlocksData) {
  ensureWeekStructure(targetWeekKey);

  // Initialize or clear target week structure
  weeksData[targetWeekKey] = {};
  ensureWeekStructure(targetWeekKey);

  const blocksToSync = [];

  DAYS_OF_WEEK.forEach(day => {
    const dayRoutine = (routineBlocksData && routineBlocksData[day.id]) || {};
    Object.keys(dayRoutine).forEach(bIdx => {
      const blk = dayRoutine[bIdx];
      const parsedIdx = parseInt(bIdx, 10);
      // Clone deeply to avoid reference mutations
      const blockObj = {
        title: blk.title || '',
        status: 'pending',
        tagId: blk.tagId || 'misc',
        notes: blk.notes || '',
        blockTasks: JSON.parse(JSON.stringify(blk.blockTasks || {})),
        taskOrder: Array.isArray(blk.taskOrder) ? [...blk.taskOrder] : [],
        pomodoro: { sessions: 0, totalFocusMinutes: 0 }
      };
      weeksData[targetWeekKey][day.id][parsedIdx] = blockObj;

      blocksToSync.push({
        weekKey: targetWeekKey,
        dayId: day.id,
        blockIndex: parsedIdx,
        blockData: blockObj
      });
    });
  });

  saveAppData();

  if (typeof SupabaseSync !== 'undefined' && SupabaseSync.isConfigured && blocksToSync.length > 0) {
    if (typeof SupabaseSync.batchUpsertBlocks === 'function') {
      SupabaseSync.batchUpsertBlocks(blocksToSync);
    } else {
      blocksToSync.forEach(item => {
        SupabaseSync.upsertBlock(item.weekKey, item.dayId, item.blockIndex, item.blockData);
      });
    }
  }
}

function ensureWeekStructure(weekKey) {
  if (!weeksData[weekKey]) {
    weeksData[weekKey] = {};
  }
  DAYS_OF_WEEK.forEach(day => {
    if (!weeksData[weekKey][day.id]) {
      weeksData[weekKey][day.id] = {};
    }
  });
}

function getBlockData(weekKey, dayId, blockIndex) {
  ensureWeekStructure(weekKey);
  if (!weeksData[weekKey][dayId][blockIndex]) {
    weeksData[weekKey][dayId][blockIndex] = {
      title: '',
      status: 'pending',
      tagId: 'misc',
      notes: '',
      blockTasks: {},
      taskOrder: [],
      pomodoro: {
        sessions: 0,
        totalFocusMinutes: 0
      }
    };
  }
  if (!weeksData[weekKey][dayId][blockIndex].blockTasks) {
    weeksData[weekKey][dayId][blockIndex].blockTasks = {};
  }
  if (!Array.isArray(weeksData[weekKey][dayId][blockIndex].taskOrder)) {
    weeksData[weekKey][dayId][blockIndex].taskOrder = [];
  }
  if (!weeksData[weekKey][dayId][blockIndex].pomodoro) {
    weeksData[weekKey][dayId][blockIndex].pomodoro = {
      sessions: 0,
      totalFocusMinutes: 0
    };
  }
  return weeksData[weekKey][dayId][blockIndex];
}

function updateCompletionCounters() {
  const curWeekKey = getWeekKey(weekOffset);
  ensureWeekStructure(curWeekKey);

  let dayCompleted = 0;
  let weekCompleted = 0;

  // Count only awake blocks (work + winddown) for realistic goal setting
  const metadataList = typeof SCHEDULE_METADATA !== 'undefined' ? SCHEDULE_METADATA : [];
  const awakeBlocks = metadataList.filter(meta => meta.type === 'work' || meta.type === 'winddown');
  const awakeBlockIndices = new Set(awakeBlocks.map(meta => meta.blockIndex));
  const awakeCountPerDay = awakeBlockIndices.size;
  const totalAwakeWeek = awakeCountPerDay * 7;

  DAYS_OF_WEEK.forEach(d => {
    metadataList.forEach(meta => {
      if (awakeBlockIndices.has(meta.blockIndex)) {
        const item = weeksData[curWeekKey][d.id][meta.blockIndex];
        if (item && item.status === 'completed') {
          weekCompleted++;
          if (d.id === selectedDayId) {
            dayCompleted++;
          }
        }
      }
    });
  });

  const dayCounter = document.getElementById('dayCompletedCounter');
  const weekCounter = document.getElementById('weekCompletedCounter');
  if (dayCounter) dayCounter.textContent = `${dayCompleted} / ${awakeCountPerDay}`;
  if (weekCounter) weekCounter.textContent = `${weekCompleted} / ${totalAwakeWeek}`;
}

function getTagById(tagId) {
  return customTags.find(t => t.id === tagId) ||
         customTags.find(t => t.id === 'misc') ||
         customTags[0] ||
         { name: 'متفرقه', color: '#64748b' };
}

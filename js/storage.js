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
let sharedTasksBank = []; // Array of { id, tagId, title }
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
    sharedTasksBank = storedTasks ? JSON.parse(storedTasks) : [...DEFAULT_TASK_BANK];
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
  syncFromSupabase();
}

async function syncFromSupabase() {
  if (!SupabaseSync.isConfigured) return;

  try {
    const [cloudTags, cloudTasks, cloudBlocks, cloudSettings] = await Promise.all([
      SupabaseSync.fetchTags(),
      SupabaseSync.fetchTasks(),
      SupabaseSync.fetchAllBlocks(),
      SupabaseSync.fetchSettings ? SupabaseSync.fetchSettings() : Promise.resolve(null)
    ]);

    let changed = false;

    if (cloudSettings && typeof cloudSettings === 'object') {
      let scheduleNeedsRebuild = false;
      const rawWork = cloudSettings.workBlockMins;
      const rawBreak = cloudSettings.breakBlockMins;
      const rawBed = cloudSettings.bedtime;
      const rawWake = cloudSettings.wakeTime;

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

    if (cloudTags && cloudTags.length > 0) {
      customTags = cloudTags;
      SafeStorage.setItem(CONFIG.TAGS_KEY, JSON.stringify(customTags));
      populateTagsDropdowns();
      renderCustomTagsList();
      renderTasksHubFilterTabs();
      changed = true;
    }

    if (cloudTasks && cloudTasks.length > 0) {
      sharedTasksBank = cloudTasks;
      SafeStorage.setItem(CONFIG.TASKS_BANK_KEY, JSON.stringify(sharedTasksBank));
      renderTasksHubList();
      changed = true;
    }

    if (cloudBlocks && Object.keys(cloudBlocks).length > 0) {
      weeksData = { ...weeksData, ...cloudBlocks };
      SafeStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(weeksData));
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
      pomodoro: {
        sessions: 0,
        totalFocusMinutes: 0
      }
    };
  }
  if (!weeksData[weekKey][dayId][blockIndex].blockTasks) {
    weeksData[weekKey][dayId][blockIndex].blockTasks = {};
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

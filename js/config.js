/* =====================================================================
   Application Configuration & Constants (Bilingual Support)
   ===================================================================== */

const CONFIG = {
  // Supabase Project Settings (Configure via UI Cloud Settings modal)
  DEFAULT_SUPABASE_URL: '',
  DEFAULT_SUPABASE_ANON_KEY: '',

  // Local Storage Keys
  STORAGE_KEY: 'tb_weekly_planner_iran_v3',
  TAGS_KEY: 'tb_custom_tags_v4',
  TASKS_BANK_KEY: 'tb_shared_tasks_bank_v1',
  VIEW_KEY: 'tb_active_view_mode',
  THEME_KEY: 'tb_theme_preference',
  HIDE_BREAKS_KEY: 'tb_hide_breaks_preference',
  SUPABASE_CONFIG_KEY: 'tb_supabase_config',
  SETTINGS_KEY: 'tb_app_settings_v1',
  TEMPLATES_KEY: 'tb_weekly_templates_v1',
  DELETED_TASKS_KEY: 'tb_deleted_tasks_bank_v1',
  PENDING_SYNC_QUEUE_KEY: 'tb_pending_sync_queue_v1'
};

const DEFAULT_SETTINGS = {
  timezone: 'system',       // 'system' | any valid IANA tz string e.g. 'Asia/Tehran'
  calendarType: 'gregorian', // 'gregorian' | 'persian'
  language: 'en',           // 'en' | 'fa'
  workBlockMins: 90,        // valid range 10-180, step 5
  breakBlockMins: 30,       // valid range 5-60, step 5
  bedtime: '23:30',         // 'HH:mm' format
  wakeTime: '07:30',        // 'HH:mm' format
  autoSyncInterval: 60,     // minutes, default 60 (1 hour). 0 means disabled
  autoSyncEnabled: true     // boolean
};

const DAYS_OF_WEEK = [
  { id: 'sat', nameEn: 'Saturday',  nameFa: 'شنبه',     shortEn: 'Sat', shortFa: 'ش' },
  { id: 'sun', nameEn: 'Sunday',    nameFa: 'یکشنبه',   shortEn: 'Sun', shortFa: 'ی' },
  { id: 'mon', nameEn: 'Monday',    nameFa: 'دوشنبه',   shortEn: 'Mon', shortFa: 'د' },
  { id: 'tue', nameEn: 'Tuesday',   nameFa: 'سه‌شنبه',  shortEn: 'Tue', shortFa: 'س' },
  { id: 'wed', nameEn: 'Wednesday', nameFa: 'چهارشنبه', shortEn: 'Wed', shortFa: 'چ' },
  { id: 'thu', nameEn: 'Thursday',  nameFa: 'پنج‌شنبه', shortEn: 'Thu', shortFa: 'پ' },
  { id: 'fri', nameEn: 'Friday',    nameFa: 'جمعه',     shortEn: 'Fri', shortFa: 'ج' },
];

// Helper to get localized day name
function getDayName(day) {
  if (!day) return '';
  return (typeof I18N !== 'undefined' && I18N.currentLang === 'fa') ? day.nameFa : day.nameEn;
}

// Add backward compatible .name getter
DAYS_OF_WEEK.forEach(d => {
  Object.defineProperty(d, 'name', {
    get() {
      return getDayName(this);
    }
  });
});

const DEFAULT_TAGS = [
  { id: 'misc',     name: 'General',            color: '#64748b' },
  { id: 'work',     name: 'Work & Projects',    color: '#2563eb' },
  { id: 'study',    name: 'Study & Learning',   color: '#059669' },
  { id: 'fitness',  name: 'Health & Fitness',   color: '#d97706' },
  { id: 'leisure',  name: 'Rest & Leisure',     color: '#9333ea' }
];

const DEFAULT_TASK_BANK = [
  { id: 'tsk-1', tagId: 'work',     title: 'Plan daily priorities & review action items', completed: false, completedAt: null },
  { id: 'tsk-2', tagId: 'work',     title: 'Deep focus on core task deliverables', completed: false, completedAt: null },
  { id: 'tsk-3', tagId: 'study',    title: 'Read chapter / learn new concept', completed: false, completedAt: null },
  { id: 'tsk-4', tagId: 'study',    title: 'Review notes & summarize key takeaways', completed: false, completedAt: null },
  { id: 'tsk-5', tagId: 'fitness',  title: 'Light walk, stretch or workout', completed: false, completedAt: null },
  { id: 'tsk-6', tagId: 'misc',     title: 'Clear inbox and organize workspace', completed: false, completedAt: null }
];

function formatMinutes(mins) {
  const normalized = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseTimeToMinutes(timeStr, defaultMins = 0) {
  if (typeof timeStr !== 'string') return defaultMins;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return defaultMins;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return defaultMins;
  return (((h * 60 + m) % 1440) + 1440) % 1440;
}

function generateScheduleDefinition(workMins, breakMins, bedtimeStr, wakeTimeStr) {
  if (typeof AppSettings !== 'undefined' && AppSettings.get) {
    if (workMins === undefined) workMins = AppSettings.get('workBlockMins');
    if (breakMins === undefined) breakMins = AppSettings.get('breakBlockMins');
    if (bedtimeStr === undefined) bedtimeStr = AppSettings.get('bedtime');
    if (wakeTimeStr === undefined) wakeTimeStr = AppSettings.get('wakeTime');
  }

  const work = parseInt(workMins, 10) || 90;
  const rest = parseInt(breakMins, 10) || 30;
  const bedtime = bedtimeStr || '23:30';
  const wakeTime = wakeTimeStr || '07:30';

  const wakeMin = parseTimeToMinutes(wakeTime, 7 * 60 + 30);
  const bedMin = parseTimeToMinutes(bedtime, 23 * 60 + 30);

  // Total awake duration in minutes
  let awakeDuration = bedMin - wakeMin;
  if (awakeDuration <= 0) awakeDuration += 1440;
  // Sleep duration in minutes
  const sleepDuration = 1440 - awakeDuration;

  const cycleDuration = work + rest;
  const schedule = [];
  let blockIndexCounter = 0;
  let currentOffset = 0; // minutes relative to wakeMin
  let cycleNum = 1;

  while (currentOffset < awakeDuration) {
    const remainingAwake = awakeDuration - currentOffset;

    if (remainingAwake >= cycleDuration) {
      // Full cycle: work block
      const wStart = (wakeMin + currentOffset) % 1440;
      const wEnd = (wakeMin + currentOffset + work) % 1440;
      schedule.push({
        blockIndex: blockIndexCounter++,
        type: 'work',
        cycleNumber: cycleNum,
        startMin: wStart,
        endMin: wEnd,
        startTimeStr: formatMinutes(wStart),
        endTimeStr: formatMinutes(wEnd),
        durationMins: work
      });
      currentOffset += work;

      // Full cycle: break block
      const bStart = (wakeMin + currentOffset) % 1440;
      const bEnd = (wakeMin + currentOffset + rest) % 1440;
      schedule.push({
        blockIndex: blockIndexCounter++,
        type: 'break',
        cycleNumber: cycleNum,
        startMin: bStart,
        endMin: bEnd,
        startTimeStr: formatMinutes(bStart),
        endTimeStr: formatMinutes(bEnd),
        durationMins: rest
      });
      currentOffset += rest;
      cycleNum++;
    } else if (remainingAwake >= work) {
      // Can fit one more work block, with remainder as winddown
      const wStart = (wakeMin + currentOffset) % 1440;
      const wEnd = (wakeMin + currentOffset + work) % 1440;
      schedule.push({
        blockIndex: blockIndexCounter++,
        type: 'work',
        cycleNumber: cycleNum,
        startMin: wStart,
        endMin: wEnd,
        startTimeStr: formatMinutes(wStart),
        endTimeStr: formatMinutes(wEnd),
        durationMins: work
      });
      currentOffset += work;

      const rem = awakeDuration - currentOffset;
      if (rem > 0) {
        const wdStart = (wakeMin + currentOffset) % 1440;
        const wdEnd = (wakeMin + currentOffset + rem) % 1440;
        schedule.push({
          blockIndex: blockIndexCounter++,
          type: 'winddown',
          cycleNumber: null,
          startMin: wdStart,
          endMin: wdEnd,
          startTimeStr: formatMinutes(wdStart),
          endTimeStr: formatMinutes(wdEnd),
          durationMins: rem
        });
        currentOffset += rem;
      }
    } else {
      // Remaining time is less than a work block: designate as floating winddown block
      const wdStart = (wakeMin + currentOffset) % 1440;
      const wdEnd = (wakeMin + currentOffset + remainingAwake) % 1440;
      schedule.push({
        blockIndex: blockIndexCounter++,
        type: 'winddown',
        cycleNumber: null,
        startMin: wdStart,
        endMin: wdEnd,
        startTimeStr: formatMinutes(wdStart),
        endTimeStr: formatMinutes(wdEnd),
        durationMins: remainingAwake
      });
      currentOffset += remainingAwake;
    }
  }

  // Unified sleep block covering bedMin -> wakeMin
  schedule.push({
    blockIndex: blockIndexCounter++,
    type: 'sleep',
    cycleNumber: null,
    startMin: bedMin,
    endMin: wakeMin,
    startTimeStr: formatMinutes(bedMin),
    endTimeStr: formatMinutes(wakeMin),
    durationMins: sleepDuration
  });

  return schedule;
}

let SCHEDULE_METADATA = generateScheduleDefinition();

function getDefaultBlockTitle(meta) {
  if (typeof I18N !== 'undefined') {
    if (meta.type === 'work') {
      return I18N.t('cycle_work', { cycle: meta.cycleNumber, mins: meta.durationMins });
    } else if (meta.type === 'break') {
      return I18N.t('cycle_break', { cycle: meta.cycleNumber, mins: meta.durationMins });
    } else if (meta.type === 'winddown') {
      return I18N.t('block_type_winddown');
    } else if (meta.type === 'sleep') {
      return I18N.t('block_type_sleep');
    }
  }
  if (meta.type === 'work') return `Cycle ${meta.cycleNumber}: Deep Work`;
  if (meta.type === 'break') return `Cycle ${meta.cycleNumber}: Rest & Recharge`;
  if (meta.type === 'winddown') return 'Wind-down & Day Review';
  if (meta.type === 'sleep') return 'Sleep & Recovery';
  return 'Block';
}

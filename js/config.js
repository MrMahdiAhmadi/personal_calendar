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
  SETTINGS_KEY: 'tb_app_settings_v1'
};

const DEFAULT_SETTINGS = {
  timezone: 'system',       // 'system' | any valid IANA tz string e.g. 'Asia/Tehran'
  calendarType: 'gregorian', // 'gregorian' | 'persian'
  language: 'en'            // 'en' | 'fa'
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
  { id: 'tsk-1', tagId: 'work',     title: 'Plan daily priorities & review action items' },
  { id: 'tsk-2', tagId: 'work',     title: 'Deep focus on core task deliverables' },
  { id: 'tsk-3', tagId: 'study',    title: 'Read chapter / learn new concept' },
  { id: 'tsk-4', tagId: 'study',    title: 'Review notes & summarize key takeaways' },
  { id: 'tsk-5', tagId: 'fitness',  title: 'Light walk, stretch or workout' },
  { id: 'tsk-6', tagId: 'misc',     title: 'Clear inbox and organize workspace' }
];

function formatMinutes(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateScheduleDefinition() {
  const schedule = [];
  let currentMinutes = 0;

  for (let cycle = 0; cycle < 12; cycle++) {
    // Work Block (90 mins)
    const workStart = currentMinutes;
    const workEnd = currentMinutes + 90;
    schedule.push({
      blockIndex: cycle * 2,
      type: 'work',
      cycleNumber: cycle + 1,
      startMin: workStart,
      endMin: workEnd,
      startTimeStr: formatMinutes(workStart),
      endTimeStr: formatMinutes(workEnd),
      durationMins: 90
    });
    currentMinutes = workEnd;

    // Break Block (30 mins)
    const breakStart = currentMinutes;
    const breakEnd = currentMinutes + 30;
    schedule.push({
      blockIndex: cycle * 2 + 1,
      type: 'break',
      cycleNumber: cycle + 1,
      startMin: breakStart,
      endMin: breakEnd,
      startTimeStr: formatMinutes(breakStart),
      endTimeStr: formatMinutes(breakEnd),
      durationMins: 30
    });
    currentMinutes = breakEnd;
  }

  return schedule;
}

const SCHEDULE_METADATA = generateScheduleDefinition();

function getDefaultBlockTitle(meta) {
  if (typeof I18N !== 'undefined') {
    return meta.type === 'work'
      ? I18N.t('cycle_work', { cycle: meta.cycleNumber })
      : I18N.t('cycle_break', { cycle: meta.cycleNumber });
  }
  return meta.type === 'work' ? `Cycle ${meta.cycleNumber}: Deep Work` : `Cycle ${meta.cycleNumber}: Rest & Recharge`;
}

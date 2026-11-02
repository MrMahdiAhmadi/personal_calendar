/* =====================================================================
   Time Engine & Live Clock (Configurable Timezone & Calendar)
   ===================================================================== */

function getCurrentTime() {
  const now = new Date();
  const timeZone = (typeof AppSettings !== 'undefined' && AppSettings.getTimezone)
    ? AppSettings.getTimezone()
    : 'Asia/Tehran';

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });

  const parts = formatter.formatToParts(now);
  const vals = {};
  parts.forEach(p => vals[p.type] = p.value);

  const hours = parseInt(vals.hour, 10);
  const minutes = parseInt(vals.minute, 10);
  const seconds = parseInt(vals.second, 10);
  const totalMinutesOfDay = (hours * 60) + minutes;

  const mapWeekDay = {
    'Sat': 'sat', 'Sun': 'sun', 'Mon': 'mon',
    'Tue': 'tue', 'Wed': 'wed', 'Thu': 'thu', 'Fri': 'fri'
  };
  const todayIranDayId = mapWeekDay[vals.weekday] || 'sat';

  const persianFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const gregorianFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const persianDateStr = persianFormatter.format(now);
  const gregorianDateStr = gregorianFormatter.format(now);

  return {
    hours,
    minutes,
    seconds,
    totalMinutesOfDay,
    timeString: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    persianDateStr,
    gregorianDateStr,
    englishDateStr: gregorianDateStr, // alias for backwards compatibility
    todayIranDayId
  };
}

// Backward compatibility alias
function getIranTime() {
  return getCurrentTime();
}

function getWeekKey(offset) {
  const now = new Date();
  const timeZone = (typeof AppSettings !== 'undefined' && AppSettings.getTimezone)
    ? AppSettings.getTimezone()
    : 'Asia/Tehran';

  const shifted = new Date(now.getTime() + (offset * 7 * 24 * 60 * 60 * 1000));
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).formatToParts(shifted);

  const vals = {};
  parts.forEach(p => vals[p.type] = p.value);
  const year = parseInt(vals.year, 10);
  const month = parseInt(vals.month, 10) - 1;
  const day = parseInt(vals.day, 10);

  const localDateInTz = new Date(Date.UTC(year, month, day));
  const firstJanUtc = new Date(Date.UTC(year, 0, 1));
  const dayOfYear = Math.floor((localDateInTz - firstJanUtc) / 86400000);
  const firstDayOfWeek = firstJanUtc.getUTCDay();
  const weekNumber = Math.ceil(((dayOfYear + firstDayOfWeek + 1) / 7));
  return `w-${year}-${weekNumber}`;
}

function updateLiveIranTicker() {
  const currentTime = getCurrentTime();
  const timeEl = document.getElementById('iranLiveTime');
  const dateEl = document.getElementById('iranLiveDate');
  const isPersian = typeof AppSettings !== 'undefined' && AppSettings.get('calendarType') === 'persian';

  if (timeEl) timeEl.textContent = currentTime.timeString;
  if (dateEl) dateEl.textContent = isPersian ? currentTime.persianDateStr : currentTime.gregorianDateStr;

  let activeIndex = -1;
  for (const meta of SCHEDULE_METADATA) {
    if (currentTime.totalMinutesOfDay >= meta.startMin && currentTime.totalMinutesOfDay < meta.endMin) {
      activeIndex = meta.blockIndex;
      break;
    }
  }

  const activeBadge = document.getElementById('activeBlockBadge');
  if (activeBadge) {
    if (activeIndex !== -1) {
      const meta = SCHEDULE_METADATA[activeIndex];
      const isWork = meta.type === 'work';
      const todayDayObj = DAYS_OF_WEEK.find(d => d.id === currentTime.todayIranDayId);

      const curWeekKey = getWeekKey(0);
      const dayData = (weeksData[curWeekKey] && weeksData[curWeekKey][currentTime.todayIranDayId]) || {};
      const blockData = dayData[activeIndex] || {};
      const title = blockData.title || getDefaultBlockTitle(meta);
      const tagSuffix = isWork ? I18N.t('work_tag_suffix') : I18N.t('break_tag_suffix');

      activeBadge.innerHTML = `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isWork ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'}">
          ${todayDayObj.name} | ${meta.startTimeStr} - ${meta.endTimeStr}
        </span>
        <span class="truncate max-w-[220px] font-semibold">${escapeHtml(title)}</span>
        <span class="text-xs text-slate-400 font-normal">(${tagSuffix})</span>
      `;
    } else {
      activeBadge.innerHTML = `<span class="text-slate-400 font-normal">${I18N.t('night_cycle_end')}</span>`;
    }
  }

  refreshActiveRingInViews(currentTime.todayIranDayId, activeIndex);
}

function refreshActiveRingInViews(todayDayId, activeIndex) {
  const isCurrentWeek = weekOffset === 0;

  document.querySelectorAll('.block-element').forEach(el => {
    el.classList.remove('ring-4', 'ring-indigo-500/80', 'pulse-ring', 'border-indigo-500');
    if (isCurrentWeek) {
      const elDay = el.getAttribute('data-day');
      const elIdx = parseInt(el.getAttribute('data-index'), 10);
      if (elDay === todayDayId && elIdx === activeIndex) {
        el.classList.add('ring-4', 'ring-indigo-500/80', 'pulse-ring', 'border-indigo-500');
      }
    }
  });
}

function scrollToCurrentBlock() {
  const currentTime = getCurrentTime();
  if (weekOffset !== 0) {
    weekOffset = 0;
    selectedDayId = currentTime.todayIranDayId;
    renderDayTabs();
    renderCurrentView();
  }

  setTimeout(() => {
    const active = document.querySelector('.pulse-ring');
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      showToast(I18N.t('night_cycle_end'));
    }
  }, 100);
}

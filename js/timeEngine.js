/* =====================================================================
   Iran Time Engine & Live Clock (Bilingual Support)
   ===================================================================== */

function getIranTime() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tehran',
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

  const faFormatter = new Intl.DateTimeFormat('fa-IR', {
    timeZone: 'Asia/Tehran',
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  const enFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tehran',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return {
    hours,
    minutes,
    seconds,
    totalMinutesOfDay,
    timeString: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    persianDateStr: faFormatter.format(now),
    englishDateStr: enFormatter.format(now),
    todayIranDayId
  };
}

function getWeekKey(offset) {
  const now = new Date();
  const shifted = new Date(now.getTime() + (offset * 7 * 24 * 60 * 60 * 1000));
  const year = shifted.getFullYear();
  const firstJan = new Date(shifted.getFullYear(), 0, 1);
  const weekNumber = Math.ceil((((shifted - firstJan) / 86400000) + firstJan.getDay() + 1) / 7);
  return `w-${year}-${weekNumber}`;
}

function updateLiveIranTicker() {
  const iran = getIranTime();
  const timeEl = document.getElementById('iranLiveTime');
  const dateEl = document.getElementById('iranLiveDate');
  const isFa = typeof I18N !== 'undefined' && I18N.currentLang === 'fa';

  if (timeEl) timeEl.textContent = iran.timeString;
  if (dateEl) dateEl.textContent = isFa ? iran.persianDateStr : iran.englishDateStr;

  let activeIndex = -1;
  for (const meta of SCHEDULE_METADATA) {
    if (iran.totalMinutesOfDay >= meta.startMin && iran.totalMinutesOfDay < meta.endMin) {
      activeIndex = meta.blockIndex;
      break;
    }
  }

  const activeBadge = document.getElementById('activeBlockBadge');
  if (activeBadge) {
    if (activeIndex !== -1) {
      const meta = SCHEDULE_METADATA[activeIndex];
      const isWork = meta.type === 'work';
      const todayDayObj = DAYS_OF_WEEK.find(d => d.id === iran.todayIranDayId);

      const curWeekKey = getWeekKey(0);
      const dayData = (weeksData[curWeekKey] && weeksData[curWeekKey][iran.todayIranDayId]) || {};
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

  refreshActiveRingInViews(iran.todayIranDayId, activeIndex);
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
  const iran = getIranTime();
  if (weekOffset !== 0) {
    weekOffset = 0;
    selectedDayId = iran.todayIranDayId;
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

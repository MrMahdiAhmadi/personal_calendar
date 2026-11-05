/* =====================================================================
   Time Engine & Live Clock (Configurable Timezone & Calendar)
   ===================================================================== */

function getCurrentTime() {
  const now = new Date();
  const timeZone = (typeof AppSettings !== 'undefined' && AppSettings.getTimezone)
    ? AppSettings.getTimezone()
    : (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

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
  const todayDayId = mapWeekDay[vals.weekday] || 'sat';
  const todayIranDayId = todayDayId; // alias for backwards compatibility

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
    todayDayId,
    todayIranDayId,
    timeZone
  };
}

// Backward compatibility alias
function getIranTime() {
  return getCurrentTime();
}

function updateTimezoneBadge() {
  const badge = document.getElementById('headerTimezoneBadge');
  if (!badge) return;

  const activeTz = (typeof AppSettings !== 'undefined' && AppSettings.getTimezone)
    ? AppSettings.getTimezone()
    : (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

  if (typeof I18N !== 'undefined' && I18N.t) {
    badge.textContent = I18N.t('tz_badge', { tz: activeTz });
  } else {
    badge.textContent = `Timezone: ${activeTz}`;
  }
}

function getWeekKey(offset) {
  const now = new Date();
  const timeZone = (typeof AppSettings !== 'undefined' && AppSettings.getTimezone)
    ? AppSettings.getTimezone()
    : (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

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

  // Ensure header timezone badge is updated with the active timezone
  updateTimezoneBadge();

  if (timeEl) timeEl.textContent = currentTime.timeString;
  if (dateEl) dateEl.textContent = isPersian ? currentTime.persianDateStr : currentTime.gregorianDateStr;

  let activeIndex = -1;
  const currentMin = currentTime.totalMinutesOfDay;

  for (const meta of SCHEDULE_METADATA) {
    if (meta.startMin < meta.endMin) {
      // Normal within-day range
      if (currentMin >= meta.startMin && currentMin < meta.endMin) {
        activeIndex = meta.blockIndex;
        break;
      }
    } else {
      // Crosses midnight (e.g. 23:30 to 07:30)
      if (currentMin >= meta.startMin || currentMin < meta.endMin) {
        activeIndex = meta.blockIndex;
        break;
      }
    }
  }

  const activeBadge = document.getElementById('activeBlockBadge');
  if (activeBadge) {
    if (activeIndex !== -1) {
      const meta = SCHEDULE_METADATA[activeIndex];
      const isWork = meta.type === 'work';
      const isSleep = meta.type === 'sleep';
      const isWinddown = meta.type === 'winddown';
      const todayDayObj = DAYS_OF_WEEK.find(d => d.id === currentTime.todayIranDayId);

      const curWeekKey = getWeekKey(0);
      const dayData = (weeksData[curWeekKey] && weeksData[curWeekKey][currentTime.todayIranDayId]) || {};
      const blockData = dayData[activeIndex] || {};
      const title = blockData.title || getDefaultBlockTitle(meta);

      let tagSuffix = '';
      let badgeStyle = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300';
      let iconHtml = '';

      if (isSleep) {
        tagSuffix = I18N.t('sleep_tag_suffix');
        badgeStyle = 'bg-slate-800 text-indigo-200 border border-indigo-700/50';
        iconHtml = '<i data-lucide="moon" class="w-3 h-3 text-indigo-300"></i>';
      } else if (isWinddown) {
        tagSuffix = I18N.t('winddown_tag_suffix');
        badgeStyle = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
        iconHtml = '<i data-lucide="sunset" class="w-3 h-3 text-amber-500"></i>';
      } else if (isWork) {
        tagSuffix = I18N.t('work_tag_suffix', { mins: meta.durationMins });
        badgeStyle = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300';
        iconHtml = '<i data-lucide="briefcase" class="w-3 h-3 text-indigo-500"></i>';
      } else {
        tagSuffix = I18N.t('break_tag_suffix', { mins: meta.durationMins });
        badgeStyle = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300';
        iconHtml = '<i data-lucide="coffee" class="w-3 h-3 text-emerald-500"></i>';
      }

      activeBadge.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeStyle}">
          ${iconHtml}
          <span>${todayDayObj.name} | ${meta.startTimeStr} - ${meta.endTimeStr}</span>
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
    el.classList.remove('active-block-current', 'ring-4', 'ring-indigo-500/80', 'pulse-ring', 'border-indigo-500');
    const existingBadge = el.querySelector('.active-now-badge-container');
    if (existingBadge) {
      existingBadge.remove();
    }

    if (isCurrentWeek) {
      const elDay = el.getAttribute('data-day');
      const elIdx = parseInt(el.getAttribute('data-index'), 10);
      if (elDay === todayDayId && elIdx === activeIndex) {
        el.classList.add('active-block-current');

        const badgeContainer = document.createElement('div');
        badgeContainer.className = 'active-now-badge-container flex items-center justify-end';
        const badgeText = (typeof I18N !== 'undefined' && I18N.t) ? I18N.t('active_now_badge') : 'NOW';
        badgeContainer.innerHTML = `
          <span class="active-now-badge">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
            <span>${badgeText}</span>
          </span>
        `;

        const topRow = el.querySelector('.flex.items-center.justify-between') ||
                       el.querySelector('.flex.items-start.justify-between') ||
                       el.firstElementChild;
        if (topRow) {
          topRow.appendChild(badgeContainer);
        } else {
          el.prepend(badgeContainer);
        }
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
    const active = document.querySelector('.active-block-current');
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      showToast(I18N.t('night_cycle_end'));
    }
  }, 100);
}

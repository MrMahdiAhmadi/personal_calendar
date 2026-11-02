/* =====================================================================
   View Rendering Module (Bilingual Support: EN / FA)
   ===================================================================== */

function renderDayTabs() {
  const container = document.getElementById('dayTabsContainer');
  if (!container) return;
  container.innerHTML = '';

  const iran = getIranTime();
  const isCurrentWeek = weekOffset === 0;

  DAYS_OF_WEEK.forEach(day => {
    const isSelected = (day.id === selectedDayId) && (currentViewMode !== 'weekly');
    const isToday = isCurrentWeek && (day.id === iran.todayIranDayId);

    const btn = document.createElement('button');
    btn.className = `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition flex-shrink-0 ${
      isSelected 
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' 
        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
    }`;

    btn.innerHTML = `
      <span>${day.name}</span>
      ${isToday ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>' : ''}
    `;

    btn.addEventListener('click', () => {
      selectedDayId = day.id;
      if (currentViewMode === 'weekly') {
        currentViewMode = 'daily-vertical';
        syncViewButtonsUI();
      }
      renderDayTabs();
      renderCurrentView();
    });

    container.appendChild(btn);
  });
}

function renderCurrentView() {
  const container = document.getElementById('blocksContainer');
  if (!container) return;
  container.innerHTML = '';

  const weekKey = getWeekKey(weekOffset);
  ensureWeekStructure(weekKey);

  const weekLabel = document.getElementById('currentWeekLabel');
  if (weekLabel) {
    if (weekOffset === 0) {
      weekLabel.textContent = I18N.t('current_week');
    } else if (weekOffset > 0) {
      weekLabel.textContent = `${weekOffset} ${I18N.t('weeks_later')}`;
    } else {
      weekLabel.textContent = `${Math.abs(weekOffset)} ${I18N.t('weeks_ago')}`;
    }
  }

  if (currentViewMode === 'weekly') {
    renderWeeklyMatrixView(container, weekKey);
  } else if (currentViewMode === 'daily-vertical') {
    renderDailyVerticalView(container, weekKey, selectedDayId);
  } else {
    renderDailyHorizontalView(container, weekKey, selectedDayId);
  }

  if (window.lucide) window.lucide.createIcons();
  updateLiveIranTicker();
  updateCompletionCounters();
}

/* 1. Weekly Matrix View */
function renderWeeklyMatrixView(container, weekKey) {
  container.className = 'w-full overflow-x-auto weekly-scroll-container pb-4';

  const wrap = document.createElement('div');
  wrap.className = 'min-w-[980px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm';

  let headerHtml = `
    <div class="grid grid-cols-8 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/60 text-xs font-bold text-slate-700 dark:text-slate-300">
      <div class="p-3 text-center border-l border-slate-200 dark:border-slate-800">${I18N.t('time_col_header')}</div>
  `;

  const iran = getIranTime();
  const isCurWeek = weekOffset === 0;

  DAYS_OF_WEEK.forEach(day => {
    const isToday = isCurWeek && day.id === iran.todayIranDayId;
    headerHtml += `
      <div class="p-3 text-center border-l border-slate-200 dark:border-slate-800 last:border-l-0 ${isToday ? 'bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300' : ''}">
        <div class="flex items-center justify-center gap-1.5">
          <span>${day.name}</span>
          ${isToday ? `<span class="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-white">${I18N.t('today_pill')}</span>` : ''}
        </div>
      </div>
    `;
  });
  headerHtml += `</div>`;

  let bodyHtml = `<div class="divide-y divide-slate-200 dark:divide-slate-800 text-xs">`;

  SCHEDULE_METADATA.forEach(meta => {
    const isWork = meta.type === 'work';
    if (hideBreaks && !isWork) return;

    const rowBg = isWork ? 'bg-transparent' : 'bg-slate-50/60 dark:bg-slate-950/40 opacity-75';
    const minHeight = isWork ? 'min-h-[58px]' : 'min-h-[34px]';

    bodyHtml += `
      <div class="grid grid-cols-8 ${rowBg} hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
        <div class="${isWork ? 'p-2.5' : 'p-1'} flex flex-col items-center justify-center border-l border-slate-200 dark:border-slate-800 text-[11px] font-mono">
          <span class="font-bold text-slate-800 dark:text-slate-200 leading-tight">${meta.startTimeStr}</span>
          <span class="text-slate-400 text-[10px] leading-tight">${meta.endTimeStr}</span>
          <span class="text-[9px] mt-0.5 px-1.5 rounded ${isWork ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'}">${meta.durationMins}${I18N.t('mins_short')}</span>
        </div>
    `;

    DAYS_OF_WEEK.forEach(day => {
      const block = getBlockData(weekKey, day.id, meta.blockIndex);
      const tag = getTagById(block.tagId);
      const statusIcon = getStatusMiniIcon(block.status);

      const assignedTaskIds = Object.keys(block.blockTasks || {}).filter(k => block.blockTasks[k].assigned);
      const doneTaskIds = assignedTaskIds.filter(k => block.blockTasks[k].completed);
      const defaultTitle = getDefaultBlockTitle(meta);

      bodyHtml += `
        <div class="${isWork ? 'p-1.5' : 'p-1'} border-l border-slate-200 dark:border-slate-800 last:border-l-0 relative group">
          <div 
            onclick="openEditModal('${weekKey}', '${day.id}', ${meta.blockIndex})"
            data-day="${day.id}"
            data-index="${meta.blockIndex}"
            class="block-element w-full h-full ${minHeight} ${isWork ? 'p-2' : 'p-1.5 border-dashed'} rounded-xl border border-slate-200/80 dark:border-slate-800 cursor-pointer transition hover:shadow-md flex flex-col justify-between"
            style="background: ${tag.id !== 'misc' ? tag.color + '18' : 'transparent'}; border-right: 3px solid ${tag.color};"
          >
            <div class="flex items-start justify-between gap-1">
              <span class="font-medium text-[11px] line-clamp-1 text-slate-800 dark:text-slate-200 leading-tight">
                ${escapeHtml(block.title) || `<span class="text-slate-400 dark:text-slate-600 italic font-normal">${defaultTitle}</span>`}
              </span>
              ${statusIcon}
            </div>

            ${isWork ? `
            <div class="flex items-center justify-between text-[10px] text-slate-400 mt-1">
              <span class="truncate max-w-[65px] font-normal" style="color: ${tag.color}">${escapeHtml(tag.name)}</span>
              ${assignedTaskIds.length > 0 ? `
                <span class="font-mono text-[9px] bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.2 rounded">${doneTaskIds.length}/${assignedTaskIds.length} ${I18N.t('tasks_short')}</span>
              ` : ''}
            </div>
            ` : ''}
          </div>
        </div>
      `;
    });

    bodyHtml += `</div>`;
  });

  bodyHtml += `</div>`;
  wrap.innerHTML = headerHtml + bodyHtml;
  container.appendChild(wrap);
}

/* 2. Daily Vertical View */
function renderDailyVerticalView(container, weekKey, dayId) {
  container.className = 'flex flex-col gap-3 relative before:absolute before:top-4 before:bottom-4 before:right-6 md:before:right-8 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800';

  const dayObj = DAYS_OF_WEEK.find(d => d.id === dayId);

  SCHEDULE_METADATA.forEach(meta => {
    const isWork = meta.type === 'work';
    if (hideBreaks && !isWork) return;

    const block = getBlockData(weekKey, dayId, meta.blockIndex);
    const tag = getTagById(block.tagId);

    const assignedTaskIds = Object.keys(block.blockTasks || {}).filter(k => block.blockTasks[k].assigned);
    const doneTaskIds = assignedTaskIds.filter(k => block.blockTasks[k].completed);
    const defaultTitle = getDefaultBlockTitle(meta);

    const card = document.createElement('div');
    card.setAttribute('data-day', dayId);
    card.setAttribute('data-index', meta.blockIndex);
    card.className = `block-element relative flex flex-col md:flex-row items-start md:items-center justify-between ${isWork ? 'p-4 rounded-2xl' : 'py-2 px-3 rounded-xl border-dashed opacity-80'} border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 hover:shadow-md gap-4`;
    card.style.borderRight = `${isWork ? '4px' : '2px'} solid ${tag.color}`;

    card.innerHTML = `
      <div class="flex items-center gap-3 w-full md:w-auto">
        <div class="flex-shrink-0 ${isWork ? 'w-11 h-11' : 'w-7 h-7 text-xs'} rounded-xl flex items-center justify-center font-mono font-bold shadow-sm" style="background-color: ${tag.color}; color: #ffffff;">
          <i data-lucide="${isWork ? 'briefcase' : 'coffee'}" class="${isWork ? 'w-5 h-5' : 'w-3.5 h-3.5'}"></i>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-mono ${isWork ? 'text-sm font-bold' : 'text-xs font-semibold'} text-slate-900 dark:text-white dir-ltr inline-block">
              ${meta.startTimeStr} - ${meta.endTimeStr}
            </span>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-medium ${isWork ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'}">
              ${meta.durationMins} ${I18N.t('mins_short')}
            </span>
          </div>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            ${dayObj.name} • ${isWork ? I18N.t('work_tag_suffix') : I18N.t('break_tag_suffix')}
          </p>
        </div>
      </div>

      <div class="flex-1 w-full md:px-4 cursor-pointer" onclick="openEditModal('${weekKey}', '${dayId}', ${meta.blockIndex})">
        <h4 class="${isWork ? 'text-sm md:text-base font-semibold' : 'text-xs font-medium text-slate-600 dark:text-slate-300'} text-slate-900 dark:text-white leading-tight">
          ${escapeHtml(block.title) || `<span class="text-slate-400 dark:text-slate-500 italic font-normal">${defaultTitle}</span>`}
        </h4>
        <div class="flex flex-wrap items-center gap-2.5 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[11px]" style="background-color: ${tag.color}22; color: ${tag.color};">
            <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${tag.color}"></span>
            ${escapeHtml(tag.name)}
          </span>
          ${getStatusBadge(block.status)}
          ${assignedTaskIds.length > 0 ? `
            <span class="flex items-center gap-1 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
              <i data-lucide="check-square" class="w-3.5 h-3.5 text-indigo-500"></i>
              ${doneTaskIds.length}/${assignedTaskIds.length} ${I18N.t('tasks_short')}
            </span>
          ` : ''}
          ${block.notes ? `
            <span class="flex items-center gap-1 text-slate-500 truncate max-w-xs text-[11px]">
              <i data-lucide="file-text" class="w-3.5 h-3.5"></i>
              ${escapeHtml(block.notes)}
            </span>
          ` : ''}
        </div>
      </div>

      <div class="flex items-center gap-2 self-end md:self-center">
        <button onclick="quickToggleBlockStatus('${weekKey}', '${dayId}', ${meta.blockIndex}, event)" class="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium transition flex items-center gap-1.5">
          <i data-lucide="${block.status === 'completed' ? 'check-circle-2' : 'circle'}" class="w-3.5 h-3.5 ${block.status === 'completed' ? 'text-emerald-500' : 'text-slate-400'}"></i>
          <span>${block.status === 'completed' ? I18N.t('quick_completed') : I18N.t('quick_done')}</span>
        </button>
        <button onclick="openEditModal('${weekKey}', '${dayId}', ${meta.blockIndex})" class="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition">
          <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

/* 3. Daily Horizontal View */
function renderDailyHorizontalView(container, weekKey, dayId) {
  container.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5';

  SCHEDULE_METADATA.forEach(meta => {
    const isWork = meta.type === 'work';
    if (hideBreaks && !isWork) return;

    const block = getBlockData(weekKey, dayId, meta.blockIndex);
    const tag = getTagById(block.tagId);

    const assignedTaskIds = Object.keys(block.blockTasks || {}).filter(k => block.blockTasks[k].assigned);
    const doneTaskIds = assignedTaskIds.filter(k => block.blockTasks[k].completed);
    const defaultTitle = getDefaultBlockTitle(meta);

    const card = document.createElement('div');
    card.setAttribute('data-day', dayId);
    card.setAttribute('data-index', meta.blockIndex);

    if (isWork) {
      card.className = `block-element flex flex-col justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 hover:shadow-lg min-h-[195px]`;
      card.style.borderTop = `4px solid ${tag.color}`;
      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
            <div class="flex items-center gap-1.5">
              <span class="w-6 h-6 rounded-lg flex items-center justify-center text-xs text-white" style="background-color: ${tag.color}">
                <i data-lucide="briefcase" class="w-3.5 h-3.5"></i>
              </span>
              <span class="font-mono text-xs font-bold text-slate-800 dark:text-slate-100 dir-ltr inline-block">
                ${meta.startTimeStr} - ${meta.endTimeStr}
              </span>
            </div>
            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              ${meta.durationMins}${I18N.t('mins_short')}
            </span>
          </div>

          <div class="mt-2.5 cursor-pointer" onclick="openEditModal('${weekKey}', '${dayId}', ${meta.blockIndex})">
            <span class="text-[10px] font-medium inline-block px-1.5 py-0.2 rounded mb-1" style="background-color: ${tag.color}18; color: ${tag.color}">
              ${escapeHtml(tag.name)}
            </span>
            <h4 class="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
              ${escapeHtml(block.title) || `<span class="text-slate-400 dark:text-slate-500 italic font-normal text-xs">${defaultTitle}</span>`}
            </h4>
            ${block.notes ? `
              <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                ${escapeHtml(block.notes)}
              </p>
            ` : ''}
          </div>
        </div>

        <div class="mt-4 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5">
            ${getStatusBadge(block.status)}
            ${assignedTaskIds.length > 0 ? `
              <span class="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                ${doneTaskIds.length}/${assignedTaskIds.length}
              </span>
            ` : ''}
          </div>
          <div class="flex items-center gap-1">
            <button onclick="quickToggleBlockStatus('${weekKey}', '${dayId}', ${meta.blockIndex}, event)" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Toggle">
              <i data-lucide="${block.status === 'completed' ? 'check-circle' : 'circle'}" class="w-3.5 h-3.5 ${block.status === 'completed' ? 'text-emerald-500' : ''}"></i>
            </button>
            <button onclick="openEditModal('${weekKey}', '${dayId}', ${meta.blockIndex})" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Edit">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `;
    } else {
      card.className = `block-element break-block-compact flex flex-col justify-between p-2.5 rounded-xl border border-dashed border-emerald-300/60 dark:border-emerald-800/40 bg-emerald-50/20 dark:bg-emerald-950/10 min-h-[90px]`;
      card.style.borderTop = `2px solid ${tag.color || '#10b981'}`;
      card.innerHTML = `
        <div class="flex items-center justify-between gap-1">
          <div class="flex items-center gap-1.5">
            <i data-lucide="coffee" class="w-3.5 h-3.5 text-emerald-500"></i>
            <span class="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 dir-ltr inline-block">
              ${meta.startTimeStr} - ${meta.endTimeStr}
            </span>
          </div>
          <span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
            ${I18N.t('break_tag_suffix')}
          </span>
        </div>
        <div class="mt-1 cursor-pointer truncate" onclick="openEditModal('${weekKey}', '${dayId}', ${meta.blockIndex})">
          <span class="text-xs text-slate-500 dark:text-slate-400 italic">
            ${escapeHtml(block.title) || defaultTitle}
          </span>
        </div>
        <div class="flex justify-end mt-1">
          <button onclick="openEditModal('${weekKey}', '${dayId}', ${meta.blockIndex})" class="p-1 rounded hover:bg-slate-200/50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600">
            <i data-lucide="pencil" class="w-3 h-3"></i>
          </button>
        </div>
      `;
    }

    container.appendChild(card);
  });
}

function getStatusBadge(status) {
  switch (status) {
    case 'completed':
      return `<span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"><i data-lucide="check" class="w-3 h-3"></i>${I18N.t('status_completed')}</span>`;
    case 'in-progress':
      return `<span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300"><i data-lucide="play" class="w-3 h-3"></i>${I18N.t('status_inprogress')}</span>`;
    case 'skipped':
      return `<span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300"><i data-lucide="x" class="w-3 h-3"></i>${I18N.t('status_skipped')}</span>`;
    default:
      return `<span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">${I18N.t('status_pending')}</span>`;
  }
}

function getStatusMiniIcon(status) {
  switch (status) {
    case 'completed':
      return `<i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-500 flex-shrink-0"></i>`;
    case 'in-progress':
      return `<i data-lucide="clock" class="w-3.5 h-3.5 text-indigo-500 flex-shrink-0"></i>`;
    case 'skipped':
      return `<i data-lucide="x-circle" class="w-3.5 h-3.5 text-rose-400 flex-shrink-0"></i>`;
    default:
      return ``;
  }
}

function quickToggleBlockStatus(weekKey, dayId, blockIndex, event) {
  if (event) event.stopPropagation();
  const block = getBlockData(weekKey, dayId, blockIndex);
  block.status = block.status === 'completed' ? 'pending' : 'completed';
  saveAppData();

  if (SupabaseSync.isConfigured) {
    SupabaseSync.upsertBlock(weekKey, dayId, blockIndex, block);
  }

  renderCurrentView();
  showToast(block.status === 'completed' ? I18N.t('toast_block_completed') : I18N.t('toast_block_reset'));
}

function syncViewButtonsUI() {
  const btnMatrix = document.getElementById('viewWeeklyMatrixBtn');
  const btnVert = document.getElementById('viewDailyVerticalBtn');
  const btnHoriz = document.getElementById('viewDailyHorizontalBtn');
  if (!btnMatrix || !btnVert || !btnHoriz) return;

  const activeClass = 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm';
  const inactiveClass = 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';

  [btnMatrix, btnVert, btnHoriz].forEach(b => {
    b.classList.remove('bg-white', 'dark:bg-slate-700', 'text-indigo-600', 'dark:text-indigo-300', 'shadow-sm', 'text-slate-600', 'dark:text-slate-400');
  });

  if (currentViewMode === 'weekly') {
    btnMatrix.className += ` ${activeClass}`;
    btnVert.className += ` ${inactiveClass}`;
    btnHoriz.className += ` ${inactiveClass}`;
  } else if (currentViewMode === 'daily-vertical') {
    btnVert.className += ` ${activeClass}`;
    btnMatrix.className += ` ${inactiveClass}`;
    btnHoriz.className += ` ${inactiveClass}`;
  } else {
    btnHoriz.className += ` ${activeClass}`;
    btnMatrix.className += ` ${inactiveClass}`;
    btnVert.className += ` ${inactiveClass}`;
  }
}

function updateHideBreaksUI() {
  const btn = document.getElementById('toggleBreaksBtn');
  const label = document.getElementById('toggleBreaksLabel');
  const icon = document.getElementById('toggleBreaksIcon');
  if (!btn || !label || !icon) return;

  if (hideBreaks) {
    btn.classList.add('bg-emerald-100', 'text-emerald-800', 'border-emerald-300', 'dark:bg-emerald-950/70', 'dark:text-emerald-300');
    btn.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'border-slate-200');
    label.textContent = I18N.t('show_breaks_btn');
    icon.setAttribute('data-lucide', 'eye');
  } else {
    btn.classList.remove('bg-emerald-100', 'text-emerald-800', 'border-emerald-300', 'dark:bg-emerald-950/70', 'dark:text-emerald-300');
    btn.classList.add('bg-slate-100', 'dark:bg-slate-800', 'border-slate-200');
    label.textContent = I18N.t('hide_breaks_btn');
    icon.setAttribute('data-lucide', 'coffee');
  }
  if (window.lucide) window.lucide.createIcons();
}

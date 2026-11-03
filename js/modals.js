/* =====================================================================
   Modals, Dialogs & Backup Operations (Bilingual Support)
   ===================================================================== */

/* 1. Block Edit Modal */
function openEditModal(weekKey, dayId, blockIndex) {
  activeModalTarget = { weekKey, dayId, blockIndex };
  const meta = SCHEDULE_METADATA[blockIndex];
  const block = getBlockData(weekKey, dayId, blockIndex);
  const dayObj = DAYS_OF_WEEK.find(d => d.id === dayId);

  document.getElementById('modalTimeRange').textContent = `${meta.startTimeStr} - ${meta.endTimeStr}`;
  document.getElementById('modalDayPill').textContent = dayObj.name;

  if (meta.type === 'work') {
    document.getElementById('modalBlockType').textContent = I18N.t('modal_block_work_desc', { cycle: meta.cycleNumber });
  } else if (meta.type === 'break') {
    document.getElementById('modalBlockType').textContent = I18N.t('modal_block_break_desc', { cycle: meta.cycleNumber });
  } else if (meta.type === 'winddown') {
    document.getElementById('modalBlockType').textContent = I18N.t('block_type_winddown');
  } else if (meta.type === 'sleep') {
    document.getElementById('modalBlockType').textContent = I18N.t('block_type_sleep');
  }

  document.getElementById('modalTitleInput').value = block.title || '';
  document.getElementById('modalStatusSelect').value = block.status || 'pending';
  document.getElementById('modalTagSelect').value = block.tagId || 'misc';
  document.getElementById('modalNotesInput').value = block.notes || '';
  document.getElementById('modalQuickNewTaskInput').value = '';

  renderModalBlockTasks();

  const modal = document.getElementById('blockModal');
  const box = document.getElementById('modalBox');
  modal.classList.remove('hidden');
  setTimeout(() => {
    modal.classList.remove('opacity-0');
    box.classList.remove('scale-95', 'translate-y-6');
    box.classList.add('scale-100', 'translate-y-0');
  }, 10);

  if (window.lucide) window.lucide.createIcons();

  if (typeof pomodoroInit === 'function') {
    pomodoroInit();
  }
}

function closeEditModal() {
  if (typeof pomodoroCleanup === 'function') {
    pomodoroCleanup();
  }

  const modal = document.getElementById('blockModal');
  const box = document.getElementById('modalBox');
  modal.classList.add('opacity-0');
  box.classList.remove('scale-100', 'translate-y-0');
  box.classList.add('scale-95', 'translate-y-6');
  setTimeout(() => {
    modal.classList.add('hidden');
    activeModalTarget = null;
    if (typeof pomodoroUpdateFloatingBar === 'function') {
      pomodoroUpdateFloatingBar();
    }
  }, 200);
}

function saveBlockModalChanges() {
  if (!activeModalTarget) return;
  const { weekKey, dayId, blockIndex } = activeModalTarget;
  const block = getBlockData(weekKey, dayId, blockIndex);

  block.title = document.getElementById('modalTitleInput').value.trim();
  block.status = document.getElementById('modalStatusSelect').value;
  block.tagId = document.getElementById('modalTagSelect').value;
  block.notes = document.getElementById('modalNotesInput').value.trim();

  saveAppData();

  if (SupabaseSync.isConfigured) {
    SupabaseSync.upsertBlock(weekKey, dayId, blockIndex, block);
  }

  renderCurrentView();
  closeEditModal();
  showToast(I18N.t('toast_block_saved'));
}

/* 1.5 Weekly Routine Repetition & Templates Modal Operations */
function copyPreviousWeekRoutine() {
  const currentWeekKey = getWeekKey(weekOffset);
  const prevWeekKey = getWeekKey(weekOffset - 1);

  const prevRoutine = extractRoutineFromWeek(prevWeekKey);
  if (!prevRoutine || prevRoutine.totalBlocks === 0) {
    showToast(I18N.t('toast_prev_week_empty'));
    return;
  }

  const currentSummary = getWeekDataSummary(currentWeekKey);

  const executeCopy = () => {
    applyRoutineToWeek(currentWeekKey, prevRoutine.blocksData);
    renderCurrentView();
    showToast(I18N.t('toast_prev_week_copied'));
  };

  if (currentSummary.count > 0) {
    showConfirmDialog(
      I18N.t('confirm_overwrite_copy_title'),
      I18N.t('confirm_overwrite_copy_msg', { count: currentSummary.count }),
      executeCopy
    );
  } else {
    executeCopy();
  }
}

function openTemplatesModal() {
  const currentWeekKey = getWeekKey(weekOffset);
  const currentSummary = getWeekDataSummary(currentWeekKey);
  const metaEl = document.getElementById('currentWeekTemplateMeta');
  if (metaEl) {
    metaEl.textContent = `${currentSummary.count} blocks`;
  }
  const inputEl = document.getElementById('newTemplateNameInput');
  if (inputEl) inputEl.value = '';

  renderTemplatesList();

  const modal = document.getElementById('templatesModal');
  const box = document.getElementById('templatesModalBox');
  if (!modal || !box) return;
  modal.classList.remove('hidden');
  setTimeout(() => {
    modal.classList.remove('opacity-0');
    box.classList.remove('scale-95', 'translate-y-6');
    box.classList.add('scale-100', 'translate-y-0');
  }, 10);
  if (window.lucide) window.lucide.createIcons();
}

function closeTemplatesModal() {
  const modal = document.getElementById('templatesModal');
  const box = document.getElementById('templatesModalBox');
  if (!modal || !box) return;
  modal.classList.add('opacity-0');
  box.classList.remove('scale-100', 'translate-y-0');
  box.classList.add('scale-95', 'translate-y-6');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 200);
}

function saveCurrentWeekAsTemplate() {
  const inputEl = document.getElementById('newTemplateNameInput');
  const name = inputEl ? inputEl.value.trim() : '';

  if (!name) {
    showToast(I18N.t('toast_template_name_required'));
    return;
  }

  const currentWeekKey = getWeekKey(weekOffset);
  const routine = extractRoutineFromWeek(currentWeekKey);

  if (!routine || routine.totalBlocks === 0) {
    showToast(I18N.t('toast_curr_week_empty'));
    return;
  }

  const newTemplate = {
    id: 'tmpl-' + Date.now(),
    name: name,
    createdAt: new Date().toISOString(),
    totalBlocks: routine.totalBlocks,
    tagIds: routine.tagIds,
    blocksData: routine.blocksData
  };

  weeklyTemplates.unshift(newTemplate);
  saveTemplatesData();

  if (inputEl) inputEl.value = '';
  renderTemplatesList();
  showToast(I18N.t('toast_template_saved', { name: escapeHtml(name) }));
}

function applyTemplateToCurrentWeek(templateId) {
  const template = weeklyTemplates.find(t => t.id === templateId);
  if (!template) return;

  const currentWeekKey = getWeekKey(weekOffset);
  const currentSummary = getWeekDataSummary(currentWeekKey);

  const executeApply = () => {
    applyRoutineToWeek(currentWeekKey, template.blocksData);
    renderCurrentView();
    closeTemplatesModal();
    showToast(I18N.t('toast_template_applied', { name: escapeHtml(template.name) }));
  };

  if (currentSummary.count > 0) {
    showConfirmDialog(
      I18N.t('confirm_overwrite_template_title'),
      I18N.t('confirm_overwrite_template_msg', { count: currentSummary.count, name: escapeHtml(template.name) }),
      executeApply
    );
  } else {
    executeApply();
  }
}

function promptDeleteTemplate(templateId) {
  const template = weeklyTemplates.find(t => t.id === templateId);
  if (!template) return;

  showConfirmDialog(
    I18N.t('confirm_delete_template_title'),
    I18N.t('confirm_delete_template_msg', { name: escapeHtml(template.name) }),
    () => {
      weeklyTemplates = weeklyTemplates.filter(t => t.id !== templateId);
      saveTemplatesData();
      renderTemplatesList();
      showToast(I18N.t('toast_template_deleted'));
    }
  );
}

function renderTemplatesList() {
  const container = document.getElementById('templatesListContainer');
  const countEl = document.getElementById('savedTemplatesCount');
  if (!container) return;

  container.innerHTML = '';
  if (countEl) {
    countEl.textContent = `${weeklyTemplates.length} ${I18N.t('templates_btn').toLowerCase()}`;
  }

  if (weeklyTemplates.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
        <i data-lucide="layers" class="w-8 h-8 mx-auto mb-2 opacity-50 text-violet-400"></i>
        <p class="text-xs">${I18N.t('no_templates_msg')}</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  weeklyTemplates.forEach(tmpl => {
    const card = document.createElement('div');
    card.className = 'p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs flex flex-col gap-2.5 transition hover:border-violet-300 dark:hover:border-violet-800';

    const dateStr = tmpl.createdAt ? tmpl.createdAt.slice(0, 10) : '';

    // Render tag chips
    let tagsHtml = '';
    if (Array.isArray(tmpl.tagIds)) {
      tmpl.tagIds.slice(0, 4).forEach(tid => {
        const tag = getTagById(tid);
        tagsHtml += `
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium" style="background-color: ${tag.color}1a; color: ${tag.color};">
            <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${tag.color}"></span>
            <span>${escapeHtml(tag.name)}</span>
          </span>
        `;
      });
      if (tmpl.tagIds.length > 4) {
        tagsHtml += `<span class="text-[10px] text-slate-400 self-center">+${tmpl.tagIds.length - 4}</span>`;
      }
    }

    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0 flex-1">
          <h4 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
            <i data-lucide="bookmark" class="w-3.5 h-3.5 text-violet-500 flex-shrink-0"></i>
            <span>${escapeHtml(tmpl.name)}</span>
          </h4>
          <div class="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
            <span>${I18N.t('template_blocks_count', { count: tmpl.totalBlocks || 0 })}</span>
            <span>•</span>
            <span>${I18N.t('template_created_at', { date: dateStr })}</span>
          </div>
        </div>
        <div class="flex items-center gap-1.5 flex-shrink-0">
          <button onclick="promptDeleteTemplate('${tmpl.id}')" class="p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-400 transition" title="${I18N.t('delete_template_btn')}">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
          <button onclick="applyTemplateToCurrentWeek('${tmpl.id}')" class="flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold shadow-sm transition">
            <i data-lucide="arrow-down-circle" class="w-3.5 h-3.5"></i>
            <span>${I18N.t('apply_template_btn')}</span>
          </button>
        </div>
      </div>
      ${tagsHtml ? `<div class="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800/60">${tagsHtml}</div>` : ''}
    `;

    container.appendChild(card);
  });

  if (window.lucide) window.lucide.createIcons();
}

/* 2. Central Tasks Hub Modal */
function openTasksHubModal() {
  renderTasksHubFilterTabs();
  renderTasksHubList();
  const modal = document.getElementById('tasksHubModal');
  const box = document.getElementById('tasksHubBox');
  modal.classList.remove('hidden');
  setTimeout(() => {
    modal.classList.remove('opacity-0');
    box.classList.remove('scale-95', 'translate-y-6');
    box.classList.add('scale-100', 'translate-y-0');
  }, 10);
  if (window.lucide) window.lucide.createIcons();
}

function closeTasksHubModal() {
  const modal = document.getElementById('tasksHubModal');
  const box = document.getElementById('tasksHubBox');
  modal.classList.add('opacity-0');
  box.classList.remove('scale-100', 'translate-y-0');
  box.classList.add('scale-95', 'translate-y-6');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 200);
  if (activeModalTarget) {
    renderModalBlockTasks();
  }
  renderCurrentView();
}

/* 3. Custom Tags Modal (Delegates to Settings Modal Tags Tab) */
function openTagsModal() {
  openSettingsModal('tags');
}

function closeTagsModal() {
  closeSettingsModal();
}

/* 3.5 Keyboard Shortcuts Modal */
function openShortcutsModal() {
  const modal = document.getElementById('shortcutsModal');
  const box = document.getElementById('shortcutsModalBox');
  if (!modal || !box) return;
  modal.classList.remove('hidden');
  setTimeout(() => {
    modal.classList.remove('opacity-0');
    box.classList.remove('scale-95', 'translate-y-6');
    box.classList.add('scale-100', 'translate-y-0');
  }, 10);
  if (window.lucide) window.lucide.createIcons();
}

function closeShortcutsModal() {
  const modal = document.getElementById('shortcutsModal');
  const box = document.getElementById('shortcutsModalBox');
  if (!modal || !box) return;
  modal.classList.add('opacity-0');
  box.classList.remove('scale-100', 'translate-y-0');
  box.classList.add('scale-95', 'translate-y-6');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 200);
}

/* 4. Settings Modal */
function updateSettingsCyclesHelper() {
  const workInput = document.getElementById('settingsWorkBlockInput');
  const breakInput = document.getElementById('settingsBreakBlockInput');
  const bedInput = document.getElementById('settingsBedtimeInput');
  const wakeInput = document.getElementById('settingsWakeTimeInput');
  const helper = document.getElementById('settingsCyclesHelper');
  const sleepHelper = document.getElementById('settingsSleepHelper');

  const bedVal = bedInput ? bedInput.value : (AppSettings.get('bedtime') || '23:30');
  const wakeVal = wakeInput ? wakeInput.value : (AppSettings.get('wakeTime') || '07:30');

  const wakeMin = parseTimeToMinutes(wakeVal, 7 * 60 + 30);
  const bedMin = parseTimeToMinutes(bedVal, 23 * 60 + 30);

  let awakeMins = bedMin - wakeMin;
  if (awakeMins <= 0) awakeMins += 1440;
  const sleepMins = 1440 - awakeMins;

  if (sleepHelper) {
    const sH = Math.floor(sleepMins / 60);
    const sM = sleepMins % 60;
    const aH = (awakeMins / 60).toFixed(1).replace('.0', '');
    if (typeof I18N !== 'undefined' && I18N.t) {
      sleepHelper.textContent = I18N.t('settings_sleep_helper', {
        hours: sH,
        mins: sM,
        awake: aH
      });
    } else {
      sleepHelper.textContent = `${sH}h ${sM}m sleep • ${aH}h awake per day`;
    }
  }

  if (!workInput || !breakInput || !helper) return;

  const work = parseInt(workInput.value, 10);
  const rest = parseInt(breakInput.value, 10);

  if (!isNaN(work) && !isNaN(rest) && (work + rest) > 0) {
    const cycleMins = work + rest;
    const cycles = Math.floor(awakeMins / cycleMins);
    const totalMinutesCovered = cycles * cycleMins;
    const hours = Math.floor(totalMinutesCovered / 60);
    const mins = totalMinutesCovered % 60;
    const hoursText = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;

    if (typeof I18N !== 'undefined' && I18N.t) {
      helper.textContent = I18N.t('settings_cycles_helper', {
        cycles: cycles,
        total: cycles * 2,
        hours: hoursText
      });
    } else {
      helper.textContent = `≈ ${cycles} full cycles in awake hours (${cycles * 2} blocks, ${hoursText} total)`;
    }
  } else {
    helper.textContent = '';
  }
}

function switchSettingsTab(tabName = 'preferences') {
  const tabs = ['preferences', 'cloud', 'backup', 'tags'];
  tabs.forEach(t => {
    const tabBtn = document.getElementById(`settingsTabBtn-${t}`);
    const tabPane = document.getElementById(`settingsTabPane-${t}`);
    if (tabBtn) {
      if (t === tabName) {
        tabBtn.className = 'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow-sm transition whitespace-nowrap';
      } else {
        tabBtn.className = 'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition whitespace-nowrap';
      }
    }
    if (tabPane) {
      if (t === tabName) {
        tabPane.classList.remove('hidden');
      } else {
        tabPane.classList.add('hidden');
      }
    }
  });

  if (tabName === 'cloud') {
    updateSupabaseModalStatus();
  } else if (tabName === 'tags') {
    renderCustomTagsList();
  }

  if (window.lucide && lucide.createIcons) lucide.createIcons();
}

function openSettingsModal(defaultTab = 'preferences') {
  switchSettingsTab(defaultTab);
  const currentLang = (typeof AppSettings !== 'undefined') ? AppSettings.get('language') : I18N.currentLang;
  const currentCal = (typeof AppSettings !== 'undefined') ? AppSettings.get('calendarType') : 'gregorian';
  const currentTz = (typeof AppSettings !== 'undefined') ? AppSettings.get('timezone') : 'system';
  const currentWork = (typeof AppSettings !== 'undefined') ? (AppSettings.get('workBlockMins') || 90) : 90;
  const currentBreak = (typeof AppSettings !== 'undefined') ? (AppSettings.get('breakBlockMins') || 30) : 30;
  const currentBedtime = (typeof AppSettings !== 'undefined') ? (AppSettings.get('bedtime') || '23:30') : '23:30';
  const currentWakeTime = (typeof AppSettings !== 'undefined') ? (AppSettings.get('wakeTime') || '07:30') : '07:30';

  // Language radio
  const langRadio = document.querySelector(`input[name="settingsLanguage"][value="${currentLang}"]`);
  if (langRadio) langRadio.checked = true;

  // Calendar radio
  const calRadio = document.querySelector(`input[name="settingsCalendar"][value="${currentCal}"]`);
  if (calRadio) calRadio.checked = true;

  // Sleep / Wake times
  const bedtimeInput = document.getElementById('settingsBedtimeInput');
  const wakeTimeInput = document.getElementById('settingsWakeTimeInput');
  const sleepError = document.getElementById('settingsSleepError');

  if (bedtimeInput) bedtimeInput.value = currentBedtime;
  if (wakeTimeInput) wakeTimeInput.value = currentWakeTime;
  if (sleepError) {
    sleepError.textContent = '';
    sleepError.classList.add('hidden');
  }

  // Block durations
  const workInput = document.getElementById('settingsWorkBlockInput');
  const breakInput = document.getElementById('settingsBreakBlockInput');
  const durationError = document.getElementById('settingsDurationError');

  if (workInput) workInput.value = currentWork;
  if (breakInput) breakInput.value = currentBreak;
  if (durationError) {
    durationError.textContent = '';
    durationError.classList.add('hidden');
  }
  updateSettingsCyclesHelper();

  // Timezone radio & input
  const isCustomTz = currentTz !== 'system';
  const tzRadio = document.querySelector(`input[name="settingsTimezoneType"][value="${isCustomTz ? 'custom' : 'system'}"]`);
  if (tzRadio) tzRadio.checked = true;

  const customTzContainer = document.getElementById('settingsCustomTzContainer');
  const customTzInput = document.getElementById('settingsCustomTzInput');
  const tzError = document.getElementById('settingsTzError');

  if (customTzContainer) {
    if (isCustomTz) {
      customTzContainer.classList.remove('hidden');
    } else {
      customTzContainer.classList.add('hidden');
    }
  }

  if (customTzInput) {
    customTzInput.value = isCustomTz ? currentTz : 'Asia/Tehran';
  }

  if (tzError) {
    tzError.classList.add('hidden');
  }

  // Populate Cloud Inputs if fields exist
  if (typeof SupabaseSync !== 'undefined' && SupabaseSync.getConfig) {
    const cfg = SupabaseSync.getConfig();
    const sbUrlEl = document.getElementById('sbUrlInput');
    const sbKeyEl = document.getElementById('sbKeyInput');
    if (sbUrlEl) sbUrlEl.value = cfg.url || '';
    if (sbKeyEl) sbKeyEl.value = cfg.key || '';
    updateSupabaseModalStatus();
  }

  renderCustomTagsList();

  const modal = document.getElementById('settingsModal');
  const box = document.getElementById('settingsModalBox');
  modal.classList.remove('hidden');
  setTimeout(() => {
    modal.classList.remove('opacity-0');
    box.classList.remove('scale-95', 'translate-y-6');
    box.classList.add('scale-100', 'translate-y-0');
  }, 10);

  if (window.lucide) window.lucide.createIcons();
}

function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  const box = document.getElementById('settingsModalBox');
  if (!modal || !box) return;
  modal.classList.add('opacity-0');
  box.classList.remove('scale-100', 'translate-y-0');
  box.classList.add('scale-95', 'translate-y-6');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 200);
}

function validateTimezoneIdentifier(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
}

function saveSettingsModalChanges() {
  const langRadio = document.querySelector('input[name="settingsLanguage"]:checked');
  const calRadio = document.querySelector('input[name="settingsCalendar"]:checked');
  const tzRadio = document.querySelector('input[name="settingsTimezoneType"]:checked');
  const customTzInput = document.getElementById('settingsCustomTzInput');
  const tzError = document.getElementById('settingsTzError');
  const workInput = document.getElementById('settingsWorkBlockInput');
  const breakInput = document.getElementById('settingsBreakBlockInput');
  const durationError = document.getElementById('settingsDurationError');
  const bedtimeInput = document.getElementById('settingsBedtimeInput');
  const wakeTimeInput = document.getElementById('settingsWakeTimeInput');
  const sleepError = document.getElementById('settingsSleepError');

  const newLang = langRadio ? langRadio.value : 'en';
  const newCal = calRadio ? calRadio.value : 'gregorian';
  const isCustomTz = tzRadio ? tzRadio.value === 'custom' : false;

  // Validate sleep & wake times
  const newBedtime = bedtimeInput ? bedtimeInput.value.trim() : '23:30';
  const newWakeTime = wakeTimeInput ? wakeTimeInput.value.trim() : '07:30';

  if (!newBedtime || !newWakeTime || newBedtime === newWakeTime) {
    if (sleepError) {
      sleepError.textContent = typeof I18N !== 'undefined' ? I18N.t('settings_time_invalid') : 'Invalid bedtime / wake-up time.';
      sleepError.classList.remove('hidden');
    }
    return false;
  }
  if (sleepError) {
    sleepError.textContent = '';
    sleepError.classList.add('hidden');
  }

  // Validate block durations
  const rawWork = workInput ? String(workInput.value).trim() : '';
  const rawBreak = breakInput ? String(breakInput.value).trim() : '';
  const workMins = parseInt(rawWork, 10);
  const breakMins = parseInt(rawBreak, 10);

  let durationErrorMessage = '';
  if (isNaN(workMins) || workMins < 10 || workMins > 180 || workMins % 5 !== 0) {
    durationErrorMessage = typeof I18N !== 'undefined'
      ? I18N.t('settings_work_invalid')
      : 'Work duration must be a multiple of 5 between 10 and 180 minutes.';
  } else if (isNaN(breakMins) || breakMins < 5 || breakMins > 60 || breakMins % 5 !== 0) {
    durationErrorMessage = typeof I18N !== 'undefined'
      ? I18N.t('settings_break_invalid')
      : 'Break duration must be a multiple of 5 between 5 and 60 minutes.';
  }

  if (durationErrorMessage) {
    if (durationError) {
      durationError.textContent = durationErrorMessage;
      durationError.classList.remove('hidden');
    }
    return false;
  }
  if (durationError) {
    durationError.textContent = '';
    durationError.classList.add('hidden');
  }

  let newTz = 'system';
  if (isCustomTz) {
    const tzVal = (customTzInput ? customTzInput.value : '').trim();
    if (!validateTimezoneIdentifier(tzVal)) {
      if (tzError) {
        tzError.classList.remove('hidden');
      }
      return false;
    }
    newTz = tzVal;
  }

  if (tzError) tzError.classList.add('hidden');

  AppSettings.set('workBlockMins', workMins);
  AppSettings.set('breakBlockMins', breakMins);
  AppSettings.set('bedtime', newBedtime);
  AppSettings.set('wakeTime', newWakeTime);
  AppSettings.set('timezone', newTz);
  AppSettings.set('calendarType', newCal);
  AppSettings.set('language', newLang);

  if (typeof SupabaseSync !== 'undefined' && SupabaseSync.isConfigured) {
    if (typeof SupabaseSync.upsertSettings === 'function') {
      SupabaseSync.upsertSettings({
        workBlockMins: workMins,
        breakBlockMins: breakMins,
        bedtime: newBedtime,
        wakeTime: newWakeTime
      });
    } else if (typeof SupabaseSync.upsertSetting === 'function') {
      SupabaseSync.upsertSetting('workBlockMins', workMins);
      SupabaseSync.upsertSetting('breakBlockMins', breakMins);
      SupabaseSync.upsertSetting('bedtime', newBedtime);
      SupabaseSync.upsertSetting('wakeTime', newWakeTime);
    }
  }

  if (typeof generateScheduleDefinition === 'function') {
    SCHEDULE_METADATA = generateScheduleDefinition(workMins, breakMins, newBedtime, newWakeTime);
  }

  if (I18N.currentLang !== newLang) {
    I18N.setLanguage(newLang);
  } else {
    updateLiveIranTicker();
    renderDayTabs();
    renderCurrentView();
  }

  closeSettingsModal();
  showToast(I18N.t('toast_settings_saved'));
  return true;
}

/* 4. Supabase Cloud Settings Modal (Deep links into Settings Modal Cloud tab) */
function openSupabaseModal() {
  openSettingsModal('cloud');
}

function closeSupabaseModal() {
  closeSettingsModal();
}

function updateSupabaseModalStatus() {
  const statusEl = document.getElementById('sbConnectionStatus');
  if (!statusEl) return;

  if (SupabaseSync.status === 'connected') {
    statusEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"><span class="status-indicator-dot bg-emerald-500"></span> ${I18N.t('sb_status_connected')}</span>`;
  } else if (SupabaseSync.status === 'syncing') {
    statusEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800"><span class="status-indicator-dot bg-indigo-500 animate-ping"></span> ${I18N.t('sb_status_syncing')}</span>`;
  } else {
    statusEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800"><span class="status-indicator-dot bg-amber-500"></span> ${I18N.t('sb_status_offline')}</span>`;
  }
}

async function saveSupabaseSettings() {
  const url = document.getElementById('sbUrlInput').value.trim();
  const key = document.getElementById('sbKeyInput').value.trim();

  SupabaseSync.saveConfig(url, key);
  updateSupabaseModalStatus();

  if (SupabaseSync.isConfigured) {
    showToast(I18N.t('toast_cloud_saved'));
    await syncFromSupabase();
    closeSupabaseModal();
  } else {
    showToast(I18N.t('toast_cloud_offline'));
  }
}

async function uploadLocalDataToSupabase() {
  if (!SupabaseSync.isConfigured) {
    showToast(I18N.t('sb_status_offline'));
    return;
  }

  try {
    showToast(I18N.t('toast_cloud_uploading'));
    const payload = getFullBackupPayload();
    await SupabaseSync.migrateLocalDataToCloud(payload);
    showToast(I18N.t('toast_cloud_upload_done'));
  } catch (err) {
    console.error('Migration error:', err);
    showToast('Error syncing with Supabase.');
  }
}

/* 5. Reset & Deletion Operations */
function promptResetDay() {
  const dayObj = DAYS_OF_WEEK.find(d => d.id === selectedDayId);
  showConfirmDialog(
    I18N.t('confirm_reset_day_title', { day: dayObj.name }),
    I18N.t('confirm_reset_day_msg', { day: dayObj.name }),
    () => {
      const curWeekKey = getWeekKey(weekOffset);
      if (weeksData[curWeekKey] && weeksData[curWeekKey][selectedDayId]) {
        weeksData[curWeekKey][selectedDayId] = {};
        saveAppData();

        if (SupabaseSync.isConfigured) {
          SupabaseSync.deleteDayBlocks(curWeekKey, selectedDayId);
        }

        renderCurrentView();
        showToast(I18N.t('toast_day_cleared'));
      }
    }
  );
}

function promptResetWeek() {
  showConfirmDialog(
    I18N.t('confirm_reset_week_title'),
    I18N.t('confirm_reset_week_msg'),
    () => {
      const curWeekKey = getWeekKey(weekOffset);
      weeksData[curWeekKey] = {};
      ensureWeekStructure(curWeekKey);
      saveAppData();

      if (SupabaseSync.isConfigured) {
        SupabaseSync.deleteWeekBlocks(curWeekKey);
      }

      renderCurrentView();
      showToast(I18N.t('toast_week_cleared'));
    }
  );
}

function showConfirmDialog(title, message, onAccept) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;
  pendingConfirmAction = onAccept;

  const dialog = document.getElementById('confirmDialog');
  dialog.classList.remove('hidden');
  setTimeout(() => dialog.classList.remove('opacity-0'), 10);
}

function closeConfirmDialog() {
  const dialog = document.getElementById('confirmDialog');
  dialog.classList.add('opacity-0');
  setTimeout(() => {
    dialog.classList.add('hidden');
    pendingConfirmAction = null;
  }, 200);
}

/* 6. Backup, Export & Import */
function getFullBackupPayload() {
  return {
    version: '3.2',
    exportedAt: new Date().toISOString(),
    settings: {
      workBlockMins: typeof AppSettings !== 'undefined' ? AppSettings.get('workBlockMins') : 90,
      breakBlockMins: typeof AppSettings !== 'undefined' ? AppSettings.get('breakBlockMins') : 30,
      bedtime: typeof AppSettings !== 'undefined' ? AppSettings.get('bedtime') : '23:30',
      wakeTime: typeof AppSettings !== 'undefined' ? AppSettings.get('wakeTime') : '07:30'
    },
    customTags,
    sharedTasksBank,
    weeklyTemplates,
    weeksData
  };
}

function applyFullBackupPayload(parsed) {
  if (!parsed || !parsed.weeksData) {
    showToast('Invalid backup file format.');
    return false;
  }
  weeksData = parsed.weeksData;
  if (Array.isArray(parsed.customTags)) customTags = parsed.customTags;
  if (Array.isArray(parsed.sharedTasksBank)) sharedTasksBank = parsed.sharedTasksBank;
  if (Array.isArray(parsed.weeklyTemplates)) {
    weeklyTemplates = parsed.weeklyTemplates;
    saveTemplatesData();
  }

  if (parsed.settings && typeof parsed.settings === 'object' && typeof AppSettings !== 'undefined') {
    const work = parseInt(parsed.settings.workBlockMins, 10);
    const rest = parseInt(parsed.settings.breakBlockMins, 10);
    if (!isNaN(work) && work >= 10 && work <= 180) AppSettings.set('workBlockMins', work);
    if (!isNaN(rest) && rest >= 5 && rest <= 60) AppSettings.set('breakBlockMins', rest);
    if (parsed.settings.bedtime) AppSettings.set('bedtime', parsed.settings.bedtime);
    if (parsed.settings.wakeTime) AppSettings.set('wakeTime', parsed.settings.wakeTime);

    if (typeof generateScheduleDefinition === 'function') {
      SCHEDULE_METADATA = generateScheduleDefinition(
        AppSettings.get('workBlockMins'),
        AppSettings.get('breakBlockMins'),
        AppSettings.get('bedtime'),
        AppSettings.get('wakeTime')
      );
    }
  }

  saveAppData();
  saveTagsData();
  saveTasksBank();

  if (SupabaseSync.isConfigured) {
    SupabaseSync.migrateLocalDataToCloud(parsed);
  }

  renderDayTabs();
  renderCurrentView();
  updateLiveIranTicker();
  showToast(I18N.t('toast_backup_restored'));
  return true;
}

function exportToJson() {
  const payload = getFullBackupPayload();
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `timeblocking-weekly-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(I18N.t('toast_backup_downloaded'));
}

function copyJsonToClipboard() {
  const payload = getFullBackupPayload();
  const jsonStr = JSON.stringify(payload);
  const el = document.createElement('textarea');
  el.value = jsonStr;
  document.body.appendChild(el);
  el.select();
  try {
    document.execCommand('copy');
    showToast(I18N.t('toast_backup_copied'));
  } catch (e) {
    showToast('Error copying to clipboard.');
  }
  document.body.removeChild(el);
}

function importFromJson(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      applyFullBackupPayload(parsed);
    } catch (err) {
      showToast('Error reading JSON file.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function openPasteBackupModal() {
  const modal = document.getElementById('pasteBackupModal');
  const box = document.getElementById('pasteBackupBox');
  document.getElementById('pasteBackupTextarea').value = '';
  modal.classList.remove('hidden');
  setTimeout(() => {
    modal.classList.remove('opacity-0');
    box.classList.remove('scale-95', 'translate-y-6');
    box.classList.add('scale-100', 'translate-y-0');
  }, 10);
}

function closePasteBackupModal() {
  const modal = document.getElementById('pasteBackupModal');
  const box = document.getElementById('pasteBackupBox');
  modal.classList.add('opacity-0');
  box.classList.remove('scale-100', 'translate-y-0');
  box.classList.add('scale-95', 'translate-y-6');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 200);
}

function applyPastedBackup() {
  const text = document.getElementById('pasteBackupTextarea').value.trim();
  if (!text) return;
  try {
    const parsed = JSON.parse(text);
    if (applyFullBackupPayload(parsed)) {
      closePasteBackupModal();
    }
  } catch (e) {
    showToast('Invalid JSON code.');
  }
}

/* 7. Utilities & Toast */
function showToast(msg) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  if (!toast || !toastMsg) return;
  toastMsg.textContent = msg;
  toast.classList.remove('opacity-0', 'translate-y-12', 'pointer-events-none');
  toast.classList.add('opacity-100', 'translate-y-0');
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-12', 'pointer-events-none');
    toast.classList.remove('opacity-100', 'translate-y-0');
  }, 2500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

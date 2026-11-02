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
  document.getElementById('modalBlockType').textContent = meta.type === 'work' 
    ? I18N.t('modal_block_work_desc', { cycle: meta.cycleNumber }) 
    : I18N.t('modal_block_break_desc', { cycle: meta.cycleNumber });

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
    box.classList.remove('scale-95');
    box.classList.add('scale-100');
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
  box.classList.remove('scale-100');
  box.classList.add('scale-95');
  setTimeout(() => {
    modal.classList.add('hidden');
    activeModalTarget = null;
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

/* 2. Central Tasks Hub Modal */
function openTasksHubModal() {
  renderTasksHubFilterTabs();
  renderTasksHubList();
  const modal = document.getElementById('tasksHubModal');
  const box = document.getElementById('tasksHubBox');
  modal.classList.remove('hidden');
  setTimeout(() => {
    modal.classList.remove('opacity-0');
    box.classList.remove('scale-95');
    box.classList.add('scale-100');
  }, 10);
  if (window.lucide) window.lucide.createIcons();
}

function closeTasksHubModal() {
  const modal = document.getElementById('tasksHubModal');
  const box = document.getElementById('tasksHubBox');
  modal.classList.add('opacity-0');
  box.classList.remove('scale-100');
  box.classList.add('scale-95');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 200);
  if (activeModalTarget) {
    renderModalBlockTasks();
  }
  renderCurrentView();
}

/* 3. Custom Tags Modal */
function openTagsModal() {
  const modal = document.getElementById('tagsModal');
  const box = document.getElementById('tagsModalBox');
  modal.classList.remove('hidden');
  setTimeout(() => {
    modal.classList.remove('opacity-0');
    box.classList.remove('scale-95');
    box.classList.add('scale-100');
  }, 10);
}

function closeTagsModal() {
  const modal = document.getElementById('tagsModal');
  const box = document.getElementById('tagsModalBox');
  modal.classList.add('opacity-0');
  box.classList.remove('scale-100');
  box.classList.add('scale-95');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 200);
}

/* 4. Settings Modal */
function openSettingsModal() {
  const currentLang = (typeof AppSettings !== 'undefined') ? AppSettings.get('language') : I18N.currentLang;
  const currentCal = (typeof AppSettings !== 'undefined') ? AppSettings.get('calendarType') : 'gregorian';
  const currentTz = (typeof AppSettings !== 'undefined') ? AppSettings.get('timezone') : 'system';

  // Language radio
  const langRadio = document.querySelector(`input[name="settingsLanguage"][value="${currentLang}"]`);
  if (langRadio) langRadio.checked = true;

  // Calendar radio
  const calRadio = document.querySelector(`input[name="settingsCalendar"][value="${currentCal}"]`);
  if (calRadio) calRadio.checked = true;

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

  const modal = document.getElementById('settingsModal');
  const box = document.getElementById('settingsModalBox');
  modal.classList.remove('hidden');
  setTimeout(() => {
    modal.classList.remove('opacity-0');
    box.classList.remove('scale-95');
    box.classList.add('scale-100');
  }, 10);

  if (window.lucide) window.lucide.createIcons();
}

function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  const box = document.getElementById('settingsModalBox');
  if (!modal || !box) return;
  modal.classList.add('opacity-0');
  box.classList.remove('scale-100');
  box.classList.add('scale-95');
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

  const newLang = langRadio ? langRadio.value : 'en';
  const newCal = calRadio ? calRadio.value : 'gregorian';
  const isCustomTz = tzRadio ? tzRadio.value === 'custom' : false;

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

  AppSettings.set('timezone', newTz);
  AppSettings.set('calendarType', newCal);
  AppSettings.set('language', newLang);

  if (I18N.currentLang !== newLang) {
    I18N.setLanguage(newLang);
  } else {
    updateLiveIranTicker();
    renderDayTabs();
    renderCurrentView();
  }

  closeSettingsModal();
  return true;
}

/* 4. Supabase Cloud Settings Modal */
function openSupabaseModal() {
  const cfg = SupabaseSync.getConfig();
  document.getElementById('sbUrlInput').value = cfg.url || '';
  document.getElementById('sbKeyInput').value = cfg.key || '';

  updateSupabaseModalStatus();

  const modal = document.getElementById('supabaseModal');
  const box = document.getElementById('supabaseModalBox');
  modal.classList.remove('hidden');
  setTimeout(() => {
    modal.classList.remove('opacity-0');
    box.classList.remove('scale-95');
    box.classList.add('scale-100');
  }, 10);
}

function closeSupabaseModal() {
  const modal = document.getElementById('supabaseModal');
  const box = document.getElementById('supabaseModalBox');
  modal.classList.add('opacity-0');
  box.classList.remove('scale-100');
  box.classList.add('scale-95');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 200);
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
    version: '3.0',
    exportedAt: new Date().toISOString(),
    customTags,
    sharedTasksBank,
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

  saveAppData();
  saveTagsData();
  saveTasksBank();

  if (SupabaseSync.isConfigured) {
    SupabaseSync.migrateLocalDataToCloud(parsed);
  }

  renderDayTabs();
  renderCurrentView();
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
    box.classList.remove('scale-95');
    box.classList.add('scale-100');
  }, 10);
}

function closePasteBackupModal() {
  const modal = document.getElementById('pasteBackupModal');
  const box = document.getElementById('pasteBackupBox');
  modal.classList.add('opacity-0');
  box.classList.remove('scale-100');
  box.classList.add('scale-95');
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

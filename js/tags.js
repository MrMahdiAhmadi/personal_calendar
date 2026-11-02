/* =====================================================================
   Custom Tags Management Module (Bilingual)
   ===================================================================== */

function renderCustomTagsList() {
  const listEl = document.getElementById('tagsListContainer');
  if (!listEl) return;
  listEl.innerHTML = '';

  customTags.forEach((tag, idx) => {
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-xs';
    const isProtected = tag.id === 'misc';

    item.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="w-4 h-4 rounded-full border border-black/20" style="background-color: ${tag.color};"></span>
        <span class="font-semibold text-slate-800 dark:text-slate-200">${escapeHtml(tag.name)}</span>
      </div>
      <div class="flex items-center gap-1">
        <input type="color" value="${tag.color}" onchange="updateTagColor(${idx}, this.value)" class="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent" title="Color">
        ${!isProtected ? `
          <button onclick="deleteCustomTag(${idx})" class="p-1 text-slate-400 hover:text-rose-500 rounded" title="Delete">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        ` : `<span class="text-[10px] text-slate-400">${I18N.t('tags_general_pill')}</span>`}
      </div>
    `;
    listEl.appendChild(item);
  });

  if (window.lucide) window.lucide.createIcons();
}

function populateTagsDropdowns() {
  // 1. In Block Modal
  const modalSelect = document.getElementById('modalTagSelect');
  if (modalSelect) {
    modalSelect.innerHTML = '';
    customTags.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      modalSelect.appendChild(opt);
    });
  }

  // 2. In Tasks Hub Add Form
  const hubSelect = document.getElementById('tasksHubTargetTagSelect');
  if (hubSelect) {
    hubSelect.innerHTML = '';
    customTags.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      hubSelect.appendChild(opt);
    });
  }
}

function addNewCustomTag() {
  const nameInput = document.getElementById('newTagNameInput');
  const colorInput = document.getElementById('newTagColorPicker');
  const name = nameInput.value.trim();
  const color = colorInput.value;
  if (!name) return;

  const newTag = { id: 'tag-' + Date.now(), name, color };
  customTags.push(newTag);
  nameInput.value = '';
  saveTagsData();

  if (SupabaseSync.isConfigured) {
    SupabaseSync.upsertTag(newTag);
  }

  showToast(I18N.t('toast_tag_added', { name }));
}

function updateTagColor(idx, newColor) {
  if (customTags[idx]) {
    customTags[idx].color = newColor;
    saveTagsData();
    if (SupabaseSync.isConfigured) {
      SupabaseSync.upsertTag(customTags[idx]);
    }
  }
}

function deleteCustomTag(idx) {
  const tag = customTags[idx];
  if (!tag || tag.id === 'misc') return;

  const deletedId = tag.id;

  // Reassign blocks using this tag to 'misc'
  Object.keys(weeksData).forEach(wKey => {
    DAYS_OF_WEEK.forEach(day => {
      for (let i = 0; i < 24; i++) {
        if (weeksData[wKey][day.id] && weeksData[wKey][day.id][i] && weeksData[wKey][day.id][i].tagId === tag.id) {
          weeksData[wKey][day.id][i].tagId = 'misc';
        }
      }
    });
  });

  // Reassign tasks in bank with this tag to 'misc'
  sharedTasksBank.forEach(t => {
    if (t.tagId === tag.id) t.tagId = 'misc';
  });

  customTags.splice(idx, 1);
  saveAppData();
  saveTasksBank();
  saveTagsData();

  if (SupabaseSync.isConfigured) {
    SupabaseSync.deleteTag(deletedId);
  }

  showToast(I18N.t('toast_tag_deleted'));
}

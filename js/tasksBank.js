/* =====================================================================
   Central Shared Task Bank & Block Checklist Engine (Bilingual)
   ===================================================================== */

function renderTasksHubFilterTabs() {
  const tabs = document.getElementById('tasksHubFilterTabs');
  if (!tabs) return;
  tabs.innerHTML = '';

  // All tab
  const allBtn = document.createElement('button');
  allBtn.className = `px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${activeHubFilterTag === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`;
  allBtn.textContent = I18N.t('hub_all_tags');
  allBtn.onclick = () => {
    activeHubFilterTag = 'all';
    renderTasksHubFilterTabs();
    renderTasksHubList();
  };
  tabs.appendChild(allBtn);

  // Specific tags tabs
  customTags.forEach(t => {
    const btn = document.createElement('button');
    const isActive = activeHubFilterTag === t.id;
    btn.className = `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${isActive ? 'text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'}`;
    if (isActive) {
      btn.style.backgroundColor = t.color;
    }
    btn.innerHTML = `
      <span class="w-2 h-2 rounded-full" style="background-color: ${t.color}"></span>
      <span>${escapeHtml(t.name)}</span>
    `;
    btn.onclick = () => {
      activeHubFilterTag = t.id;
      const targetSelect = document.getElementById('tasksHubTargetTagSelect');
      if (targetSelect) targetSelect.value = t.id;
      renderTasksHubFilterTabs();
      renderTasksHubList();
    };
    tabs.appendChild(btn);
  });
}

function renderTasksHubList() {
  const container = document.getElementById('tasksHubListContainer');
  if (!container) return;
  container.innerHTML = '';

  const filtered = sharedTasksBank.filter(t => activeHubFilterTag === 'all' || t.tagId === activeHubFilterTag);
  const totalCountEl = document.getElementById('tasksHubTotalCount');
  if (totalCountEl) totalCountEl.textContent = `${filtered.length} ${I18N.t('tasks_short')}`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-xs text-slate-400">
        <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
        ${I18N.t('hub_empty_msg')}
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  filtered.forEach(task => {
    const tag = getTagById(task.tagId);
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 text-xs transition hover:shadow-sm';
    item.style.borderRight = `3px solid ${tag.color}`;

    item.innerHTML = `
      <div class="flex items-center gap-2 flex-1">
        <span class="text-[10px] px-2 py-0.5 rounded-md font-semibold" style="background-color: ${tag.color}22; color: ${tag.color}">
          ${escapeHtml(tag.name)}
        </span>
        <input type="text" value="${escapeHtml(task.title)}" onchange="updateSharedTaskTitle('${task.id}', this.value)" class="flex-1 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none text-slate-900 dark:text-white py-0.5 font-medium">
      </div>
      <div class="flex items-center gap-1">
        <button onclick="deleteSharedTask('${task.id}')" class="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition" title="Delete">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>
    `;
    container.appendChild(item);
  });

  if (window.lucide) window.lucide.createIcons();
}

function addSharedTaskFromHub() {
  const tagId = document.getElementById('tasksHubTargetTagSelect').value;
  const titleInput = document.getElementById('tasksHubNewTaskTitle');
  const title = titleInput.value.trim();
  if (!title) return;

  const newTask = {
    id: 'tsk-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    tagId: tagId,
    title: title
  };

  sharedTasksBank.push(newTask);
  titleInput.value = '';
  saveTasksBank();

  if (SupabaseSync.isConfigured) {
    SupabaseSync.upsertTask(newTask);
  }

  showToast(I18N.t('toast_task_added'));
}

function updateSharedTaskTitle(id, newTitle) {
  const task = sharedTasksBank.find(t => t.id === id);
  if (task && newTitle.trim()) {
    task.title = newTitle.trim();
    saveTasksBank();
    if (SupabaseSync.isConfigured) {
      SupabaseSync.upsertTask(task);
    }
  }
}

function deleteSharedTask(id) {
  sharedTasksBank = sharedTasksBank.filter(t => t.id !== id);
  saveTasksBank();
  if (SupabaseSync.isConfigured) {
    SupabaseSync.deleteTask(id);
  }
  showToast(I18N.t('toast_task_deleted'));
}

/* Block Modal Task Checklist */
function renderModalBlockTasks() {
  if (!activeModalTarget) return;
  const { weekKey, dayId, blockIndex } = activeModalTarget;
  const block = getBlockData(weekKey, dayId, blockIndex);
  const selectedTagId = document.getElementById('modalTagSelect').value;
  const tagTasks = sharedTasksBank.filter(t => t.tagId === selectedTagId);
  const listEl = document.getElementById('modalTagTasksList');
  if (!listEl) return;
  listEl.innerHTML = '';

  if (tagTasks.length === 0) {
    listEl.innerHTML = `<div class="text-[11px] text-slate-400 text-center py-3 italic">${I18N.t('modal_no_tasks_for_tag')}</div>`;
    return;
  }

  tagTasks.forEach(task => {
    const blockTaskState = (block.blockTasks && block.blockTasks[task.id]) || { assigned: false, completed: false };
    const row = document.createElement('div');
    row.className = `flex items-center justify-between gap-2 p-2 rounded-xl border text-xs transition ${blockTaskState.assigned ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900' : 'bg-slate-100/60 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-800/60 opacity-60'}`;

    row.innerHTML = `
      <label class="flex items-center gap-2 flex-1 cursor-pointer select-none">
        <input type="checkbox" ${blockTaskState.assigned ? 'checked' : ''} onchange="toggleBlockTaskAssigned('${task.id}', this.checked)" class="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5">
        <span class="${blockTaskState.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200 font-medium'}">${escapeHtml(task.title)}</span>
      </label>

      ${blockTaskState.assigned ? `
        <button type="button" onclick="toggleBlockTaskCompleted('${task.id}')" class="px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition ${blockTaskState.completed ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}">
          <i data-lucide="${blockTaskState.completed ? 'check-circle' : 'circle'}" class="w-3 h-3"></i>
          <span>${blockTaskState.completed ? I18N.t('quick_completed') : I18N.t('status_pending')}</span>
        </button>
      ` : `
        <span class="text-[10px] text-slate-400">---</span>
      `}
    `;
    listEl.appendChild(row);
  });

  if (window.lucide) window.lucide.createIcons();
}

function toggleBlockTaskAssigned(taskId, isAssigned) {
  if (!activeModalTarget) return;
  const { weekKey, dayId, blockIndex } = activeModalTarget;
  const block = getBlockData(weekKey, dayId, blockIndex);
  if (!block.blockTasks) block.blockTasks = {};
  if (!block.blockTasks[taskId]) {
    block.blockTasks[taskId] = { assigned: false, completed: false };
  }
  block.blockTasks[taskId].assigned = isAssigned;
  renderModalBlockTasks();
}

function toggleBlockTaskCompleted(taskId) {
  if (!activeModalTarget) return;
  const { weekKey, dayId, blockIndex } = activeModalTarget;
  const block = getBlockData(weekKey, dayId, blockIndex);
  if (block.blockTasks && block.blockTasks[taskId]) {
    block.blockTasks[taskId].completed = !block.blockTasks[taskId].completed;
    renderModalBlockTasks();
  }
}

function addQuickTaskFromBlock() {
  const input = document.getElementById('modalQuickNewTaskInput');
  const title = input.value.trim();
  const currentTagId = document.getElementById('modalTagSelect').value;
  if (!title) return;

  const newTask = {
    id: 'tsk-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    tagId: currentTagId,
    title: title
  };

  sharedTasksBank.push(newTask);
  saveTasksBank();

  if (SupabaseSync.isConfigured) {
    SupabaseSync.upsertTask(newTask);
  }

  // Assign to current block
  if (activeModalTarget) {
    const { weekKey, dayId, blockIndex } = activeModalTarget;
    const block = getBlockData(weekKey, dayId, blockIndex);
    if (!block.blockTasks) block.blockTasks = {};
    block.blockTasks[newTask.id] = { assigned: true, completed: false };
  }

  input.value = '';
  renderModalBlockTasks();
  showToast(I18N.t('toast_task_added'));
}

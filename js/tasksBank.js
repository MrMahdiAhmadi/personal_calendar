/* =====================================================================
   Central Shared Task Bank & Block Checklist Engine (Bilingual)
   ===================================================================== */

/**
 * Universal Drag-and-Drop Handler supporting both Desktop Drag & Touch Events
 */
let currentDragSourceEl = null;

function setupDragAndDropItem(itemEl, containerEl, onDropCallback) {
  itemEl.setAttribute('draggable', 'true');

  // Desktop Drag & Drop
  itemEl.addEventListener('dragstart', (e) => {
    currentDragSourceEl = itemEl;
    itemEl.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemEl.getAttribute('data-task-id'));
  });

  itemEl.addEventListener('dragend', () => {
    itemEl.classList.remove('is-dragging');
    currentDragSourceEl = null;
    containerEl.querySelectorAll('.task-drag-item').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
  });

  itemEl.addEventListener('dragover', (e) => {
    if (!currentDragSourceEl || currentDragSourceEl === itemEl) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = itemEl.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (e.clientY < midY) {
      itemEl.classList.add('drag-over-top');
      itemEl.classList.remove('drag-over-bottom');
    } else {
      itemEl.classList.add('drag-over-bottom');
      itemEl.classList.remove('drag-over-top');
    }
  });

  itemEl.addEventListener('dragleave', () => {
    itemEl.classList.remove('drag-over-top', 'drag-over-bottom');
  });

  itemEl.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!currentDragSourceEl || currentDragSourceEl === itemEl) return;

    const sourceTaskId = currentDragSourceEl.getAttribute('data-task-id');
    const targetTaskId = itemEl.getAttribute('data-task-id');
    const insertBefore = itemEl.classList.contains('drag-over-top');

    itemEl.classList.remove('drag-over-top', 'drag-over-bottom');

    if (sourceTaskId && targetTaskId && sourceTaskId !== targetTaskId) {
      onDropCallback(sourceTaskId, targetTaskId, insertBefore);
    }
  });

  // Mobile Touch Drag & Drop via Drag Handle
  const handleEl = itemEl.querySelector('.task-drag-handle');
  if (handleEl) {
    let touchStartY = 0;
    let isTouchDragging = false;
    let currentOverEl = null;
    let autoScrollInterval = null;

    handleEl.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      touchStartY = e.touches[0].clientY;
      currentDragSourceEl = itemEl;
      isTouchDragging = true;
      itemEl.classList.add('is-dragging');
    }, { passive: true });

    handleEl.addEventListener('touchmove', (e) => {
      if (!isTouchDragging || e.touches.length !== 1) return;
      const touchY = e.touches[0].clientY;
      const touchX = e.touches[0].clientX;

      // Prevent window scrolling while dragging the handle
      e.preventDefault();

      // Auto scroll container if near edges
      const containerRect = containerEl.getBoundingClientRect();
      if (touchY < containerRect.top + 30) {
        containerEl.scrollTop -= 6;
      } else if (touchY > containerRect.bottom - 30) {
        containerEl.scrollTop += 6;
      }

      // Find element underneath touch point
      containerEl.querySelectorAll('.task-drag-item').forEach(el => {
        el.classList.remove('drag-over-top', 'drag-over-bottom');
      });

      const elementUnder = document.elementFromPoint(touchX, touchY);
      const targetItem = elementUnder ? elementUnder.closest('.task-drag-item') : null;

      if (targetItem && targetItem !== itemEl && containerEl.contains(targetItem)) {
        currentOverEl = targetItem;
        const rect = targetItem.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (touchY < midY) {
          targetItem.classList.add('drag-over-top');
        } else {
          targetItem.classList.add('drag-over-bottom');
        }
      } else {
        currentOverEl = null;
      }
    }, { passive: false });

    const handleTouchEnd = () => {
      if (!isTouchDragging) return;
      isTouchDragging = false;
      itemEl.classList.remove('is-dragging');

      if (currentOverEl && currentOverEl !== itemEl) {
        const sourceTaskId = itemEl.getAttribute('data-task-id');
        const targetTaskId = currentOverEl.getAttribute('data-task-id');
        const insertBefore = currentOverEl.classList.contains('drag-over-top');

        currentOverEl.classList.remove('drag-over-top', 'drag-over-bottom');
        currentOverEl = null;

        if (sourceTaskId && targetTaskId && sourceTaskId !== targetTaskId) {
          onDropCallback(sourceTaskId, targetTaskId, insertBefore);
        }
      }

      containerEl.querySelectorAll('.task-drag-item').forEach(el => {
        el.classList.remove('drag-over-top', 'drag-over-bottom');
      });
      currentDragSourceEl = null;
    };

    handleEl.addEventListener('touchend', handleTouchEnd);
    handleEl.addEventListener('touchcancel', handleTouchEnd);
  }
}

/**
 * Reorders task in sharedTasksBank and persists change
 */
function reorderSharedTasksBank(sourceId, targetId, insertBefore) {
  const sourceIndex = sharedTasksBank.findIndex(t => t.id === sourceId);
  const targetIndex = sharedTasksBank.findIndex(t => t.id === targetId);

  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return;

  const [movedTask] = sharedTasksBank.splice(sourceIndex, 1);

  // Recalculate targetIndex after removing movedTask
  const newTargetIndex = sharedTasksBank.findIndex(t => t.id === targetId);
  const insertIndex = insertBefore ? newTargetIndex : newTargetIndex + 1;

  sharedTasksBank.splice(insertIndex, 0, movedTask);

  saveTasksBank();
  renderTasksHubList();
}

function renderTasksHubFilterTabs() {
  const tabs = document.getElementById('tasksHubFilterTabs');
  if (!tabs) return;
  tabs.innerHTML = '';

  const isRtl = document.documentElement.dir === 'rtl';

  // All active tasks tab
  const allBtn = document.createElement('button');
  allBtn.className = `px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${activeHubFilterTag === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`;
  allBtn.textContent = I18N.t('hub_all_tags');
  allBtn.onclick = () => {
    activeHubFilterTag = 'all';
    renderTasksHubFilterTabs();
    renderTasksHubList();
  };
  tabs.appendChild(allBtn);

  // Specific tags tabs (active tasks only)
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

  // Archive / Completed tasks tab
  const archivedCount = sharedTasksBank.filter(t => !!t.completed).length;
  const archiveBtn = document.createElement('button');
  const isArchiveActive = activeHubFilterTag === 'archive';
  archiveBtn.className = `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${isArchiveActive ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`;
  archiveBtn.innerHTML = `
    <i data-lucide="archive" class="w-3.5 h-3.5"></i>
    <span>${I18N.t('hub_archive_tab')}</span>
    <span class="px-1.5 py-0.2 rounded-full text-[10px] ${isArchiveActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'} font-mono">${archivedCount}</span>
  `;
  archiveBtn.onclick = () => {
    activeHubFilterTag = 'archive';
    renderTasksHubFilterTabs();
    renderTasksHubList();
  };
  tabs.appendChild(archiveBtn);

  if (window.lucide) window.lucide.createIcons();
}

function renderTasksHubList() {
  const container = document.getElementById('tasksHubListContainer');
  if (!container) return;
  container.innerHTML = '';

  const isRtl = document.documentElement.dir === 'rtl';

  let filtered = [];
  const isArchiveView = activeHubFilterTag === 'archive';

  if (isArchiveView) {
    filtered = sharedTasksBank.filter(t => !!t.completed);
  } else if (activeHubFilterTag === 'all') {
    filtered = sharedTasksBank.filter(t => !t.completed);
  } else {
    filtered = sharedTasksBank.filter(t => !t.completed && t.tagId === activeHubFilterTag);
  }

  const summaryEl = document.getElementById('tasksHubListSummary');
  if (summaryEl) {
    summaryEl.textContent = isArchiveView ? I18N.t('hub_summary_archive') : I18N.t('hub_summary_text');
  }

  const totalCountEl = document.getElementById('tasksHubTotalCount');
  if (totalCountEl) totalCountEl.textContent = `${filtered.length} ${I18N.t('tasks_short')}`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-xs text-slate-400">
        <i data-lucide="${isArchiveView ? 'archive' : 'inbox'}" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
        ${isArchiveView ? I18N.t('hub_archive_empty_msg') : I18N.t('hub_empty_msg')}
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  filtered.forEach((task, index) => {
    const tag = getTagById(task.tagId);
    const item = document.createElement('div');
    item.className = 'task-drag-item flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 text-xs transition hover:shadow-sm';
    item.setAttribute('data-task-id', task.id);
    item.setAttribute('data-index', index);

    if (isRtl) {
      item.style.borderRight = `3px solid ${tag.color}`;
      item.style.borderLeft = 'none';
    } else {
      item.style.borderLeft = `3px solid ${tag.color}`;
      item.style.borderRight = 'none';
    }

    const dragHandleHtml = `
      <div class="task-drag-handle p-1 -m-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0 cursor-grab active:cursor-grabbing" title="Drag to reorder">
        <i data-lucide="grip-vertical" class="w-3.5 h-3.5"></i>
      </div>
    `;

    if (task.completed) {
      item.innerHTML = `
        <div class="flex items-center gap-2 flex-1 min-w-0">
          ${dragHandleHtml}
          <span class="text-[10px] px-2 py-0.5 rounded-md font-semibold flex-shrink-0" style="background-color: ${tag.color}22; color: ${tag.color}">
            ${escapeHtml(tag.name)}
          </span>
          <span class="flex-1 truncate line-through text-slate-400 font-medium">
            ${escapeHtml(task.title)}
          </span>
          <span class="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1 flex-shrink-0">
            <i data-lucide="check" class="w-3 h-3"></i>
            <span>${I18N.t('hub_completed_badge')}</span>
          </span>
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <button onclick="restoreSharedTaskFromArchive('${task.id}')" class="p-1.5 text-slate-500 hover:text-emerald-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition" title="${I18N.t('hub_restore_task')}">
            <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="deleteSharedTask('${task.id}')" class="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition" title="Delete">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      `;
    } else {
      item.innerHTML = `
        <div class="flex items-center gap-2 flex-1 min-w-0">
          ${dragHandleHtml}
          <span class="text-[10px] px-2 py-0.5 rounded-md font-semibold flex-shrink-0" style="background-color: ${tag.color}22; color: ${tag.color}">
            ${escapeHtml(tag.name)}
          </span>
          <input type="text" value="${escapeHtml(task.title)}" onchange="updateSharedTaskTitle('${task.id}', this.value)" class="flex-1 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none text-slate-900 dark:text-white py-0.5 font-medium">
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <button onclick="archiveSharedTaskDirectly('${task.id}')" class="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition" title="${I18N.t('quick_completed')}">
            <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="deleteSharedTask('${task.id}')" class="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition" title="Delete">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      `;
    }

    setupDragAndDropItem(item, container, (sourceId, targetId, insertBefore) => {
      reorderSharedTasksBank(sourceId, targetId, insertBefore);
    });

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
    title: title,
    completed: false,
    completedAt: null
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

function archiveSharedTaskDirectly(taskId) {
  const task = sharedTasksBank.find(t => t.id === taskId);
  if (task) {
    task.completed = true;
    task.completedAt = new Date().toISOString();
    saveTasksBank();
    if (SupabaseSync.isConfigured) {
      SupabaseSync.upsertTask(task);
    }
    renderTasksHubFilterTabs();
    renderTasksHubList();
    showToast(I18N.t('toast_task_archived'));
  }
}

function restoreSharedTaskFromArchive(taskId) {
  const task = sharedTasksBank.find(t => t.id === taskId);
  if (task) {
    task.completed = false;
    task.completedAt = null;
    saveTasksBank();
    if (SupabaseSync.isConfigured) {
      SupabaseSync.upsertTask(task);
    }
    renderTasksHubFilterTabs();
    renderTasksHubList();
    showToast(I18N.t('toast_task_restored'));
  }
}

/* Block Modal Task Checklist */
function renderModalBlockTasks() {
  if (!activeModalTarget) return;
  const { weekKey, dayId, blockIndex } = activeModalTarget;
  const block = getBlockData(weekKey, dayId, blockIndex);
  const selectedTagId = document.getElementById('modalTagSelect').value;

  // Filter tasks for this tag:
  // Show active tasks, PLUS any task that was already assigned to this block (even if now completed)
  // But do NOT show completed/archived tasks from other blocks or unassigned completed tasks!
  let tagTasks = sharedTasksBank.filter(t => {
    if (t.tagId !== selectedTagId) return false;
    const isAssignedToThisBlock = block.blockTasks && block.blockTasks[t.id] && block.blockTasks[t.id].assigned;
    if (isAssignedToThisBlock) return true;
    return !t.completed;
  });

  // Sort tasks according to block.taskOrder if defined
  if (Array.isArray(block.taskOrder) && block.taskOrder.length > 0) {
    const orderMap = new Map();
    block.taskOrder.forEach((tid, idx) => orderMap.set(tid, idx));
    tagTasks.sort((a, b) => {
      const idxA = orderMap.has(a.id) ? orderMap.get(a.id) : 999999;
      const idxB = orderMap.has(b.id) ? orderMap.get(b.id) : 999999;
      return idxA - idxB;
    });
  }

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
    row.className = `task-drag-item flex items-center justify-between gap-2 p-2 rounded-xl border text-xs transition ${blockTaskState.assigned ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900 shadow-xs' : 'bg-slate-100/60 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-800/60 opacity-60'}`;
    row.setAttribute('data-task-id', task.id);

    const dragHandleHtml = `
      <div class="task-drag-handle p-1 -m-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0 cursor-grab active:cursor-grabbing" title="Drag to reorder">
        <i data-lucide="grip-vertical" class="w-3.5 h-3.5"></i>
      </div>
    `;

    row.innerHTML = `
      <div class="flex items-center gap-2 flex-1 min-w-0">
        ${dragHandleHtml}
        <label class="flex items-center gap-2 flex-1 cursor-pointer select-none min-w-0">
          <input type="checkbox" ${blockTaskState.assigned ? 'checked' : ''} onchange="toggleBlockTaskAssigned('${task.id}', this.checked)" class="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 flex-shrink-0">
          <span class="truncate ${blockTaskState.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200 font-medium'}">${escapeHtml(task.title)}</span>
        </label>
      </div>

      ${blockTaskState.assigned ? `
        <button type="button" onclick="toggleBlockTaskCompleted('${task.id}')" class="px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition flex-shrink-0 ${blockTaskState.completed ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}">
          <i data-lucide="${blockTaskState.completed ? 'check-circle' : 'circle'}" class="w-3 h-3"></i>
          <span>${blockTaskState.completed ? I18N.t('quick_completed') : I18N.t('status_pending')}</span>
        </button>
      ` : `
        <span class="text-[10px] text-slate-400 flex-shrink-0">---</span>
      `}
    `;

    setupDragAndDropItem(row, listEl, (sourceId, targetId, insertBefore) => {
      reorderBlockTasks(sourceId, targetId, insertBefore);
    });

    listEl.appendChild(row);
  });

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Reorders tasks inside the active block's checklist and persists
 */
function reorderBlockTasks(sourceId, targetId, insertBefore) {
  if (!activeModalTarget) return;
  const { weekKey, dayId, blockIndex } = activeModalTarget;
  const block = getBlockData(weekKey, dayId, blockIndex);
  const selectedTagId = document.getElementById('modalTagSelect').value;

  // Retrieve current ordered list of tasks for this tag
  let currentTasks = sharedTasksBank.filter(t => {
    if (t.tagId !== selectedTagId) return false;
    const isAssigned = block.blockTasks && block.blockTasks[t.id] && block.blockTasks[t.id].assigned;
    if (isAssigned) return true;
    return !t.completed;
  });

  if (Array.isArray(block.taskOrder) && block.taskOrder.length > 0) {
    const orderMap = new Map();
    block.taskOrder.forEach((tid, idx) => orderMap.set(tid, idx));
    currentTasks.sort((a, b) => {
      const idxA = orderMap.has(a.id) ? orderMap.get(a.id) : 999999;
      const idxB = orderMap.has(b.id) ? orderMap.get(b.id) : 999999;
      return idxA - idxB;
    });
  }

  const currentIds = currentTasks.map(t => t.id);
  const sourceIdx = currentIds.indexOf(sourceId);
  const targetIdx = currentIds.indexOf(targetId);

  if (sourceIdx === -1 || targetIdx === -1 || sourceIdx === targetIdx) return;

  const [movedId] = currentIds.splice(sourceIdx, 1);
  const newTargetIdx = currentIds.indexOf(targetId);
  const insertIdx = insertBefore ? newTargetIdx : newTargetIdx + 1;
  currentIds.splice(insertIdx, 0, movedId);

  block.taskOrder = currentIds;

  // Also adjust sharedTasksBank relative order for these tasks so the order feels natural across the app
  reorderSharedTasksBankRelativeTo(sourceId, targetId, insertBefore);

  saveAppData();
  if (typeof SupabaseSync !== 'undefined' && SupabaseSync.isConfigured) {
    SupabaseSync.upsertBlock(weekKey, dayId, blockIndex, block);
  }

  renderModalBlockTasks();
}

/**
 * Reorders tasks in sharedTasksBank without triggering hub list re-render (helper)
 */
function reorderSharedTasksBankRelativeTo(sourceId, targetId, insertBefore) {
  const sourceIndex = sharedTasksBank.findIndex(t => t.id === sourceId);
  const targetIndex = sharedTasksBank.findIndex(t => t.id === targetId);

  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return;

  const [movedTask] = sharedTasksBank.splice(sourceIndex, 1);
  const newTargetIndex = sharedTasksBank.findIndex(t => t.id === targetId);
  const insertIndex = insertBefore ? newTargetIndex : newTargetIndex + 1;

  sharedTasksBank.splice(insertIndex, 0, movedTask);
  saveTasksBank();
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
  saveAppData();
  if (typeof SupabaseSync !== 'undefined' && SupabaseSync.isConfigured) {
    SupabaseSync.upsertBlock(weekKey, dayId, blockIndex, block);
  }
  renderModalBlockTasks();
}

function toggleBlockTaskCompleted(taskId) {
  if (!activeModalTarget) return;
  const { weekKey, dayId, blockIndex } = activeModalTarget;
  const block = getBlockData(weekKey, dayId, blockIndex);
  if (block.blockTasks && block.blockTasks[taskId]) {
    const isNowCompleted = !block.blockTasks[taskId].completed;
    block.blockTasks[taskId].completed = isNowCompleted;

    // Synchronize with central Task Bank
    const bankTask = sharedTasksBank.find(t => t.id === taskId);
    if (bankTask) {
      bankTask.completed = isNowCompleted;
      bankTask.completedAt = isNowCompleted ? new Date().toISOString() : null;
      saveTasksBank();
      if (typeof SupabaseSync !== 'undefined' && SupabaseSync.isConfigured) {
        SupabaseSync.upsertTask(bankTask);
      }
    }

    saveAppData();
    if (typeof SupabaseSync !== 'undefined' && SupabaseSync.isConfigured) {
      SupabaseSync.upsertBlock(weekKey, dayId, blockIndex, block);
    }
    renderModalBlockTasks();
    renderCurrentView();

    if (isNowCompleted) {
      showToast(I18N.t('toast_task_archived'));
    }
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
    title: title,
    completed: false,
    completedAt: null
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
    saveAppData();
    if (typeof SupabaseSync !== 'undefined' && SupabaseSync.isConfigured) {
      SupabaseSync.upsertBlock(weekKey, dayId, blockIndex, block);
    }
  }

  input.value = '';
  renderModalBlockTasks();
  showToast(I18N.t('toast_task_added'));
}

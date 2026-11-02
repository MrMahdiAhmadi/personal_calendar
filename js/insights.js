/* =====================================================================
   Time Insights & Progress Analytics Module
   Calculates deep work hours, tag domain distribution, and commitment rates
   ===================================================================== */

const TimeInsights = {
  currentPeriod: 'week', // 'week' | 'month'

  setPeriod(period) {
    this.currentPeriod = period;
    this.render();
  },

  /**
   * Aggregates stats across the chosen period.
   * Period 'week': the current weekOffset week.
   * Period 'month': current weekOffset and the 3 preceding weeks (4 weeks total).
   */
  getStats(period = this.currentPeriod) {
    const weekKeys = [];
    if (period === 'month') {
      for (let i = 0; i < 4; i++) {
        weekKeys.push(getWeekKey(weekOffset - i));
      }
    } else {
      weekKeys.push(getWeekKey(weekOffset));
    }

    const metadataList = typeof SCHEDULE_METADATA !== 'undefined' ? SCHEDULE_METADATA : [];
    const awakeMeta = metadataList.filter(m => m.type === 'work' || m.type === 'winddown');
    const awakeIndices = new Set(awakeMeta.map(m => m.blockIndex));
    const metaMap = {};
    metadataList.forEach(m => {
      metaMap[m.blockIndex] = m;
    });

    let totalAwakeBlocks = 0;
    let completedAwakeBlocks = 0;
    let scheduledWorkMinutes = 0;
    let completedWorkMinutes = 0;
    let loggedPomodoroMinutes = 0;
    let totalAssignedTasks = 0;
    let completedAssignedTasks = 0;

    // Tag duration map: { [tagId]: { minutes: number, completedMinutes: number, blocksCount: number } }
    const tagStats = {};
    customTags.forEach(t => {
      tagStats[t.id] = {
        tag: t,
        minutes: 0,
        completedMinutes: 0,
        blocksCount: 0
      };
    });

    weekKeys.forEach(wk => {
      const weekData = weeksData[wk] || {};
      DAYS_OF_WEEK.forEach(day => {
        const dayData = weekData[day.id] || {};
        metadataList.forEach(meta => {
          const blk = dayData[meta.blockIndex];
          const isCompleted = blk && blk.status === 'completed';
          const isWork = meta.type === 'work';
          const isWinddown = meta.type === 'winddown';

          if (isWork || isWinddown) {
            totalAwakeBlocks++;
            if (isCompleted) {
              completedAwakeBlocks++;
            }
          }

          if (isWork) {
            scheduledWorkMinutes += meta.durationMins;
            if (isCompleted) {
              completedWorkMinutes += meta.durationMins;
            }
          }

          if (blk) {
            // Pomodoro logged minutes
            if (blk.pomodoro && typeof blk.pomodoro.totalFocusMinutes === 'number') {
              loggedPomodoroMinutes += blk.pomodoro.totalFocusMinutes;
            }

            // Tasks assigned and completed
            if (blk.blockTasks) {
              Object.keys(blk.blockTasks).forEach(tid => {
                const tItem = blk.blockTasks[tid];
                if (tItem.assigned) {
                  totalAssignedTasks++;
                  if (tItem.completed) {
                    completedAssignedTasks++;
                  }
                }
              });
            }

            // Tag tracking for awake blocks or work/winddown
            if ((isWork || isWinddown) && (blk.title || blk.tagId)) {
              const tid = blk.tagId || 'misc';
              if (!tagStats[tid]) {
                const foundTag = getTagById(tid);
                tagStats[tid] = {
                  tag: foundTag,
                  minutes: 0,
                  completedMinutes: 0,
                  blocksCount: 0
                };
              }
              tagStats[tid].minutes += meta.durationMins;
              tagStats[tid].blocksCount++;
              if (isCompleted) {
                tagStats[tid].completedMinutes += meta.durationMins;
              }
            }
          }
        });
      });
    });

    // Calculate distributions
    const totalTaggedMinutes = Object.values(tagStats).reduce((acc, curr) => acc + curr.minutes, 0);
    const tagBreakdown = Object.values(tagStats)
      .filter(item => item.minutes > 0)
      .map(item => {
        const pct = totalTaggedMinutes > 0 ? Math.round((item.minutes / totalTaggedMinutes) * 100) : 0;
        return {
          ...item,
          percentage: pct,
          hours: (item.minutes / 60).toFixed(1)
        };
      })
      .sort((a, b) => b.minutes - a.minutes);

    const adherenceRate = totalAwakeBlocks > 0
      ? Math.round((completedAwakeBlocks / totalAwakeBlocks) * 100)
      : 0;

    const taskCompletionRate = totalAssignedTasks > 0
      ? Math.round((completedAssignedTasks / totalAssignedTasks) * 100)
      : 0;

    return {
      period,
      weeksCount: weekKeys.length,
      scheduledWorkHours: (scheduledWorkMinutes / 60).toFixed(1),
      completedWorkHours: (completedWorkMinutes / 60).toFixed(1),
      loggedPomodoroHours: (loggedPomodoroMinutes / 60).toFixed(1),
      loggedPomodoroMinutes,
      totalAwakeBlocks,
      completedAwakeBlocks,
      adherenceRate,
      totalAssignedTasks,
      completedAssignedTasks,
      taskCompletionRate,
      tagBreakdown,
      totalTaggedMinutes
    };
  },

  render() {
    const container = document.getElementById('insightsContentContainer');
    if (!container) return;

    const stats = this.getStats(this.currentPeriod);
    const isFa = typeof I18N !== 'undefined' && I18N.currentLang === 'fa';

    // Period switcher pills
    const periodPillsHtml = `
      <div class="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs w-full sm:w-auto font-medium">
        <button id="insightsFilterWeekBtn" class="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg transition ${this.currentPeriod === 'week' ? 'bg-indigo-600 text-white font-semibold shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'}">
          ${I18N.t('insights_period_week')}
        </button>
        <button id="insightsFilterMonthBtn" class="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg transition ${this.currentPeriod === 'month' ? 'bg-indigo-600 text-white font-semibold shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'}">
          ${I18N.t('insights_period_month')}
        </button>
      </div>
    `;

    // Top Metric Cards Grid
    const cardsHtml = `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <!-- Deep Work Hours -->
        <div class="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/40 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs flex flex-col justify-between">
          <div class="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">${I18N.t('insights_deep_work')}</span>
            <i data-lucide="zap" class="w-4 h-4"></i>
          </div>
          <div class="mt-2 flex items-baseline gap-1.5">
            <span class="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white">${stats.completedWorkHours}</span>
            <span class="text-xs text-slate-500 dark:text-slate-400">${I18N.t('insights_hours_short')}</span>
          </div>
          <p class="text-[10px] text-slate-400 mt-1">
            ${I18N.t('insights_scheduled_total', { hours: stats.scheduledWorkHours })}
          </p>
        </div>

        <!-- Adherence Rate -->
        <div class="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs flex flex-col justify-between">
          <div class="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">${I18N.t('insights_commitment')}</span>
            <i data-lucide="target" class="w-4 h-4"></i>
          </div>
          <div class="mt-2 flex items-baseline gap-1.5">
            <span class="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white">${stats.adherenceRate}%</span>
          </div>
          <p class="text-[10px] text-slate-400 mt-1">
            ${I18N.t('insights_blocks_ratio', { done: stats.completedAwakeBlocks, total: stats.totalAwakeBlocks })}
          </p>
        </div>

        <!-- Pomodoro Focus -->
        <div class="p-3.5 rounded-2xl bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/40 dark:to-slate-900 border border-rose-200/80 dark:border-rose-800/60 shadow-xs flex flex-col justify-between">
          <div class="flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">${I18N.t('insights_pomodoro_focus')}</span>
            <span class="text-sm">🍅</span>
          </div>
          <div class="mt-2 flex items-baseline gap-1.5">
            <span class="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white">${stats.loggedPomodoroHours}</span>
            <span class="text-xs text-slate-500 dark:text-slate-400">${I18N.t('insights_hours_short')}</span>
          </div>
          <p class="text-[10px] text-slate-400 mt-1">
            ${I18N.t('insights_pomodoro_mins', { mins: stats.loggedPomodoroMinutes })}
          </p>
        </div>

        <!-- Task Completion Rate -->
        <div class="p-3.5 rounded-2xl bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/40 dark:to-slate-900 border border-violet-200/80 dark:border-violet-800/60 shadow-xs flex flex-col justify-between">
          <div class="flex items-center justify-between text-violet-600 dark:text-violet-400">
            <span class="text-[11px] font-semibold text-slate-600 dark:text-slate-300">${I18N.t('insights_tasks_done')}</span>
            <i data-lucide="check-check" class="w-4 h-4"></i>
          </div>
          <div class="mt-2 flex items-baseline gap-1.5">
            <span class="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-white">${stats.taskCompletionRate}%</span>
          </div>
          <p class="text-[10px] text-slate-400 mt-1">
            ${I18N.t('insights_tasks_ratio', { done: stats.completedAssignedTasks, total: stats.totalAssignedTasks })}
          </p>
        </div>
      </div>
    `;

    // Multi-color Segmented Distribution Bar
    let distributionBarSegments = '';
    if (stats.tagBreakdown.length > 0) {
      distributionBarSegments = stats.tagBreakdown.map(item => `
        <div
          class="h-full transition-all duration-300 relative group cursor-pointer"
          style="width: ${item.percentage}%; background-color: ${item.tag.color};"
          title="${escapeHtml(item.tag.name)}: ${item.percentage}% (${item.hours}h)"
        ></div>
      `).join('');
    } else {
      distributionBarSegments = `<div class="h-full w-full bg-slate-200 dark:bg-slate-700"></div>`;
    }

    // Domain / Category Breakdown List
    let tagItemsHtml = '';
    if (stats.tagBreakdown.length > 0) {
      tagItemsHtml = stats.tagBreakdown.map(item => `
        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-xs">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-3.5 h-3.5 rounded-lg flex-shrink-0 shadow-xs" style="background-color: ${item.tag.color}"></span>
            <div class="min-w-0">
              <span class="font-semibold text-slate-900 dark:text-white truncate block">${escapeHtml(item.tag.name)}</span>
              <span class="text-[10px] text-slate-400">${item.blocksCount} ${I18N.t('insights_cycles')} • ${I18N.t('insights_completed_hours', { hours: (item.completedMinutes / 60).toFixed(1) })}</span>
            </div>
          </div>
          <div class="text-right flex items-center gap-3 flex-shrink-0">
            <div class="text-right">
              <span class="font-mono font-bold text-slate-800 dark:text-slate-100">${item.hours} ${I18N.t('insights_hours_short')}</span>
              <span class="block text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">${item.percentage}%</span>
            </div>
          </div>
        </div>
      `).join('');
    } else {
      tagItemsHtml = `
        <div class="text-center py-8 text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          <i data-lucide="pie-chart" class="w-8 h-8 mx-auto mb-2 opacity-50 text-indigo-400"></i>
          <p>${I18N.t('insights_no_data')}</p>
        </div>
      `;
    }

    // Assemble modal interior
    container.innerHTML = `
      <div class="space-y-5">
        <!-- Filter Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
          <div>
            <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300">${I18N.t('insights_overview_title')}</h4>
            <p class="text-[11px] text-slate-400">${I18N.t('insights_overview_sub')}</p>
          </div>
          ${periodPillsHtml}
        </div>

        <!-- Metric Cards -->
        ${cardsHtml}

        <!-- Domain Distribution Section -->
        <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i data-lucide="pie-chart" class="w-4 h-4 text-indigo-500"></i>
              <span class="text-xs font-bold text-slate-800 dark:text-slate-200">${I18N.t('insights_distribution_title')}</span>
            </div>
            <span class="text-[11px] text-slate-400 font-mono">${(stats.totalTaggedMinutes / 60).toFixed(1)} ${I18N.t('insights_hours_short')} ${I18N.t('insights_total_tracked')}</span>
          </div>

          <!-- Multi-Color Distribution Bar -->
          <div class="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800 shadow-inner">
            ${distributionBarSegments}
          </div>

          <!-- Domain Items Breakdown List -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            ${tagItemsHtml}
          </div>
        </div>

        <!-- Habit & Consistency Insight Banner -->
        <div class="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 flex items-start gap-3">
          <div class="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-600/30">
            <i data-lucide="sparkles" class="w-4 h-4"></i>
          </div>
          <div class="min-w-0 flex-1 text-xs">
            <h5 class="font-bold text-indigo-950 dark:text-indigo-200">${I18N.t('insights_tip_title')}</h5>
            <p class="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              ${stats.adherenceRate >= 70 ? I18N.t('insights_tip_high') : I18N.t('insights_tip_encouragement')}
            </p>
          </div>
        </div>
      </div>
    `;

    // Wire up filter buttons
    const weekBtn = document.getElementById('insightsFilterWeekBtn');
    const monthBtn = document.getElementById('insightsFilterMonthBtn');
    if (weekBtn) weekBtn.onclick = () => this.setPeriod('week');
    if (monthBtn) monthBtn.onclick = () => this.setPeriod('month');

    if (window.lucide && lucide.createIcons) {
      lucide.createIcons();
    }
  }
};

function openInsightsModal() {
  TimeInsights.render();
  const modal = document.getElementById('insightsModal');
  const box = document.getElementById('insightsModalBox');
  if (!modal || !box) return;
  modal.classList.remove('hidden');
  setTimeout(() => {
    modal.classList.remove('opacity-0');
    box.classList.remove('scale-95', 'translate-y-6');
    box.classList.add('scale-100', 'translate-y-0');
  }, 10);
  if (window.lucide && lucide.createIcons) lucide.createIcons();
}

function closeInsightsModal() {
  const modal = document.getElementById('insightsModal');
  const box = document.getElementById('insightsModalBox');
  if (!modal || !box) return;
  modal.classList.add('opacity-0');
  box.classList.remove('scale-100', 'translate-y-0');
  box.classList.add('scale-95', 'translate-y-6');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 200);
}

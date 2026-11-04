/* =====================================================================
   Supabase Client & Cloud Synchronization Module
   ===================================================================== */

const SupabaseSync = {
  client: null,
  isConfigured: false,
  status: 'offline', // 'connected' | 'syncing' | 'offline' | 'error'
  statusListeners: [],
  realtimeChannel: null,

  // Load configured keys from storage or fallback
  getConfig() {
    try {
      const saved = localStorage.getItem(CONFIG.SUPABASE_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.url && parsed.key) return parsed;
      }
    } catch (e) {}

    return {
      url: CONFIG.DEFAULT_SUPABASE_URL,
      key: CONFIG.DEFAULT_SUPABASE_ANON_KEY
    };
  },

  saveConfig(url, key) {
    try {
      localStorage.setItem(CONFIG.SUPABASE_CONFIG_KEY, JSON.stringify({ url: url.trim(), key: key.trim() }));
      this.init();
      return true;
    } catch (e) {
      return false;
    }
  },

  init() {
    const config = this.getConfig();
    if (window.supabase && config.url && config.key) {
      try {
        this.client = window.supabase.createClient(config.url, config.key);
        this.isConfigured = true;
        this.setStatus('connected');
        console.log('[Supabase] Initialized successfully with project:', config.url);
        this.initRealtime();
        return true;
      } catch (err) {
        console.error('[Supabase] Init error:', err);
        this.setStatus('error');
        return false;
      }
    } else {
      this.isConfigured = false;
      this.setStatus('offline');
      return false;
    }
  },

  onStatusChange(fn) {
    this.statusListeners.push(fn);
  },

  setStatus(status) {
    this.status = status;
    this.statusListeners.forEach(fn => fn(status));
  },

  // 1. Tags Operations
  async fetchTags() {
    if (!this.isConfigured || !this.client) return null;
    try {
      this.setStatus('syncing');
      const { data, error } = await this.client
        .from('planner_tags')
        .select('*')
        .order('created_at', { ascending: true });

      this.setStatus('connected');
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('[Supabase] fetchTags failed:', err);
      this.setStatus('error');
      return null;
    }
  },

  async upsertTag(tag) {
    if (!this.isConfigured || !this.client) return;
    try {
      this.setStatus('syncing');
      const { error } = await this.client
        .from('planner_tags')
        .upsert({ id: tag.id, name: tag.name, color: tag.color });
      this.setStatus('connected');
      if (error) console.error('[Supabase] upsertTag error:', error);
    } catch (e) {
      this.setStatus('error');
    }
  },

  async deleteTag(tagId) {
    if (!this.isConfigured || !this.client) return;
    try {
      this.setStatus('syncing');
      const { error } = await this.client
        .from('planner_tags')
        .delete()
        .eq('id', tagId);
      this.setStatus('connected');
      if (error) console.error('[Supabase] deleteTag error:', error);
    } catch (e) {
      this.setStatus('error');
    }
  },

  // 2. Tasks Bank Operations
  async fetchTasks() {
    if (!this.isConfigured || !this.client) return null;
    try {
      this.setStatus('syncing');
      const { data, error } = await this.client
        .from('planner_tasks')
        .select('*')
        .order('created_at', { ascending: true });
      this.setStatus('connected');
      if (error) throw error;
      return data ? data.map(d => ({
        id: d.id,
        tagId: d.tag_id,
        title: d.title,
        completed: !!d.completed,
        completedAt: d.completed_at || null
      })) : null;
    } catch (err) {
      console.warn('[Supabase] fetchTasks failed:', err);
      this.setStatus('error');
      return null;
    }
  },

  async upsertTask(task) {
    if (!this.isConfigured || !this.client) return;
    try {
      this.setStatus('syncing');
      const row = {
        id: task.id,
        tag_id: task.tagId || 'misc',
        title: task.title,
        completed: !!task.completed,
        completed_at: task.completedAt || null
      };
      let { error } = await this.client
        .from('planner_tasks')
        .upsert(row);

      // Handle foreign key constraint if tag is not yet in cloud planner_tags
      if (error && error.message && error.message.includes('planner_tasks_tag_id_fkey')) {
        if (typeof getTagById === 'function') {
          const localTag = getTagById(task.tagId);
          if (localTag && localTag.id) {
            await this.upsertTag(localTag);
            const retryRes = await this.client.from('planner_tasks').upsert(row);
            error = retryRes.error;
          }
        }
        // If still error, retry without foreign key tag_id
        if (error) {
          const fallbackRow = { ...row, tag_id: null };
          const fallbackRes = await this.client.from('planner_tasks').upsert(fallbackRow);
          error = fallbackRes.error;
        }
      }

      this.setStatus('connected');
      if (error) {
        // Fallback for older schema without completed column
        if (error.message && error.message.includes('column "completed"')) {
          await this.client.from('planner_tasks').upsert({ id: task.id, tag_id: task.tagId || null, title: task.title });
        } else {
          console.error('[Supabase] upsertTask error:', error);
        }
      }
    } catch (e) {
      this.setStatus('error');
    }
  },

  async deleteTask(taskId) {
    if (!this.isConfigured || !this.client) return;
    try {
      this.setStatus('syncing');
      const { error } = await this.client
        .from('planner_tasks')
        .delete()
        .eq('id', taskId);
      this.setStatus('connected');
      if (error) console.error('[Supabase] deleteTask error:', error);
    } catch (e) {
      this.setStatus('error');
    }
  },

  // 2.5 Routine Templates Operations
  async fetchTemplates() {
    if (!this.isConfigured || !this.client) return null;
    try {
      this.setStatus('syncing');
      let templates = null;

      // Primary strategy: planner_templates table
      try {
        const { data, error } = await this.client
          .from('planner_templates')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          templates = data.map(row => ({
            id: row.id,
            name: row.name,
            createdAt: row.created_at,
            totalBlocks: row.total_blocks || 0,
            tagIds: Array.isArray(row.tag_ids) ? row.tag_ids : [],
            blocksData: (row.blocks_data && typeof row.blocks_data === 'object') ? row.blocks_data : {}
          }));
        }
      } catch (tableErr) {}

      // Fallback strategy: check planner_settings sentinel key __templates__
      if (templates === null) {
        try {
          const { data, error } = await this.client
            .from('planner_settings')
            .select('value')
            .eq('key', '__templates__')
            .maybeSingle();

          if (!error && data && Array.isArray(data.value)) {
            templates = data.value;
          }
        } catch (fbErr) {}
      }

      this.setStatus('connected');
      return templates;
    } catch (err) {
      console.warn('[Supabase] fetchTemplates failed:', err);
      this.setStatus('error');
      return null;
    }
  },

  async upsertTemplate(template) {
    if (!this.isConfigured || !this.client || !template) return;
    try {
      this.setStatus('syncing');

      // Primary: upsert to planner_templates table
      try {
        await this.client
          .from('planner_templates')
          .upsert({
            id: template.id,
            name: template.name,
            created_at: template.createdAt || new Date().toISOString(),
            total_blocks: template.totalBlocks || 0,
            tag_ids: template.tagIds || [],
            blocks_data: template.blocksData || {},
            updated_at: new Date().toISOString()
          });
      } catch (err) {}

      // Fallback: sync all templates array into planner_settings under __templates__ key
      if (typeof weeklyTemplates !== 'undefined' && Array.isArray(weeklyTemplates)) {
        try {
          await this.client
            .from('planner_settings')
            .upsert({
              key: '__templates__',
              value: weeklyTemplates,
              updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
        } catch (fbErr) {}
      }

      this.setStatus('connected');
    } catch (e) {
      console.error('[Supabase] upsertTemplate error:', e);
      this.setStatus('error');
    }
  },

  async deleteTemplate(templateId) {
    if (!this.isConfigured || !this.client || !templateId) return;
    try {
      this.setStatus('syncing');

      // Primary: delete from planner_templates table
      try {
        await this.client
          .from('planner_templates')
          .delete()
          .eq('id', templateId);
      } catch (err) {}

      // Fallback: update __templates__ key in planner_settings
      if (typeof weeklyTemplates !== 'undefined' && Array.isArray(weeklyTemplates)) {
        try {
          await this.client
            .from('planner_settings')
            .upsert({
              key: '__templates__',
              value: weeklyTemplates,
              updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
        } catch (fbErr) {}
      }

      this.setStatus('connected');
    } catch (e) {
      console.error('[Supabase] deleteTemplate error:', e);
      this.setStatus('error');
    }
  },

  // 3. Planner Blocks Operations
  async fetchAllBlocks() {
    if (!this.isConfigured || !this.client) return null;
    try {
      this.setStatus('syncing');
      const { data, error } = await this.client
        .from('planner_blocks')
        .select('*');
      this.setStatus('connected');
      if (error) throw error;

      // Reconstruct weeksData tree structure
      const weeksData = {};
      if (data) {
        data.forEach(row => {
          // Ignore sentinel internal config rows
          if (!row.week_key || row.week_key.startsWith('__')) return;
          if (!weeksData[row.week_key]) weeksData[row.week_key] = {};
          if (!weeksData[row.week_key][row.day_id]) weeksData[row.week_key][row.day_id] = {};
          weeksData[row.week_key][row.day_id][row.block_index] = {
            title: row.title || '',
            status: row.status || 'pending',
            tagId: row.tag_id || 'misc',
            notes: row.notes || '',
            blockTasks: row.block_tasks || {}
          };
        });
      }
      return weeksData;
    } catch (err) {
      console.warn('[Supabase] fetchAllBlocks failed:', err);
      this.setStatus('error');
      return null;
    }
  },

  async upsertBlock(weekKey, dayId, blockIndex, blockData) {
    if (!this.isConfigured || !this.client) return;
    try {
      this.setStatus('syncing');
      const { error } = await this.client
        .from('planner_blocks')
        .upsert({
          week_key: weekKey,
          day_id: dayId,
          block_index: blockIndex,
          title: blockData.title || '',
          status: blockData.status || 'pending',
          tag_id: blockData.tagId || 'misc',
          notes: blockData.notes || '',
          block_tasks: blockData.blockTasks || {},
          updated_at: new Date().toISOString()
        });
      this.setStatus('connected');
      if (error) console.error('[Supabase] upsertBlock error:', error);
    } catch (e) {
      this.setStatus('error');
    }
  },

  async batchUpsertBlocks(blocksList) {
    if (!this.isConfigured || !this.client || !Array.isArray(blocksList) || blocksList.length === 0) return;
    try {
      this.setStatus('syncing');
      const rows = blocksList.map(item => ({
        week_key: item.weekKey,
        day_id: item.dayId,
        block_index: item.blockIndex,
        title: item.blockData.title || '',
        status: item.blockData.status || 'pending',
        tag_id: item.blockData.tagId || 'misc',
        notes: item.blockData.notes || '',
        block_tasks: item.blockData.blockTasks || {},
        updated_at: new Date().toISOString()
      }));

      const chunkSize = 100;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await this.client.from('planner_blocks').upsert(chunk);
        if (error) console.error('[Supabase] batchUpsertBlocks error:', error);
      }
      this.setStatus('connected');
    } catch (e) {
      console.error('[Supabase] batchUpsertBlocks failed:', e);
      this.setStatus('error');
    }
  },

  async deleteDayBlocks(weekKey, dayId) {
    if (!this.isConfigured || !this.client) return;
    try {
      this.setStatus('syncing');
      const { error } = await this.client
        .from('planner_blocks')
        .delete()
        .match({ week_key: weekKey, day_id: dayId });
      this.setStatus('connected');
      if (error) console.error('[Supabase] deleteDayBlocks error:', error);
    } catch (e) {
      this.setStatus('error');
    }
  },

  async deleteWeekBlocks(weekKey) {
    if (!this.isConfigured || !this.client) return;
    try {
      this.setStatus('syncing');
      const { error } = await this.client
        .from('planner_blocks')
        .delete()
        .eq('week_key', weekKey);
      this.setStatus('connected');
      if (error) console.error('[Supabase] deleteWeekBlocks error:', error);
    } catch (e) {
      this.setStatus('error');
    }
  },

  // 4. Settings Operations (with planner_settings table & planner_blocks fallback)
  async fetchSettings() {
    if (!this.isConfigured || !this.client) return null;
    try {
      this.setStatus('syncing');
      let settingsMap = {};
      let foundSettings = false;

      // Primary strategy: planner_settings table
      try {
        const { data, error } = await this.client
          .from('planner_settings')
          .select('*');

        if (!error && Array.isArray(data) && data.length > 0) {
          data.forEach(row => {
            settingsMap[row.key] = row.value;
          });
          foundSettings = true;
        }
      } catch (tableErr) {
        // Table might not exist yet; will check fallback
      }

      // Fallback strategy: sentinel config row in planner_blocks table
      if (!foundSettings || Object.keys(settingsMap).length === 0) {
        try {
          const { data, error } = await this.client
            .from('planner_blocks')
            .select('*')
            .match({ week_key: '__config__', day_id: '__settings__', block_index: 0 })
            .maybeSingle();

          if (!error && data && data.block_tasks && typeof data.block_tasks === 'object') {
            settingsMap = { ...data.block_tasks };
            foundSettings = true;
          }
        } catch (fallbackErr) {
          // Fallback query error
        }
      }

      this.setStatus('connected');
      return settingsMap;
    } catch (err) {
      console.warn('[Supabase] fetchSettings failed:', err);
      this.setStatus('error');
      return null;
    }
  },

  async upsertSettings(settingsMap) {
    if (!this.isConfigured || !this.client || !settingsMap || typeof settingsMap !== 'object') return false;
    try {
      this.setStatus('syncing');
      const keys = Object.keys(settingsMap);
      if (keys.length === 0) {
        this.setStatus('connected');
        return true;
      }

      const rows = keys.map(k => ({
        key: k,
        value: settingsMap[k],
        updated_at: new Date().toISOString()
      }));

      // 1. Upsert into planner_settings table with explicit onConflict
      try {
        await this.client
          .from('planner_settings')
          .upsert(rows, { onConflict: 'key' });
      } catch (err) {
        console.warn('[Supabase] planner_settings table upsert error:', err);
      }

      // 2. Persist into planner_blocks sentinel configuration row for seamless fallback
      try {
        let existingConfig = {};
        const { data: existingRow } = await this.client
          .from('planner_blocks')
          .select('block_tasks')
          .match({ week_key: '__config__', day_id: '__settings__', block_index: 0 })
          .maybeSingle();

        if (existingRow && existingRow.block_tasks && typeof existingRow.block_tasks === 'object') {
          existingConfig = existingRow.block_tasks;
        }

        const mergedConfig = { ...existingConfig, ...settingsMap };

        await this.client
          .from('planner_blocks')
          .upsert({
            week_key: '__config__',
            day_id: '__settings__',
            block_index: 0,
            title: '__app_settings__',
            status: 'completed',
            tag_id: 'misc',
            notes: 'App Settings Sync Fallback',
            block_tasks: mergedConfig,
            updated_at: new Date().toISOString()
          });
      } catch (fallbackErr) {
        console.warn('[Supabase] Sentinel fallback save error:', fallbackErr);
      }

      this.setStatus('connected');
      return true;
    } catch (e) {
      console.error('[Supabase] upsertSettings error:', e);
      this.setStatus('error');
      return false;
    }
  },

  async upsertSetting(key, value) {
    return this.upsertSettings({ [key]: value });
  },

  // 5. Batch Upload Local Data into Supabase
  async migrateLocalDataToCloud(payload) {
    if (!this.isConfigured || !this.client) {
      throw new Error('Supabase client is not configured.');
    }
    this.setStatus('syncing');

    // 1. Tags
    if (Array.isArray(payload.customTags) && payload.customTags.length > 0) {
      const tagRows = payload.customTags.map(t => ({ id: t.id, name: t.name, color: t.color }));
      const { error: tagErr } = await this.client.from('planner_tags').upsert(tagRows);
      if (tagErr) console.error('Migrate tags error:', tagErr);
    }

    // 2. Tasks
    if (Array.isArray(payload.sharedTasksBank) && payload.sharedTasksBank.length > 0) {
      const taskRows = payload.sharedTasksBank.map(t => ({
        id: t.id,
        tag_id: t.tagId,
        title: t.title,
        completed: !!t.completed,
        completed_at: t.completedAt || null
      }));
      const { error: taskErr } = await this.client.from('planner_tasks').upsert(taskRows);
      if (taskErr) {
        // Fallback if column not present
        const simpleRows = payload.sharedTasksBank.map(t => ({ id: t.id, tag_id: t.tagId, title: t.title }));
        await this.client.from('planner_tasks').upsert(simpleRows);
      }
    }

    // 3. Settings (workBlockMins & breakBlockMins)
    if (typeof AppSettings !== 'undefined') {
      const workMins = AppSettings.get('workBlockMins');
      const breakMins = AppSettings.get('breakBlockMins');
      const settingsMap = {};
      if (workMins !== undefined) settingsMap.workBlockMins = workMins;
      if (breakMins !== undefined) settingsMap.breakBlockMins = breakMins;
      if (Object.keys(settingsMap).length > 0) {
        await this.upsertSettings(settingsMap);
      }
    }

    // 4. Blocks
    if (payload.weeksData && typeof payload.weeksData === 'object') {
      const blockRows = [];
      Object.keys(payload.weeksData).forEach(wKey => {
        const week = payload.weeksData[wKey];
        Object.keys(week).forEach(dId => {
          const day = week[dId];
          Object.keys(day).forEach(bIdx => {
            const block = day[bIdx];
            if (block) {
              blockRows.push({
                week_key: wKey,
                day_id: dId,
                block_index: parseInt(bIdx, 10),
                title: block.title || '',
                status: block.status || 'pending',
                tag_id: block.tagId || 'misc',
                notes: block.notes || '',
                block_tasks: block.blockTasks || {},
                updated_at: new Date().toISOString()
              });
            }
          });
        });
      });

      if (blockRows.length > 0) {
        // Chunk inserts to prevent payload limits
        const chunkSize = 100;
        for (let i = 0; i < blockRows.length; i += chunkSize) {
          const chunk = blockRows.slice(i, i + chunkSize);
          const { error: bErr } = await this.client.from('planner_blocks').upsert(chunk);
          if (bErr) console.error('Migrate blocks chunk error:', bErr);
        }
      }
    }

    this.setStatus('connected');
    return true;
  },

  // 6. Realtime Subscription for Instant Multi-Device Sync
  initRealtime() {
    if (!this.isConfigured || !this.client || typeof this.client.channel !== 'function') return;

    try {
      if (this.realtimeChannel) {
        this.client.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
      }

      this.realtimeChannel = this.client
        .channel('planner_realtime_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'planner_blocks' }, () => {
          this.handleRemoteChange('blocks');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'planner_tags' }, () => {
          this.handleRemoteChange('tags');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'planner_tasks' }, () => {
          this.handleRemoteChange('tasks');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'planner_templates' }, () => {
          this.handleRemoteChange('templates');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'planner_settings' }, () => {
          this.handleRemoteChange('settings');
        })
        .subscribe();
    } catch (err) {
      console.warn('[Supabase] Realtime subscription init error:', err);
    }
  },

  _remoteDebounceTimer: null,
  handleRemoteChange(type) {
    if (this._remoteDebounceTimer) clearTimeout(this._remoteDebounceTimer);
    this._remoteDebounceTimer = setTimeout(() => {
      if (typeof syncFromSupabase === 'function') {
        syncFromSupabase();
      }
    }, 400);
  }
};

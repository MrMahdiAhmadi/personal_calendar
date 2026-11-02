/* =====================================================================
   Supabase Client & Cloud Synchronization Module
   ===================================================================== */

const SupabaseSync = {
  client: null,
  isConfigured: false,
  status: 'offline', // 'connected' | 'syncing' | 'offline' | 'error'
  statusListeners: [],

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
      return data ? data.map(d => ({ id: d.id, tagId: d.tag_id, title: d.title })) : null;
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
      const { error } = await this.client
        .from('planner_tasks')
        .upsert({ id: task.id, tag_id: task.tagId, title: task.title });
      this.setStatus('connected');
      if (error) console.error('[Supabase] upsertTask error:', error);
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

  // 4. Batch Upload Local Data into Supabase
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
      const taskRows = payload.sharedTasksBank.map(t => ({ id: t.id, tag_id: t.tagId, title: t.title }));
      const { error: taskErr } = await this.client.from('planner_tasks').upsert(taskRows);
      if (taskErr) console.error('Migrate tasks error:', taskErr);
    }

    // 3. Blocks
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
  }
};

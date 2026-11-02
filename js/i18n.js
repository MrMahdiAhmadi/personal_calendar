/* =====================================================================
   Internationalization (i18n) Module: English & Persian Support
   ===================================================================== */

const I18N = {
  LANG_KEY: 'tb_lang_preference',
  currentLang: 'en', // 'en' | 'fa'

  translations: {
    en: {
      app_title: "24-Hour Time Blocking Planner",
      app_subtitle: "Weekly ultradian cycle planner (90m work / 30m break) with shared task bank",
      tz_badge: "Iran Timezone (Asia/Tehran)",
      live_time_fetching: "Fetching Iran time...",
      cloud_local: "Local Storage",
      cloud_connected: "Cloud (Connected)",
      cloud_syncing: "Syncing...",
      cloud_settings_title: "Supabase Cloud Database Settings",
      offline_badge: "Offline Mode",
      offline_tooltip: "No internet connection. Working fully offline from local cache.",
      tasks_hub_btn: "Task Bank",
      hide_breaks_btn: "Hide Breaks",
      show_breaks_btn: "Show Breaks",
      tags_btn: "Tags",
      backup_btn: "Backup & Restore",
      jump_active_btn: "Jump to Active Block",
      reset_btn: "Reset Data",
      theme_btn: "Toggle Theme",
      lang_switch_btn: "فارسی",
      settings_btn: "Settings",

      // Settings Modal
      settings_title: "Settings",
      settings_language: "Language",
      settings_calendar: "Calendar Type",
      settings_calendar_gregorian: "Gregorian",
      settings_calendar_persian: "Shamsi (Persian)",
      settings_timezone: "Timezone",
      settings_tz_system: "Use system timezone",
      settings_tz_custom: "Custom timezone",
      settings_tz_placeholder: "e.g. Asia/Tehran, America/New_York",
      settings_tz_invalid: "Invalid timezone identifier",
      settings_save: "Apply Settings",

      // Week Controls
      prev_week: "Previous Week",
      next_week: "Next Week",
      current_week: "Current Week",
      this_week_btn: "This Week",
      weeks_later: "weeks later",
      weeks_ago: "weeks ago",

      // View Modes
      view_weekly_matrix: "Weekly Matrix",
      view_daily_vertical: "Daily (Vertical)",
      view_daily_horizontal: "Daily (Horizontal)",

      // Active Banner
      active_block_label: "Active Block (Iran Time)",
      calculating_time: "Calculating time...",
      completed_today: "Today:",
      completed_week: "This Week:",
      cycle_work: "Cycle {cycle}: Deep Work (90m)",
      cycle_break: "Cycle {cycle}: Rest & Recharge (30m)",
      work_tag_suffix: "90m Work",
      break_tag_suffix: "30m Break",
      night_cycle_end: "End of night cycle",
      today_pill: "Today",
      time_col_header: "Time & Block",
      mins_short: "m",
      tasks_short: "tasks",

      // Status
      status_pending: "Planned",
      status_inprogress: "In Progress",
      status_completed: "Completed",
      status_skipped: "Skipped",
      quick_done: "Mark Done",
      quick_completed: "Done",

      // Block Modal
      modal_title_label: "Block Title / Focus Goal",
      modal_title_placeholder: "e.g., Feature development, reading sprint...",
      modal_tag_label: "Category Tag",
      modal_tag_config: "Configure Tags",
      modal_status_label: "Status",
      modal_opt_pending: "Planned ⚪",
      modal_opt_inprogress: "In Progress ⏳",
      modal_opt_completed: "Completed ✅",
      modal_opt_skipped: "Skipped ⛔",
      modal_shared_tasks_label: "Shared Tasks for this Tag",
      modal_shared_tasks_sub: "Check the tasks you want to tackle in this block",
      modal_manage_bank: "Manage Task Bank",
      modal_quick_task_ph: "Add new task for this tag...",
      modal_add_btn: "Add",
      modal_no_tasks_for_tag: "No tasks defined for this tag yet. Use the field above to add one!",
      modal_notes_label: "Notes & Output",
      modal_notes_placeholder: "Log key outcomes, links, or takeaways...",
      modal_cancel: "Cancel",
      modal_save: "Save Changes",
      modal_block_work_desc: "Cycle {cycle}: Deep Work Block (90 Minutes)",
      modal_block_break_desc: "Cycle {cycle}: Rest & Recharge Block (30 Minutes)",

      // Pomodoro Timer
      pomodoro_section_title: "Pomodoro Timer",
      pomodoro_focus: "Focus",
      pomodoro_short_break: "Short Break",
      pomodoro_long_break: "Long Break",
      pomodoro_start: "Start",
      pomodoro_pause: "Pause",
      pomodoro_resume: "Resume",
      pomodoro_reset: "Reset",
      pomodoro_session_done: "Focus session complete! Take a break 🎉",
      pomodoro_break_done: "Break over! Ready to focus? 💪",
      pomodoro_stats_label: "Focus in this block:",

      // Tasks Hub Modal
      hub_modal_title: "Shared Task Bank by Category",
      hub_modal_sub: "Tasks assigned to each category are accessible across all matching blocks",
      hub_all_tags: "All Categories",
      hub_new_task_ph: "New task title for this category...",
      hub_add_task_btn: "Add Task",
      hub_summary_text: "Filtered Tasks",
      hub_empty_msg: "No tasks registered in this category yet. Add one using the form above.",
      hub_done_btn: "Done",

      // Tags Modal
      tags_modal_title: "Manage Custom Tags",
      tags_new_label: "Create New Tag:",
      tags_name_ph: "Tag name (e.g., Reading, Fitness, Project)",
      tags_save_btn: "Save",
      tags_existing_label: "Existing Tags:",
      tags_general_pill: "General",
      tags_done_btn: "Done",

      // Supabase Modal
      sb_modal_title: "Supabase Cloud Database",
      sb_modal_sub: "Store and sync your schedule in real-time across all your devices",
      sb_status_connected: "Connected & synced with Supabase cloud database",
      sb_status_syncing: "Syncing with cloud database...",
      sb_status_offline: "Offline / Waiting for Supabase Anon Key",
      sb_url_label: "Project Server URL (Project URL)",
      sb_key_label: "Project Public Key (Anon / Publishable Key)",
      sb_key_hint: "Found in your Supabase dashboard under Settings > API.",
      sb_migrate_card_title: "Migrate all current local data to Supabase",
      sb_migrate_card_sub: "Upload all your tags, tasks, and scheduled blocks to the cloud database in one click.",
      sb_migrate_btn: "Upload to Cloud",
      sb_close_btn: "Close",
      sb_save_btn: "Save & Connect",

      // Backup & Menu
      backup_export_json: "Download Backup (JSON)",
      backup_copy_json: "Copy Data to Clipboard",
      backup_import_json: "Upload Backup File (JSON)",
      backup_paste_json: "Paste Backup Text",
      reset_day_btn: "Clear Day's Schedule",
      reset_week_btn: "Clear Week's Schedule",
      paste_modal_title: "Paste Backup (JSON)",
      paste_modal_sub: "Paste your exported JSON payload below to instantly restore all schedules and tasks:",
      paste_apply_btn: "Apply Data",

      // Confirmation Dialog
      confirm_dialog_title: "Confirm Action",
      confirm_dialog_msg: "Are you sure you want to proceed?",
      confirm_accept: "Confirm",
      confirm_cancel: "Cancel",
      confirm_reset_day_title: "Clear {day} Schedule",
      confirm_reset_day_msg: "Are you sure you want to reset all 24 time blocks for {day} to default?",
      confirm_reset_week_title: "Clear Full Week Schedule",
      confirm_reset_week_msg: "Notice: All blocks, tasks, and notes for all 7 days in this week will be reset. Proceed?",

      // Toasts
      toast_block_saved: "Block changes saved.",
      toast_tag_added: "Tag '{name}' added.",
      toast_tag_deleted: "Tag deleted.",
      toast_task_added: "Task added to bank.",
      toast_task_deleted: "Task deleted.",
      toast_block_completed: "Block completed ✅",
      toast_block_reset: "Block reset.",
      toast_day_cleared: "Day's schedule cleared.",
      toast_week_cleared: "Week's schedule cleared.",
      toast_backup_downloaded: "Backup file downloaded.",
      toast_backup_copied: "Backup copied to clipboard.",
      toast_backup_restored: "Data restored successfully.",
      toast_cloud_synced: "Data synced with Supabase ☁️",
      toast_cloud_uploading: "Uploading local data to Supabase...",
      toast_cloud_upload_done: "All data successfully uploaded to Supabase! 🚀",
      toast_cloud_saved: "Settings saved. Connecting...",
      toast_cloud_offline: "Settings saved (offline mode)."
    },

    fa: {
      app_title: "پلنر هفتگی بلاک‌بندی ۲۴ ساعته",
      app_subtitle: "برنامه‌ریزی شنبه تا جمعه با بانک تسک مشترک بر اساس هر تگ",
      tz_badge: "تایم‌زون ایران (Asia/Tehran)",
      live_time_fetching: "در حال دریافت زمان ایران...",
      cloud_local: "محلی (لوکال)",
      cloud_connected: "ابری (متصل)",
      cloud_syncing: "همگام‌سازی...",
      cloud_settings_title: "تنظیمات پایگاه داده ابری سوپابیس",
      offline_badge: "حالت آفلاین",
      offline_tooltip: "عدم اتصال به اینترنت. برنامه به صورت کاملاً آفلاین اجرا می‌شود.",
      tasks_hub_btn: "بانک تسک‌ها",
      hide_breaks_btn: "مخفی‌سازی استراحت‌ها",
      show_breaks_btn: "نمایش مجدد استراحت‌ها",
      tags_btn: "برچسب‌ها",
      backup_btn: "پشتیبان‌گیری و انتقال داده",
      jump_active_btn: "پرش به بلاک فعال در ایران",
      reset_btn: "حذف و پاکسازی دیتا",
      theme_btn: "تغییر تم رنگی",
      lang_switch_btn: "English",
      settings_btn: "تنظیمات",

      // Settings Modal
      settings_title: "تنظیمات",
      settings_language: "زبان",
      settings_calendar: "نوع تقویم",
      settings_calendar_gregorian: "میلادی",
      settings_calendar_persian: "شمسی",
      settings_timezone: "منطقه زمانی",
      settings_tz_system: "استفاده از تایم‌زون سیستم",
      settings_tz_custom: "تایم‌زون دلخواه",
      settings_tz_placeholder: "مثلاً Asia/Tehran یا America/New_York",
      settings_tz_invalid: "تایم‌زون نامعتبر",
      settings_save: "اعمال تنظیمات",

      // Week Controls
      prev_week: "هفته قبل",
      next_week: "هفته بعد",
      current_week: "هفته جاری",
      this_week_btn: "پرش به هفته جاری",
      weeks_later: "هفته بعد",
      weeks_ago: "هفته قبل",

      // View Modes
      view_weekly_matrix: "ماتریس هفتگی",
      view_daily_vertical: "روزانه (عمودی)",
      view_daily_horizontal: "روزانه (افقی)",

      // Active Banner
      active_block_label: "بلاک فعال بر اساس ساعت ایران",
      calculating_time: "در حال محاسبه زمان...",
      completed_today: "تکمیل شده امروز:",
      completed_week: "کل هفته:",
      cycle_work: "سیکل {cycle}: کار متمرکز",
      cycle_break: "سیکل {cycle}: استراحت و تنفس",
      work_tag_suffix: "کار ۹۰ دقیقه",
      break_tag_suffix: "استراحت ۳۰ دقیقه",
      night_cycle_end: "پایان چرخه شبانه",
      today_pill: "امروز",
      time_col_header: "ساعت و بلاک",
      mins_short: "د",
      tasks_short: "تسک",

      // Status
      status_pending: "برنامه‌ریزی",
      status_inprogress: "درحال انجام",
      status_completed: "تکمیل",
      status_skipped: "رد شده",
      quick_done: "ثبت انجام",
      quick_completed: "انجام شد",

      // Block Modal
      modal_title_label: "عنوان / هدف اصلی بلاک",
      modal_title_placeholder: "مثال: پیگیری تسک‌های پروژه، ماژول فروش...",
      modal_tag_label: "برچسب حوزه (تگ)",
      modal_tag_config: "تنظیم تگ‌ها",
      modal_status_label: "وضعیت بلاک",
      modal_opt_pending: "برنامه‌ریزی شده ⚪",
      modal_opt_inprogress: "در حال انجام ⏳",
      modal_opt_completed: "تکمیل شده ✅",
      modal_opt_skipped: "صرف‌نظر شده ⛔",
      modal_shared_tasks_label: "تسک‌های مشترک این تگ",
      modal_shared_tasks_sub: "تسک‌هایی که می‌خواهید در این بلاک انجام شوند را تیک بزنید",
      modal_manage_bank: "مدیریت بانک تسک‌ها",
      modal_quick_task_ph: "تعریف تسک جدید برای این تگ...",
      modal_add_btn: "افزودن",
      modal_no_tasks_for_tag: "تسکی برای این تگ تعریف نشده است. می‌توانید با فیلد بالا یکی بسازید!",
      modal_notes_label: "یادداشت و خروجی این بازه",
      modal_notes_placeholder: "ثبت دستاوردها، لینک‌ها، یا نکات مهم این بلاک...",
      modal_cancel: "انصراف",
      modal_save: "ذخیره تغییرات",
      modal_block_work_desc: "سیکل {cycle}: بلوک تمرکز و کار عمیق (۹۰ دقیقه)",
      modal_block_break_desc: "سیکل {cycle}: بلوک استراحت و تنفس (۳۰ دقیقه)",

      // Pomodoro Timer
      pomodoro_section_title: "تایمر پومودورو",
      pomodoro_focus: "تمرکز",
      pomodoro_short_break: "استراحت کوتاه",
      pomodoro_long_break: "استراحت طولانی",
      pomodoro_start: "شروع",
      pomodoro_pause: "توقف",
      pomodoro_resume: "ادامه",
      pomodoro_reset: "ریست",
      pomodoro_session_done: "جلسه تمرکز تموم شد! بریم استراحت 🎉",
      pomodoro_break_done: "استراحت تموم شد! آماده‌ای؟ 💪",
      pomodoro_stats_label: "تمرکز در این بلاک:",

      // Tasks Hub Modal
      hub_modal_title: "بانک تسک‌های مشترک حوزه‌ها",
      hub_modal_sub: "تسک‌های هر حوزه در تمام بلاک‌های دارای آن تگ در دسترس خواهند بود",
      hub_all_tags: "همه حوزه‌ها",
      hub_new_task_ph: "عنوان تسک جدید برای این حوزه...",
      hub_add_task_btn: "افزودن تسک",
      hub_summary_text: "نمایش تسک‌های فیلترشده",
      hub_empty_msg: "تسکی در این حوزه ثبت نشده است. از فرم بالا تسک جدید اضافه کنید.",
      hub_done_btn: "تأیید و بستن",

      // Tags Modal
      tags_modal_title: "مدیریت برچسب‌های رنگی",
      tags_new_label: "تعریف برچسب جدید:",
      tags_name_ph: "عنوان برچسب (مثلا: پادکست، ورزش)",
      tags_save_btn: "ثبت",
      tags_existing_label: "برچسب‌های موجود:",
      tags_general_pill: "عمومی",
      tags_done_btn: "تأیید و بستن",

      // Supabase Modal
      sb_modal_title: "پایگاه داده ابری Supabase",
      sb_modal_sub: "ذخیره‌سازی و همگام‌سازی لحظه‌ای برنامه‌ها و تسک‌ها در فضای ابری",
      sb_status_connected: "متصل و همگام با دیتابیس سوپابیس",
      sb_status_syncing: "در حال همگام‌سازی...",
      sb_status_offline: "آفلاین / در انتظار تنظیم کلید Anon Key",
      sb_url_label: "آدرس سرور پروژه (Project URL)",
      sb_key_label: "کلید عمومی پروژه (Anon / Publishable Key)",
      sb_key_hint: "این کلید در داشبورد Supabase بخش Settings > API قابل مشاهده است.",
      sb_migrate_card_title: "انتقال تمام داده‌های محلی فعلی به سوپابیس",
      sb_migrate_card_sub: "تمام تگ‌ها، تسک‌ها و بلاک‌های ذخیره‌شده را یکجا به ابر منتقل کنید.",
      sb_migrate_btn: "انتقال به ابر",
      sb_close_btn: "بستن",
      sb_save_btn: "ذخیره و اتصال",

      // Backup & Menu
      backup_export_json: "دانلود فایل پشتیبان (JSON)",
      backup_copy_json: "کپی داده‌ها در کلیپ‌بورد",
      backup_import_json: "بارگذاری فایل پشتیبان (JSON)",
      backup_paste_json: "وارد کردن متن پشتیبان",
      reset_day_btn: "حذف برنامه این روز",
      reset_week_btn: "حذف برنامه کل هفته",
      paste_modal_title: "وارد کردن متن پشتیبان (JSON)",
      paste_modal_sub: "متن خروجی ذخیره‌شده را در کادر زیر قرار دهید تا اطلاعات و تسک‌ها فوراً بازیابی شوند:",
      paste_apply_btn: "اعمال اطلاعات",

      // Confirmation Dialog
      confirm_dialog_title: "تأیید عملیات",
      confirm_dialog_msg: "آیا از انجام این عملیات اطمینان دارید؟",
      confirm_accept: "تأیید",
      confirm_cancel: "انصراف",
      confirm_reset_day_title: "حذف برنامه {day}",
      confirm_reset_day_msg: "آیا مطمئن هستید که می‌خواهید تمام ۲۴ بلاک زمانی روز «{day}» را به حالت پیش‌فرض و خالی بازنشانی کنید؟",
      confirm_reset_week_title: "حذف کل برنامه هفته",
      confirm_reset_week_msg: "توجه: با این کار تمام تسک‌ها، عناوین و وضعیت‌های هر ۷ روز در این هفته پاک خواهند شد. آیا ادامه می‌دهید؟",

      // Toasts
      toast_block_saved: "اطلاعات بلاک ذخیره شد.",
      toast_tag_added: "برچسب «{name}» افزوده شد.",
      toast_tag_deleted: "برچسب حذف شد.",
      toast_task_added: "تسک جدید به بانک اضافه شد.",
      toast_task_deleted: "تسک حذف شد.",
      toast_block_completed: "بلاک تکمیل شد ✅",
      toast_block_reset: "وضعیت بازنشانی شد.",
      toast_day_cleared: "اطلاعات روز پاکسازی شد.",
      toast_week_cleared: "برنامه کل هفته پاکسازی شد.",
      toast_backup_downloaded: "فایل پشتیبان دانلود شد.",
      toast_backup_copied: "متن پشتیبان در کلیپ‌بورد کپی شد.",
      toast_backup_restored: "اطلاعات با موفقیت بازیابی شد.",
      toast_cloud_synced: "داده‌ها با سوپابیس همگام شدند ☁️",
      toast_cloud_uploading: "در حال انتقال داده‌های محلی به سوپابیس...",
      toast_cloud_upload_done: "تمام اطلاعات با موفقیت به سوپابیس منتقل شدند! 🚀",
      toast_cloud_saved: "تنظیمات ذخیره شد. در حال اتصال...",
      toast_cloud_offline: "تنظیمات ذخیره شد (حالت آفلاین)."
    }
  },

  init() {
    let savedLang = null;
    if (typeof AppSettings !== 'undefined' && AppSettings.get) {
      savedLang = AppSettings.get('language');
    }
    if (!savedLang) {
      savedLang = localStorage.getItem(this.LANG_KEY);
    }
    if (savedLang && (savedLang === 'en' || savedLang === 'fa')) {
      this.currentLang = savedLang;
    } else {
      this.currentLang = 'en';
    }
    if (typeof AppSettings !== 'undefined' && AppSettings.set) {
      AppSettings.set('language', this.currentLang);
    }
    this.applyLanguage(this.currentLang);
  },

  t(key, params = {}) {
    const dict = this.translations[this.currentLang] || this.translations.en;
    let str = dict[key] || this.translations.en[key] || key;
    Object.keys(params).forEach(p => {
      str = str.replace(new RegExp(`\\{${p}\\}`, 'g'), params[p]);
    });
    return str;
  },

  toggleLanguage() {
    // Kept as no-op or fallback
    const nextLang = this.currentLang === 'en' ? 'fa' : 'en';
    this.setLanguage(nextLang);
  },

  setLanguage(lang) {
    this.currentLang = lang;
    if (typeof AppSettings !== 'undefined' && AppSettings.set) {
      AppSettings.set('language', lang);
    }
    localStorage.setItem(this.LANG_KEY, lang);
    this.applyLanguage(lang);

    // Refresh dynamic views
    if (typeof populateTagsDropdowns === 'function') populateTagsDropdowns();
    if (typeof renderCustomTagsList === 'function') renderCustomTagsList();
    if (typeof renderTasksHubFilterTabs === 'function') renderTasksHubFilterTabs();
    if (typeof renderDayTabs === 'function') renderDayTabs();
    if (typeof renderCurrentView === 'function') renderCurrentView();
    if (typeof updateHideBreaksUI === 'function') updateHideBreaksUI();
    if (typeof updateLiveIranTicker === 'function') updateLiveIranTicker();
  },

  applyLanguage(lang) {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = (lang === 'fa') ? 'rtl' : 'ltr';

    // Update static DOM elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });

    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.title = this.t(key);
    });

    // Language switch button label
    const switchBtn = document.getElementById('langSwitchLabel');
    if (switchBtn) {
      switchBtn.textContent = lang === 'en' ? 'فارسی' : 'English';
    }
  }
};

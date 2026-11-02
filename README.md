# 24-Hour Time Blocking Weekly Planner (Iran Timezone) ⏱️
> A modern, responsive, ultradian-rhythm weekly time blocking planner with shared category task banks and optional Supabase cloud synchronization.

[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-2ea44f?style=for-the-badge&logo=github)](https://mrmahdiahmadi.github.io/personal_calendar/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)

[**English**](#english) | [**فارسی (Persian)**](#فارسی-persian)

---

<a name="english"></a>
## 🌐 English

### 🚀 Live Demo
Access the live application directly in your browser without any setup:  
👉 **[https://mrmahdiahmadi.github.io/personal_calendar/](https://mrmahdiahmadi.github.io/personal_calendar/)**

### Overview
This planner is built around **ultradian cycles**: 90 minutes of focused deep work followed by 30 minutes of rest and recovery across a 24-hour daily timeline (12 full cycles per day, Saturday through Friday). It automatically tracks live time in the official Iran timezone (`Asia/Tehran`), calculates current active blocks, and helps balance work sprints with timely breaks.

### Key Features
- **🌐 Bilingual UI:** Instant switching between English (LTR) and Persian (RTL) with localized dates and numbers.
- **🕒 Accurate Iran Time Engine (`Asia/Tehran`):** Live ticker, Persian/Gregorian date display, and pulse indicator highlighting the active 90m work or 30m break block.
- **🔄 3 Flexible Views:**
  - **Weekly Matrix:** High-density 7-day overview with time columns, completion status, and smooth scrolling.
  - **Daily Vertical:** Timeline view detailing goals, tags, notes, and task checklists.
  - **Daily Horizontal:** Clean card grid for quick glance and updates.
- **🏷️ Customizable Category Tags:** Color-coded domains (Work, Study, Health & Fitness, Leisure, General, etc.).
- **📋 Shared Category Task Bank:** Define recurring or backlog tasks under specific tags and assign them as sub-checklists inside individual blocks.
- **💾 Offline-First SafeStorage:** Fast, persistent local storage that operates reliably even without internet or within sandboxed iframes.
- **☁️ Optional Cloud Sync via Supabase:** Connect your own Supabase project in one click. All data syncs in real-time across your desktop, laptop, and phone.
- **🌓 Dark / Light Theme:** Modern Tailwind CSS palette with auto-contrast for comfortable day and night planning.
- **📦 Backup & Data Portability:** Export/import full JSON backups or copy data directly to your clipboard.

### Quick Start (Local)
Just open `index.html` in any web browser, or run a local HTTP server:

```bash
npx serve .
```

### Optional: Setting Up Your Supabase Cloud Database
1. Create a free project at [supabase.com](https://supabase.com).
2. Open your project's **SQL Editor** and execute the script in [supabase/schema.sql](supabase/schema.sql).
3. In the web planner, click the **Cloud icon (☁️)** in the top bar.
4. Enter your **Project URL** and **Anon Key**, then click **Save & Connect**.
5. Click **Upload to Cloud** to migrate your existing local schedules and tasks to your cloud database.

---

<a name="فارسی-persian"></a>
## 🇮🇷 فارسی (Persian)

### 🚀 دموی آنلاین (Live Demo)
می‌توانید برنامه را مستقیماً بدون نیاز به نصب در مرورگر خود اجرا کنید:  
👉 **[https://mrmahdiahmadi.github.io/personal_calendar/](https://mrmahdiahmadi.github.io/personal_calendar/)**

### معرفی
این برنامه بر پایه **سیکل‌های ریتم اولترادیان** (۹۰ دقیقه کار عمیق و متمرکز + ۳۰ دقیقه استراحت و تنفس) برای کل ۲۴ ساعت شبانه‌روز (۱۲ چرخه روزانه) طراحی شده است. برنامه با تایم‌زون رسمی ایران (`Asia/Tehran`) هماهنگ بوده و به صورت خودکار بلاک فعال در هر ساعت از شبانه‌روز را مشخص می‌کند.

### قابلیت‌های اصلی
- **🌐 پشتیبانی دو زبانه (انگلیسی و فارسی):** قابلیت تغییر آنی زبان و چیدمان (RTL و LTR).
- **🕒 موتور زمان زنده ایران:** نمایش دقیق ساعت و تقویم خورشیدی و میلادی با افکت ضربان روی بلاک فعال جاری.
- **🔄 ۳ نمای نمایش متنوع:** ماتریس هفتگی کامل (شنبه تا جمعه)، نمای روزانه عمودی و نمای کارت‌های افقی.
- **🏷️ برچسب‌های رنگی حوزه‌ها:** دسته‌بندی زمان به حوزه‌های مختلف (کار و پروژه، مطالعه و یادگیری، سلامت و ورزش، استراحت، امور عمومی و ...) با قابلیت شخصی‌سازی رنگ‌ها.
- **📋 بانک تسک‌های مشترک:** تعریف تسک برای هر حوزه و انتساب سریع آن به صورت چک‌لیست در بلاک‌های مرتبط.
- **💾 معماری آفلاین-اول (Offline-First):** ذخیره آنی در حافظه مرورگر بدون نیاز اجباری به اینترنت.
- **☁️ اتصال ابری اختیاری به Supabase:** امکان اتصال امن به پروژه اختصاصی دیتابیس سوپابیس جهت همگام‌سازی لحظه‌ای بین لپ‌تاپ و گوشی.
- **🌓 حالت تاریک و روشن (Dark / Light):** استایل زیبا، مدرن و هماهنگ با Tailwind CSS.
- **📦 پشتیبان‌گیری و انتقال داده:** دانلود فایل JSON، کپی در کلیپ‌بورد و بازیابی سریع.

### اجرای محلی
فایل `index.html` را در مرورگر باز کنید یا با دستور زیر اجرا نمایید:

```bash
npx serve .
```

### اتصال به پایگاه داده ابری Supabase (اختیاری)
1. در [supabase.com](https://supabase.com) یک پروژه بسازید.
2. محتوای اسکریپت [supabase/schema.sql](supabase/schema.sql) را در بخش **SQL Editor** پروژه اجرا کنید.
3. در برنامه روی آیکون ابر (☁️) کلیک کرده و **Project URL** و **Anon Key** پروژه را وارد نمایید.
4. دکمه **ذخیره و اتصال** و سپس **انتقال به ابر** را بزنید تا اطلاعات لوکال شما به دیتابیس ابری منتقل شود.

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).

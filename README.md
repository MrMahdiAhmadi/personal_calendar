# 24-Hour Time Blocking Weekly Planner (Iran Timezone) ⏱️
> A modern, responsive, ultradian-rhythm weekly time blocking planner with shared category task banks, integrated Pomodoro timer, PWA offline support, and optional Supabase cloud synchronization.

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
This planner is built around focused work sprints and timely breaks across a 24-hour daily timeline (Saturday through Friday), defaulting to **ultradian cycles** (90 minutes work + 30 minutes rest). It automatically tracks live time in the official Iran timezone (`Asia/Tehran`), highlights active blocks, provides an integrated Pomodoro timer with audio alerts, and operates entirely offline as an installable PWA.

### Key Features
- **🌐 Bilingual UI:** Instant switching between English (LTR) and Persian (RTL) with localized dates and numbers.
- **🕒 Accurate Iran Time Engine (`Asia/Tehran`):** Live ticker, Persian/Gregorian date display, and pulse indicator highlighting the active work or break block.
- **⚙️ Customizable Block Durations:** Adjust work (10–180 min) and break (5–60 min) lengths in Settings with automatic daily cycle calculation.
- **⏱️ Integrated Pomodoro Timer:** Built-in timer inside block modals with customizable work/break durations, progress indicator, and audio chimes.
- **📱 PWA & Offline Support:** Installable as a Progressive Web App (PWA) on desktop and mobile with service worker caching and live offline status indicator.
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
این برنامه برای زمان‌بندی و مدیریت ۲۴ ساعته شبانه‌روز (شنبه تا جمعه) بر پایه چرخه‌های متناوب کار متمرکز و استراحت (به‌صورت پیش‌فرض **ریتم اولترادیان**: ۹۰ دقیقه کار عمیق + ۳۰ دقیقه استراحت) طراحی شده است. برنامه با ساعت رسمی ایران (`Asia/Tehran`) هماهنگ بوده، بلاک فعال جاری را مشخص می‌کند و امکاناتی نظیر تایمر پومودورو، شخصی‌سازی زمان چرخه‌ها و کارکرد آفلاین در قالب PWA را در اختیارتان می‌گذارد.

### قابلیت‌های اصلی
- **🌐 پشتیبانی دو زبانه (انگلیسی و فارسی):** قابلیت تغییر آنی زبان و چیدمان (RTL و LTR) به همراه تقویم شمسی و میلادی.
- **🕒 موتور زمان زنده ایران:** نمایش دقیق ساعت رسمی و افکت ضربان روی بلاک فعال جاری.
- **⚙️ زمان‌بندی قابل شخصی‌سازی:** امکان تنظیم مدت زمان کار (۱۰ تا ۱۸۰ دقیقه) و استراحت (۵ تا ۶۰ دقیقه) در تنظیمات با محاسبه و اعمال خودکار چرخه‌ها.
- **⏱️ تایمر پومودورو یکپارچه:** تایمر تمرکز درون مودال ویرایش هر بلاک با هشدار صوتی و قابلیت تنظیم زمان کار و استراحت.
- **📱 پشتیبانی از PWA و حالت آفلاین:** قابلیت نصب به عنوان اپلیکیشن تحت وب روی موبایل و دسکتاپ، کش کشیدن منابع با Service Worker و نشانگر وضعیت اتصال.
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

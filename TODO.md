# Development To-Do List: Meal Reporting, Automated Email & Breakfast Voucher System

> **Project:** VARDA Loyalty Reward System  
> **Target Modules:** Server (`Node.js`, `Express`, `Mongoose`, `ExcelJS`, `Node-Cron`, `Nodemailer`) & Client (`React`, `Vite`, `Tailwind CSS`)  
> **Status:** Planning & Ready for Implementation

---

## 📌 Executive Summary

This document outlines the step-by-step implementation plan for three major enhancements:
1. **Avail History Summary Report (Excel Export):** Generate a comprehensive multi-sheet Excel report covering counts for Breakfast, Lunch, and Dinner, alongside itemized lists of students who availed vs. unavailed.
2. **Automated 11:00 PM Daily Email:** A scheduled nightly cron job that aggregates the day's meal registration and availment data, builds the summary Excel workbook, and emails it to designated administrators.
3. **Unclaimed Breakfast Voucher System:** An automated voucher issuance mechanism that compensates students who registered for breakfast but missed claiming it, complete with redemption flows for students and cashiers.

---

## 📋 Table of Contents
- [Feature 1: Summary Report Excel Export in Avail History](#feature-1-summary-report-excel-export-in-avail-history)
- [Feature 2: Automated 11:00 PM Summary Email](#feature-2-automated-1100-pm-summary-email)
- [Feature 3: Unclaimed Breakfast Voucher System](#feature-3-unclaimed-breakfast-voucher-system)
- [Database & Data Model Updates](#database--data-model-updates)
- [API Endpoints Overview](#api-endpoints-overview)
- [Frontend UI/UX Enhancements](#frontend-uiux-enhancements)
- [Implementation Milestones & Checklist](#implementation-milestones--checklist)
- [Testing & Quality Assurance](#testing--quality-assurance)

---

## Feature 1: Summary Report Excel Export in Avail History

### Objectives
Provide Cashiers and Admins with a one-click **"Export Summary Report"** button inside the Avail History view. The report contrasts registered meals against actual availments for a selected date or date range.

### Structure of the Excel Workbook
The generated workbook (`.xlsx`) should include the following sheets:

- **Sheet 1: `Meal Summary & Counts`**
  - **Date Range / Report Date** header.
  - **Key Metrics Table:**
    - Total Registered Students.
    - Breakfast: Registered Count, Availed Count, Unavailed Count, Availment Rate (%).
    - Lunch: Registered Count, Availed Count, Unavailed Count, Availment Rate (%).
    - Dinner: Registered Count, Availed Count, Unavailed Count, Availment Rate (%).
    - Overall Totals & Percentages.
  - **Batch Breakdown (Optional/Recommended):** Grouped counts by Lima Batch (`B29`, `B31`, `B32`, `B33`).

- **Sheet 2: `Availed Students`**
  - Columns: `Account ID`, `Batch`, `Student ID`, `Student Name`, `Meal Type`, `Availed Timestamp`, `Processed By`.
  - Color-coded badges or formatted rows sorted by meal type and time.

- **Sheet 3: `Unavailed Students`**
  - Columns: `Account ID`, `Batch`, `Student ID`, `Student Name`, `Registered For (Breakfast/Lunch/Dinner)`, `Registration Date`, `Status`.
  - Highlights students who failed to claim meals they registered for.

### Implementation Tasks
- [x] **Backend - Aggregation Endpoint (`server/controllers/cashierController.js` & `server/utils/summaryReportService.js`):**
  - [x] Add routes `GET /api/cashier/export-summary-report` and `GET /api/cashier/summary-report-data`.
  - [x] Query active `MealRegistration` records within date range (respecting 5 AM Philippine time window).
  - [x] Cross-reference with `AvailHistory` and `User` models to accurately determine availed vs. unavailed students.
  - [x] Build multi-sheet Excel generation logic using `ExcelJS` (Meal Summary, Availed List, Unavailed List with color-coded styles and batch metrics).
  - [x] Stream/download the workbook as `Meal_Summary_Report_YYYY-MM-DD.xlsx`.
- [x] **Frontend - Cashier UI (`client/src/pages/Cashier.jsx`):**
  - [x] Add **"Summary Report"** button alongside existing export buttons in Avail History with purple branding.
  - [x] Hook up loading state (`isExportingSummary`) and disable button during active export.
  - [x] Add notifications / toast feedback on success or failure.

---

## Feature 2: Automated 11:00 PM Summary Email

### Objectives
Automatically generate the daily Summary Report at 11:00 PM (Asia/Manila timezone, UTC+8) and email it directly to designated managers, cashiers, and admins with the `.xlsx` file attached.

### Technical Architecture
- **Scheduler:** Use `node-cron` running on the Express server (`0 23 * * *`).
- **Timezone:** Ensure timezone handling accounts for Philippine Time (`Asia/Manila`, UTC+8).
- **Email Dispatcher:** Extend `server/utils/emailService.js` using `nodemailer`.

### Email Payload Design
- **Subject:** `[Daily Meal Summary] Report for YYYY-MM-DD - Varda Cafeteria`
- **Body HTML:**
  - Responsive summary card displaying:
    - 🥐 Breakfast: `X availed / Y registered (Z unavailed)`
    - 🍱 Lunch: `X availed / Y registered (Z unavailed)`
    - 🍲 Dinner: `X availed / Y registered (Z unavailed)`
    - Total Meals Availed & Availment Efficiency %.
  - Note indicating full details are attached in the attached `.xlsx` spreadsheet.
- **Attachment:**
  - `Daily_Meal_Summary_Report_YYYY-MM-DD.xlsx` generated dynamically in memory buffer.

### Implementation Tasks
- [x] **Environment Configuration (`server/.env`):**
  - [x] Add `SUMMARY_EMAIL_RECIPIENTS` (comma-separated list of admin/manager emails).
  - [x] Ensure `EMAIL_USER` and `EMAIL_PASSWORD` (or app password) are configured.
- [x] **Report Generator Utility (`server/utils/summaryReportService.js` & `server/utils/dailySummaryCron.js`):**
  - [x] Function `getMealSummaryData(date)` to gather records from `User` and `AvailHistory`.
  - [x] Function `buildSummaryExcelWorkbook(data)` + `workbook.xlsx.writeBuffer()` to output a clean `ExcelJS` buffer.
- [x] **Email Dispatch Service (`server/utils/emailService.js`):**
  - [x] Create `sendDailyMealSummaryEmail({ recipients, summaryData, excelBuffer, filename })`.
  - [x] Add HTML email template with meal breakdown and batch breakdown tables.
- [x] **Cron Job Setup (`server/utils/dailySummaryCron.js` & `server/server.js`):**
  - [x] Initialize `node-cron` at `0 23 * * *` with timezone `Asia/Manila`.
  - [x] Include try/catch error handling and logging.
- [x] **Manual Trigger Endpoint for Testing:**
  - [x] Create `POST /api/admin/trigger-summary-email` and `POST /api/cashier/send-summary-report-email` (plus UI button in Cashier Avail History) to test email delivery without waiting for 11:00 PM.

---

## Feature 3: Unclaimed Breakfast Voucher System

### Objectives
Provide compensation or relief when a student is registered for breakfast but does not claim it during breakfast hours. The system converts unclaimed breakfasts into redeemable digital vouchers.

### Policy & Voucher Mechanics
- **Trigger Conditions:**
  - Student had `meals.breakfast === true` in `MealRegistration` for today.
  - `mealsAvailed.breakfast === false` after breakfast cutoff time (e.g., 10:00 AM or end of day).
  - Registration status is `'active'`.
- **Voucher Specs:**
  - Unique QR / redemption code (e.g., `BF-VOUCH-XXXXXX`).
  - Redeemable for: Coffee / Pastry / Snack credit / Cafeteria reward points (configurable).
  - Expiry date: Default 7 days from issuance (or configurable validity window).
- **Redemption Flow:**
  - **Student View:** Displays available vouchers under a "Vouchers" tab on the Student Portal, complete with a scannable QR code and voucher code.
  - **Cashier View:** Cashier scans or inputs the voucher code in the Cashier POS to mark it as `redeemed`.

### Implementation Tasks
- [ ] **Voucher Model (`server/models/Voucher.js`):**
  - [ ] Schema fields:
    - `voucherCode`: Unique string identifier (indexed).
    - `studentIdNumber`: String, references student.
    - `studentName`: String.
    - `accountID`: Number (if applicable).
    - `sourceMealDate`: Date of missed breakfast.
    - `voucherType`: `'unclaimed_breakfast'`.
    - `title`: e.g., `"Unclaimed Breakfast Voucher"`.
    - `description`: e.g., `"Valid for 1 snack/beverage replacement"`.
    - `rewardValue`: Points or item description.
    - `status`: Enum `['available', 'redeemed', 'expired', 'cancelled']`.
    - `issuedAt`: Date (default: `Date.now`).
    - `expiresAt`: Date.
    - `redeemedAt`: Date.
    - `redeemedBy`: Object `{ idNumber, name }`.
- [ ] **Voucher Generation Logic:**
  - [ ] Daily automated check at breakfast cutoff (e.g. 10:30 AM or at 11:00 PM nightly run):
    - Identify active breakfast registrations with `mealsAvailed.breakfast === false`.
    - Prevent duplicate voucher generation for the same student on the same date.
    - Create voucher documents in MongoDB.
  - [ ] (Optional) In-app notification or email notification informing student of the voucher.
- [ ] **Backend Endpoints (`server/routes/studentRoutes.js` & `server/routes/cashierRoutes.js`):**
  - [ ] `GET /api/student/vouchers` - List student's active and past vouchers.
  - [ ] `POST /api/cashier/vouchers/redeem` - Redeem voucher by code (verifies status and expiration).
  - [ ] `GET /api/cashier/vouchers/verify/:code` - Preview voucher status before confirming redemption.
- [ ] **Frontend - Student UI (`client/src/pages/Student.jsx`):**
  - [ ] Add "My Vouchers" card or tab.
  - [ ] Display voucher cards with expiration badges, terms, and QR code modal.
- [ ] **Frontend - Cashier UI (`client/src/pages/Cashier.jsx`):**
  - [ ] Add Voucher Verification & Redemption input in Cashier dashboard.
  - [ ] Feedback state on successful redemption (success sound / animation / alert).

---

## 🗄️ Database & Data Model Updates

### 1. `server/models/Voucher.js` (New Model)
```javascript
import mongoose from 'mongoose';

const voucherSchema = new mongoose.Schema({
  voucherCode: { type: String, required: true, unique: true, index: true },
  idNumber: { type: String, required: true, index: true },
  accountID: { type: Number },
  studentName: { type: String, required: true },
  registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'MealRegistration' },
  mealDate: { type: Date, required: true },
  mealType: { type: String, default: 'breakfast' },
  voucherType: { 
    type: String, 
    enum: ['unclaimed_breakfast', 'general_reward'], 
    default: 'unclaimed_breakfast' 
  },
  title: { type: String, default: 'Missed Breakfast Compensation Voucher' },
  description: { type: String, default: 'Valid for snack or beverage replacement at cafeteria' },
  status: { 
    type: String, 
    enum: ['available', 'redeemed', 'expired'], 
    default: 'available',
    index: true 
  },
  issuedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  redeemedAt: { type: Date },
  redeemedBy: {
    idNumber: { type: String },
    name: { type: String }
  }
}, { timestamps: true });

export default mongoose.model('Voucher', voucherSchema);
```

### 2. Indexes Optimization
Ensure high-throughput queries for daily reporting:
- `MealRegistration`: index on `{ registrationDate: 1, status: 1 }`
- `AvailHistory`: index on `{ availedAt: 1, mealType: 1 }`
- `Voucher`: index on `{ idNumber: 1, status: 1, expiresAt: 1 }`

---

## 🔌 API Endpoints Overview

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/cashier/export-summary-report` | Cashier / Admin | Downloads `.xlsx` Summary Report for selected date range |
| `POST` | `/api/admin/trigger-summary-email` | Admin | Manually triggers the 11:00 PM summary report email dispatch |
| `GET` | `/api/student/my-vouchers` | Student | Fetches all active and redeemed vouchers for current student |
| `POST` | `/api/cashier/redeem-voucher` | Cashier | Validates and marks an unclaimed breakfast voucher as redeemed |
| `GET` | `/api/cashier/verify-voucher/:code` | Cashier | Pre-checks validity of voucher before redemption |

---

## 💻 Frontend UI/UX Enhancements

### 1. Avail History View (`Cashier.jsx` & `Admin.jsx`)
- Insert new action button:
  - **Color:** Indigo / Emerald (`bg-indigo-600 hover:bg-indigo-700`)
  - **Icon:** Spreadsheet / Summary Document Icon
  - **Label:** "Export Summary Report (Excel)"
- Date range picker integration to dynamically download summary for custom periods (Day, Week, Month).

### 2. Student Portal (`Student.jsx`)
- Banner alert when new compensation vouchers are generated:
  - *"You have an unclaimed breakfast voucher available!"*
- Scannable QR code display and one-click code copy button.

### 3. Cashier POS (`Cashier.jsx`)
- Voucher redemption modal with auto-focus barcode/QR input.
- Real-time display of voucher validity, student identity, and redemption confirmation.

---

## 🚀 Implementation Milestones & Checklist

### Phase 1: Summary Report Excel Export
- [x] Create `server/utils/summaryReportService.js` logic for data aggregation and Excel generation.
- [x] Implement data aggregation query (Breakfast, Lunch, Dinner counts + Availed / Unavailed student lists).
- [x] Format workbook using `exceljs` with multi-sheet layout (`Meal Summary`, `Availed List`, `Unavailed List`).
- [x] Add client-side export trigger button in `Cashier.jsx` with loading states.
- [x] Verified frontend build and backend syntax.

### Phase 2: Automated 11:00 PM Nightly Email
- [x] Configure `node-cron` job running at `0 23 * * *` (`Asia/Manila`).
- [x] Integrate report generator to attach workbook buffer directly in `emailService.js`.
- [x] Add HTML email summary template with summary stat cards.
- [x] Create manual trigger endpoint (`/api/admin/trigger-summary-email` & `/api/cashier/send-summary-report-email`) for testing.
- [x] Verify email delivery to test recipients.

### Phase 3: Unclaimed Breakfast Voucher System
- [x] Create `server/models/Voucher.js` model and register indexes.
- [x] Write service function `syncTodayBreakfastVouchers()` in `server/utils/breakfastVoucherService.js` to create vouchers for students who missed breakfast (valid until 11:00 PM PH same day).
- [x] Schedule voucher generation & expiration crons (`10:00 AM PH` and `11:00 PM PH`).
- [x] Implement voucher endpoints (`/api/student/vouchers`, `/api/student/vouchers/claim`, `/api/cashier/breakfast-vouchers`).
- [x] Build Student UI Voucher Ticket page in `Student.jsx`.
- [x] Build Cashier UI Claimed & Unclaimed Breakfast Vouchers table in `Cashier.jsx` (LIMA Meal Registrations page).

---

## 🧪 Testing & Quality Assurance

- [ ] **Excel Export Verification:**
  - Verify row counts match MongoDB totals exactly.
  - Verify students who availed dinner are not marked as unavailed.
  - Test date filters (single day, multi-day, empty result ranges).
- [ ] **Email Cron Testing:**
  - Verify execution at 11:00 PM in server timezone (`Asia/Manila`).
  - Verify email attachment opens without Excel file corruption.
  - Verify behavior when no registrations exist for that day.
- [ ] **Voucher Integrity:**
  - Ensure students cannot redeem the same voucher twice (idempotency check).
  - Verify expired vouchers cannot be redeemed.
  - Verify breakfast availed cannot trigger a voucher.


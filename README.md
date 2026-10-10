# Delta State Election Results Portal

[![Live Demo](https://img.shields.io/badge/Live_Demo-Online-success?style=for-the-badge&logo=render)](https://bincom-election-portal.onrender.com)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-green?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-Framework-lightgrey?style=for-the-badge&logo=express)](https://expressjs.com)
[![Bootstrap 5](https://img.shields.io/badge/Bootstrap-5.3-purple?style=for-the-badge&logo=bootstrap)](https://getbootstrap.com)
[![Status](https://img.shields.io/badge/Status-Production_Ready-blue?style=for-the-badge)](https://bincom-election-portal.onrender.com)

> **Direct Live Link:** [https://bincom-election-portal.onrender.com](https://bincom-election-portal.onrender.com)

A modern, citizen-focused election monitoring portal built to provide open, transparent, and verified ballot returns across all 25 Local Government Areas of Delta State.

---

## Live Deployment

* **Live Web Application:** [https://bincom-election-portal.onrender.com](https://bincom-election-portal.onrender.com)
* **Hosting Platform:** Render (Node.js Web Service)
* **Automated CI/CD:** Connected directly to GitHub. Any update pushed to the `main` branch builds and deploys automatically with zero downtime.
* **Security:** Enforced HTTPS with automated SSL/TLS certificates.

---

## Core Application Modules

### 1. Voting Center Results Explorer (`/polling-unit`)
* **Chained Combo Boxes:** 3-tier cascading dropdown filter (Local Government &rarr; Ward &rarr; Polling Unit) that dynamically fetches records without page reloads.
* **Instant Typeahead Search:** Debounced autocomplete search bar allowing instant lookup by school, landmark, or center code.
* **Certified Returns Display:** Shows voting center name, unit code, landmark description, presiding officer, and accredited party representative.
* **Vote Share Breakdown:** Visual progress bars displaying each political party's score and percentage share of total votes.
* **Interactive Analytics:** Bar charts powered by Chart.js that dynamically adjust contrast and grid lines for light and dark modes.
* **One-Click CSV Export:** Pure client-side spreadsheet export generating certified result sheets instantly.
* **Quick Jump Shortcuts:** One-click shortcut pills to inspect active voting centers immediately.

### 2. Local Government Council Collation (`/lga-total`)
* **Automated Aggregation:** Directly calculates total votes by summing all certified voting center returns across any of the 25 Local Government Areas.
* **Executive Summary:** Live metrics displaying total votes cast, number of reporting voting centers, and the current council winner.
* **Results Verification Check:** Side-by-side audit comparing summed voting center ballots against announced council totals, highlighting matches or discrepancies with clear indicators.
* **Export and Print:** Download an official council collation spreadsheet or trigger a print-formatted view.

### 3. Record New Polling Unit Returns (`/new-polling-unit`)
* **Chained Ward Selection:** Selecting a Local Government Area automatically unlocks and loads only the valid wards in that council.
* **Live Vote Counter:** Automatically calculates and displays total votes across all 9 registered political parties in real time as scores are typed.
* **Accredited Representative Capture:** Records official party representative credentials (name, phone number, email) linked to the voting center.
* **Transactional Integrity:** Uses database transactions to ensure voting centers, party scores, and agent details save together safely.

### 4. Statewide Dashboard and Accessibility (`/`)
* **Statewide Leaderboard:** Overall party standings, vote totals, and interactive donut share chart.
* **Council Directory:** Searchable directory grid of all 25 Local Government Areas with live keyword filtering.
* **Day and Night Theme:** Dark and light mode switcher with persistent user preference storage and zero-flicker loading.
* **Mobile-First Layout:** Compact views designed to prevent horizontal scrolling and eliminate excessive vertical page length on phones.

---

## Technology Stack

* **Runtime & Server:** Node.js, Express.js
* **Templating Engine:** EJS (Embedded JavaScript)
* **Frontend Architecture:** Bootstrap 5, Bootstrap Icons, Vanilla JavaScript (Fetch API)
* **Data Visualization:** Chart.js
* **Database Engine:** SQLite (sql.js) pre-seeded with Delta State election records for zero-dependency instant startup
* **Client Export:** Browser Blob API for instant CSV generation

---

## Project Structure

```
├── server.js              # Server entry point and configuration
├── package.json           # Dependencies and project metadata
├── database.sqlite        # SQLite database populated with Delta State records
├── bincom_test.sql        # Source SQL database archive
├── db/
│   └── index.js           # Database queries and connection handlers
├── routes/
│   ├── index.js           # Page routes (Dashboard, Polling Unit, LGA Collation, Entry)
│   └── api.js             # High-speed JSON endpoints for chained dropdowns and search
├── views/
│   ├── partials/          # Reusable header, navigation bar, and footer
│   ├── pages/             # Application views (Home, Polling Unit, LGA Total, Entry Form)
│   └── error.ejs          # User-friendly error view
├── public/
│   └── css/custom.css     # Mobile responsiveness and theme customization
└── scripts/
    └── init-db.js         # Automated database initialization script
```

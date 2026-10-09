# Delta State Election Collation & Results Portal

A web application developed with **Node.js**, **Express.js**, **EJS**, and **Bootstrap 5** for real-time querying, council-level collation aggregation, and presiding officer ballot returns across Delta State.

---

## 📌 Features

### 1. Polling Unit Results Explorer (`/polling-unit`)
- **Chained Dropdown Filters:** Fast, asynchronous cascading dropdowns (`Local Government` &rarr; `Ward` &rarr; `Polling Unit`) powered by dedicated REST API endpoints (`/api/lgas`, `/api/wards`, `/api/polling-units`).
- **Complete Ballot Returns:** Displays detailed unit metadata (Unit Number, Landmark Description, Coordinates, Presiding Officer), individual scores for all contesting political parties, and vote share percentages.
- **Visual Analytics:** Interactive Chart.js bar distribution breakdown.
- **Quick Browse:** One-click shortcut pills for voting centers with verified returns.

### 2. Local Government Collation Summary (`/lga-total`)
- **Grassroots Aggregation:** Computes total party votes directly by summing certified ballots from all reporting polling units within the selected LGA:
  ```sql
  SELECT 
    r.party_abbreviation, 
    SUM(r.party_score) AS total_score 
  FROM announced_pu_results r 
  JOIN polling_unit pu ON CAST(r.polling_unit_uniqueid AS INTEGER) = pu.uniqueid 
  WHERE pu.lga_id = ? 
  GROUP BY r.party_abbreviation 
  ORDER BY total_score DESC
  ```
- **Council Overview:** Displays reporting rates, total ballots counted, and council leaders with doughnut chart visualization.
- **Collation Reconciliation & Cross-Audit:** Side-by-side verification comparing grassroots polling unit sums against collation centre announcements with discrepancy calculation and reconciliation status indicators.

### 3. Presiding Officer Returns Submission (`/new-polling-unit`)
- **Unit Registration:** Dynamic chained LGA and Ward selection, location naming, code generation, and landmark descriptions.
- **Dynamic Party Inputs:** Dynamically pulls all registered political parties from the database (`PDP`, `DPP`, `ACN`, `PPA`, `CDC`, `JP`, `ANPP`, `LABOUR`, `CPP`).
- **Live Ballot Counter:** Real-time client-side calculation updating total votes cast as individual party scores are typed.
- **Reliable Data Persistence:** Transactional insertion into the polling unit registry and party results records with automatic database persistence.

---

## 🛠️ Technology Stack
- **Backend:** Node.js, Express.js
- **Frontend / Templating:** EJS, Bootstrap 5, Bootstrap Icons, Google Fonts (Inter)
- **Data Visualization:** Chart.js
- **Database:** SQLite (`sql.js`) pre-populated from `bincom_test.sql` (self-contained, zero-configuration portability for local runs and cloud deployments)

---

## 🚀 Getting Started Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the application:**
   ```bash
   npm start
   ```

3. **Access in browser:**
   ```
   http://localhost:3000
   ```

---

## 🌐 Cloud Deployment (Render.com)

1. Push this repository to GitHub.
2. Sign in to [Render.com](https://render.com) and create a **New Web Service**.
3. Select your repository.
4. Set the following build and start commands:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Click **Deploy**. Your application will be live in ~60 seconds.

---

## 📂 Project Structure
```
├── server.js              # Express application entrypoint
├── package.json           # Dependencies and scripts
├── database.sqlite        # Embedded database
├── bincom_test.sql        # Source SQL database schema and dump
├── db/
│   └── index.js           # Database connection and persistence layer
├── routes/
│   ├── index.js           # Web view routes
│   └── api.js             # REST API endpoints for cascading dropdowns
├── views/
│   ├── partials/          # Header, Navbar, and Footer partials
│   ├── pages/             # Home, Polling Unit, LGA Totals, and Entry pages
│   └── error.ejs          # Error handling view
├── public/
│   └── css/custom.css     # Responsive design and print stylesheet
└── scripts/
    ├── init-db.js         # Database bootstrap utility
    └── push-to-github.js  # Direct GitHub repository uploader
```

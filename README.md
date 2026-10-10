# Delta State Election Results Portal

A clean and user-friendly web portal built with Node.js and Express to view, calculate, and submit election results across Delta State.

---

## What This Website Does

### 1. View Results for Any Polling Unit (`/polling-unit`)
* **Step-by-Step Search:** Pick a Local Government Area, pick a Ward, and select a Polling Unit. The options update automatically so you find the exact voting center easily.
* **Clear Results Display:** Shows the voting location name, unit number, landmark description, and the presiding officer in charge.
* **Party Breakdown:** Shows how many votes each political party received, along with their percentage share of the total vote.
* **Visual Charts:** Displays a colorful bar chart showing the performance of each party at a glance.
* **Quick Shortcuts:** Helpful buttons let you jump straight to active voting centers in one click.

### 2. View Total Results for Any Local Government (`/lga-total`)
* **Accurate Vote Sums:** Directly calculates total votes by adding up results from all reporting polling units in the selected Local Government Area.
* **Clear Council Summary:** Displays total votes cast, how many voting centers have reported so far, and the leading party.
* **Audit and Comparison Table:** Compares the calculated polling unit total against the announced local government result side-by-side, making it easy to spot any differences.
* **Print Friendly:** Includes a simple button to print a clean paper copy of the results sheet.

### 3. Enter New Results for a Polling Unit (`/new-polling-unit`)
* **Simple Form:** Fill in the Local Government, Ward, polling unit name, and landmark description.
* **All Parties Included:** Provides input boxes for all registered political parties (PDP, DPP, ACN, PPA, CDC, JP, ANPP, LABOUR, CPP).
* **Live Vote Counter:** Automatically adds up the total number of votes on the screen as you type in scores.
* **Safe Saving:** Stores the new polling unit and all party scores directly into the database.

### 4. Day and Night Mode (Light / Dark Theme)
* Easily switch between light mode and dark mode using the sun/moon button in the top navigation bar.
* The website remembers your choice the next time you visit.
* Designed for high contrast and clear readability on all phone, tablet, and computer screens.

---

## Tools and Technologies Used
* **Server:** Node.js, Express.js
* **Page Templates:** EJS (HTML templates)
* **Styling and Design:** Bootstrap 5, Bootstrap Icons, Custom CSS
* **Charts:** Chart.js
* **Database:** SQLite with sql.js (comes pre-loaded with Delta State election data so it runs instantly without any extra database setup)

---

## How to Run It on Your Computer

1. **Install required packages:**
   ```bash
   npm install
   ```

2. **Start the website:**
   ```bash
   npm start
   ```

3. **Open in your web browser:**
   ```
   http://localhost:3000
   ```

---

## How to Host on the Web (Render.com)

1. Put your code on GitHub.
2. Go to [Render.com](https://render.com) and click **New +** > **Web Service**.
3. Connect your GitHub repository.
4. Set the following commands:
   * **Build Command:** `npm install`
   * **Start Command:** `npm start`
5. Click **Deploy Web Service**. Your live website link will be ready in about a minute.

---

## Project Files
```
├── server.js              # Starts the web server
├── package.json           # Project settings and dependencies
├── database.sqlite        # Ready-to-use database with Delta State records
├── bincom_test.sql        # Original database records file
├── db/
│   └── index.js           # Database helper functions
├── routes/
│   ├── index.js           # Web page routes (Dashboard, Polling Unit, LGA, New Unit)
│   └── api.js             # Fast data helpers for the dropdown filters
├── views/
│   ├── partials/          # Reusable header, navigation bar, and footer
│   ├── pages/             # Main web pages (Home, Polling Unit, LGA Total, Entry Form)
│   └── error.ejs          # Friendly error message page
├── public/
│   └── css/custom.css     # Mobile-friendly styling and dark mode rules
└── scripts/
    └── init-db.js         # Setup script to prepare the database if needed
```

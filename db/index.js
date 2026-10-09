const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
let dbInstance = null;
let SQL = null;
let isSaving = false;

// Persist the in-memory SQLite database back to disk
function persistDatabase() {
  if (!dbInstance || isSaving) return;
  try {
    isSaving = true;
    const binaryArray = dbInstance.export();
    fs.writeFileSync(dbPath, Buffer.from(binaryArray));
  } catch (err) {
    console.error('Failed to persist database to disk:', err);
  } finally {
    isSaving = false;
  }
}

// Initialize database
async function getDb() {
  if (dbInstance) return dbInstance;

  if (!SQL) {
    SQL = await initSqlJs();
  }

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    // If database.sqlite doesn't exist, initialize from scripts/init-db.js logic
    console.log('database.sqlite not found. Initializing...');
    const initScript = require('../scripts/init-db');
    // After running, re-read
    const fileBuffer = fs.readFileSync(dbPath);
    dbInstance = new SQL.Database(fileBuffer);
  }

  return dbInstance;
}

// Convert ? placeholders to :p0, :p1, etc. for sql.js prepared statements
function prepareQuery(sql, params = []) {
  if (!Array.isArray(params) || params.length === 0) {
    return { sql, bindObj: {} };
  }

  let paramIndex = 0;
  const bindObj = {};
  const formattedSql = sql.replace(/\?/g, () => {
    const key = `:p${paramIndex}`;
    bindObj[key] = params[paramIndex];
    paramIndex++;
    return key;
  });

  return { sql: formattedSql, bindObj };
}

/**
 * Execute a query that returns multiple rows
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<Array<Object>>}
 */
async function query(sql, params = []) {
  const db = await getDb();
  const { sql: formattedSql, bindObj } = prepareQuery(sql, params);
  const stmt = db.prepare(formattedSql);

  if (Object.keys(bindObj).length > 0) {
    stmt.bind(bindObj);
  }

  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Execute a query that returns a single row
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<Object|null>}
 */
async function get(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Execute an INSERT, UPDATE, or DELETE statement
 * @param {string} sql 
 * @param {Array} params 
 * @returns {Promise<{ lastInsertRowid: number, changes: number }>}
 */
async function run(sql, params = []) {
  const db = await getDb();
  const { sql: formattedSql, bindObj } = prepareQuery(sql, params);
  
  if (Object.keys(bindObj).length > 0) {
    db.run(formattedSql, bindObj);
  } else {
    db.run(formattedSql);
  }

  // Get last insert rowid and changes
  const lastIdRes = db.exec("SELECT last_insert_rowid() AS id;");
  const lastInsertRowid = lastIdRes[0] ? lastIdRes[0].values[0][0] : null;

  const changesRes = db.exec("SELECT changes() AS ch;");
  const changes = changesRes[0] ? changesRes[0].values[0][0] : 0;

  // Persist to file
  persistDatabase();

  return { lastInsertRowid, changes };
}

module.exports = {
  getDb,
  query,
  get,
  run,
  persistDatabase
};

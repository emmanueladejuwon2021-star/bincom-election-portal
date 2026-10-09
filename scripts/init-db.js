const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const sqlFilePath = path.join(__dirname, '..', 'bincom_test.sql');
const dbFilePath = path.join(__dirname, '..', 'database.sqlite');

const tableSchemas = [
  `CREATE TABLE IF NOT EXISTS agentname (
    name_id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    email TEXT DEFAULT NULL,
    phone TEXT NOT NULL,
    pollingunit_uniqueid INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS announced_lga_results (
    result_id INTEGER PRIMARY KEY AUTOINCREMENT,
    lga_name TEXT NOT NULL,
    party_abbreviation TEXT NOT NULL,
    party_score INTEGER NOT NULL,
    entered_by_user TEXT NOT NULL,
    date_entered TEXT NOT NULL,
    user_ip_address TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS announced_pu_results (
    result_id INTEGER PRIMARY KEY AUTOINCREMENT,
    polling_unit_uniqueid TEXT NOT NULL,
    party_abbreviation TEXT NOT NULL,
    party_score INTEGER NOT NULL,
    entered_by_user TEXT NOT NULL,
    date_entered TEXT NOT NULL,
    user_ip_address TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS announced_state_results (
    result_id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_name TEXT NOT NULL,
    party_abbreviation TEXT NOT NULL,
    party_score INTEGER NOT NULL,
    entered_by_user TEXT NOT NULL,
    date_entered TEXT NOT NULL,
    user_ip_address TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS announced_ward_results (
    result_id INTEGER PRIMARY KEY AUTOINCREMENT,
    ward_name TEXT NOT NULL,
    party_abbreviation TEXT NOT NULL,
    party_score INTEGER NOT NULL,
    entered_by_user TEXT NOT NULL,
    date_entered TEXT NOT NULL,
    user_ip_address TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS lga (
    uniqueid INTEGER PRIMARY KEY AUTOINCREMENT,
    lga_id INTEGER NOT NULL,
    lga_name TEXT NOT NULL,
    state_id INTEGER NOT NULL,
    lga_description TEXT,
    entered_by_user TEXT NOT NULL,
    date_entered TEXT NOT NULL,
    user_ip_address TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS party (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partyid TEXT NOT NULL,
    partyname TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS polling_unit (
    uniqueid INTEGER PRIMARY KEY AUTOINCREMENT,
    polling_unit_id INTEGER NOT NULL,
    ward_id INTEGER NOT NULL,
    lga_id INTEGER NOT NULL,
    uniquewardid INTEGER DEFAULT NULL,
    polling_unit_number TEXT DEFAULT NULL,
    polling_unit_name TEXT DEFAULT NULL,
    polling_unit_description TEXT,
    lat TEXT DEFAULT NULL,
    long TEXT DEFAULT NULL,
    entered_by_user TEXT DEFAULT NULL,
    date_entered TEXT DEFAULT NULL,
    user_ip_address TEXT DEFAULT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS states (
    state_id INTEGER PRIMARY KEY,
    state_name TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS ward (
    uniqueid INTEGER PRIMARY KEY AUTOINCREMENT,
    ward_id INTEGER NOT NULL,
    ward_name TEXT NOT NULL,
    lga_id INTEGER NOT NULL,
    ward_description TEXT,
    entered_by_user TEXT NOT NULL,
    date_entered TEXT NOT NULL,
    user_ip_address TEXT NOT NULL
  );`
];

async function initializeDatabase() {
  console.log('--- Initializing SQLite database from bincom_test.sql ---');
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // Create tables
  for (const schema of tableSchemas) {
    db.run(schema);
  }
  console.log('Tables created successfully.');

  // Read SQL file and extract INSERT statements
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`SQL dump file not found at ${sqlFilePath}`);
    process.exit(1);
  }

  const rawSql = fs.readFileSync(sqlFilePath, 'utf8');

  // Split into statements ending with semicolon followed by newline
  // We filter specifically for INSERT INTO statements
  const insertRegex = /INSERT INTO `?([a-zA-Z0-9_]+)`?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
  let match;
  let insertCount = 0;

  db.run('BEGIN TRANSACTION;');

  while ((match = insertRegex.exec(rawSql)) !== null) {
    const table = match[1];
    const columns = match[2].replace(/`/g, '');
    const values = match[3];

    const statement = `INSERT INTO "${table}" (${columns}) VALUES ${values};`;
    try {
      db.run(statement);
      insertCount++;
    } catch (err) {
      console.warn(`Warning inserting into ${table}: ${err.message}`);
    }
  }

  db.run('COMMIT;');
  console.log(`Executed ${insertCount} bulk INSERT statements.`);

  // Verify row counts
  const tables = [
    'agentname',
    'announced_lga_results',
    'announced_pu_results',
    'lga',
    'party',
    'polling_unit',
    'states',
    'ward'
  ];

  console.log('\n--- Database Verification ---');
  for (const tbl of tables) {
    const res = db.exec(`SELECT COUNT(*) as count FROM "${tbl}";`);
    const count = res[0] ? res[0].values[0][0] : 0;
    console.log(`Table [${tbl}]: ${count} rows`);
  }

  // Export to disk
  const binaryArray = db.export();
  fs.writeFileSync(dbFilePath, Buffer.from(binaryArray));
  console.log(`\nDatabase saved to: ${dbFilePath}`);
}

initializeDatabase().catch(err => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});

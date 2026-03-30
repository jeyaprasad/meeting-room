const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgres://postgres:bentennyson1%40@localhost:5432/postgres'
});

async function checkDatabases() {
  try {
    await client.connect();
    const res = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
    console.log("Databases on this server:");
    res.rows.forEach(r => {
      console.log(`- "${r.datname}"`);
    });
    await client.end();
  } catch(e) {
    console.error("Error:", e.message);
  }
}

checkDatabases();

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pgcs = require('pg-connection-string');
console.log("Raw URL:", process.env.DATABASE_URL);
console.log("Parsed:", pgcs.parse(process.env.DATABASE_URL));

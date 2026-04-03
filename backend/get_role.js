require('dotenv').config();
const db = require('./config/db');

db.query("SHOW COLUMNS FROM Users LIKE 'role'", (err, results) => {
    if (err) console.error(err);
    else console.log(JSON.stringify(results, null, 2));
    process.exit(0);
});

require('dotenv').config();
const db = require('./config/db');

db.query('DESCRIBE Users', (err, results) => {
    if (err) console.error(err);
    else console.log(results);
    process.exit(0);
});

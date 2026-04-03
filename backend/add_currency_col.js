require('dotenv').config();
const db = require('./config/db');

// Add currency column
db.query("ALTER TABLE Products ADD COLUMN currency VARCHAR(10) DEFAULT 'USD'", (err, results) => {
    if (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Currency column already exists.');
            process.exit(0);
        }
        console.error('Error altering table:', err);
    } else {
        console.log('Successfully added currency column to Products');
    }
    process.exit(0);
});

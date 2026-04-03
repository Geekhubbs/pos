require('dotenv').config();
const db = require('./config/db');

// Add 'normal' to the enum list
db.query("ALTER TABLE Users MODIFY COLUMN role ENUM('Admin', 'Manager', 'Cashier', 'normal') NOT NULL", (err, results) => {
    if (err) console.error('Error altering table:', err);
    else console.log('Successfully altered role column to include normal');
    process.exit(0);
});

require('dotenv').config();
const db = require('./config/db');

const sql = `
CREATE TABLE IF NOT EXISTS Customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    loyalty_points INT DEFAULT 0
);
`;

db.query(sql, (err, results) => {
    if (err) {
        console.error('Error creating table:', err);
    } else {
        console.log('Successfully created Customers table');
    }
    process.exit(0);
});

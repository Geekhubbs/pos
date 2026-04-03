require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./config/db');

const username = 'normaluser';
const password = 'password123';
const role = 'normal';

const hashedPassword = bcrypt.hashSync(password, 10);
const sql = 'INSERT INTO Users (username, password, role) VALUES (?, ?, ?)';

db.query(sql, [username, hashedPassword, role], (err, result) => {
    if (err) {
        console.error('Error creating normal user:', err);
    } else {
        console.log('Successfully created normal user:', username);
    }
    process.exit(0);
});

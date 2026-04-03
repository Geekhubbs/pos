const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Register a new user
router.post('/register', (req, res) => {
    const { username, password, role } = req.body;

    // Hash the password before saving
    const hashedPassword = bcrypt.hashSync(password, 10);

    const sql = 'INSERT INTO Users (username, password, role) VALUES (?, ?, ?)';
    db.query(sql, [username, hashedPassword, role], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'User already exists or error occurred' });
        }
        res.json({ message: 'User registered successfully' });
    });
});

// Login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    const sql = 'SELECT * FROM Users WHERE username = ?';
    db.query(sql, [username], (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const user = results[0];
        const isMatch = bcrypt.compareSync(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const token = jwt.sign(
            { user_id: user.user_id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({ token, role: user.role, username: user.username });
    });
});

module.exports = router;
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');

// ── Auth Middleware ──
function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Invalid or expired token.' });
    }
}

// Admin only middleware
function adminOnly(req, res, next) {
    if (req.user.role.toLowerCase() !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    next();
}

// Get all products — any logged in user can view
router.get('/', verifyToken, (req, res) => {
    db.query('SELECT * FROM Products', (err, results) => {
        if (err) return res.status(500).json({ message: 'Error fetching products' });
        res.json(results);
    });
});

// Add a product — admin only
router.post('/', verifyToken, adminOnly, (req, res) => {
    const { product_name, category, price, quantity, barcode, currency, image_url } = req.body;
    const sql = 'INSERT INTO Products (product_name, category, price, quantity, barcode, currency, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [product_name, category, price, quantity, barcode, currency || 'USD', image_url || null], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error adding product' });
        res.json({ message: 'Product added successfully', product_id: result.insertId });
    });
});

// Update a product — admin only
router.put('/:id', verifyToken, adminOnly, (req, res) => {
    const { product_name, category, price, quantity, barcode, currency, image_url } = req.body;
    const sql = 'UPDATE Products SET product_name=?, category=?, price=?, quantity=? , barcode=?, currency=?, image_url=? WHERE product_id=?';
    db.query(sql, [product_name, category, price, quantity, barcode, currency || 'USD', image_url || null, req.params.id], (err) => {
        if (err) return res.status(500).json({ message: 'Error updating product' });
        res.json({ message: 'Product updated successfully' });
    });
});

// Delete a product — admin only
router.delete('/:id', verifyToken, adminOnly, (req, res) => {
    db.query('DELETE FROM Products WHERE product_id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ message: 'Error deleting product' });
        res.json({ message: 'Product deleted successfully' });
    });
});

module.exports = router;
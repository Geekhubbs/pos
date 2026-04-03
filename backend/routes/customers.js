const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all customers
router.get('/', (req, res) => {
    db.query('SELECT * FROM Customers ORDER BY name ASC', (err, results) => {
        if (err) return res.status(500).json({ message: 'Error fetching customers' });
        res.json(results);
    });
});

// Create a new customer
router.post('/', (req, res) => {
    const { name, phone, email, address, loyalty_points } = req.body;
    const sql = 'INSERT INTO Customers (name, phone, email, address, loyalty_points) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [name, phone, email, address, loyalty_points || 0], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error creating customer', error: err });
        res.json({ message: 'Customer added', customer_id: result.insertId });
    });
});

// Update a customer
router.put('/:id', (req, res) => {
    const { name, phone, email, address, loyalty_points } = req.body;
    const sql = 'UPDATE Customers SET name=?, phone=?, email=?, address=?, loyalty_points=? WHERE customer_id=?';
    db.query(sql, [name, phone, email, address, loyalty_points, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error updating customer' });
        res.json({ message: 'Customer updated' });
    });
});

// Delete a customer
router.delete('/:id', (req, res) => {
    const sql = 'DELETE FROM Customers WHERE customer_id=?';
    db.query(sql, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error deleting customer' });
        res.json({ message: 'Customer deleted' });
    });
});

module.exports = router;

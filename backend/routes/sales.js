const express = require('express');
const router = express.Router();
const db = require('../config/db');
const axios = require('axios');

// Verify Paystack Payment
router.post('/verify-paystack', async (req, res) => {
    const { reference } = req.body;
    if (!reference) return res.status(400).json({ message: 'Reference is required' });

    try {
        const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
            }
        });

        if (response.data.data.status === 'success') {
            res.json({ success: true, data: response.data.data });
        } else {
            res.json({ success: false, status: response.data.data.status, message: 'Payment status: ' + response.data.data.status });
        }
    } catch (error) {
        console.error('Paystack verification error:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: 'Verification failed' });
    }
});

// Charge Mobile Money directly (Server-to-Server)
router.post('/charge-momo', async (req, res) => {
    const { amount, phone, provider, email } = req.body;
    if (!amount || !phone || !provider || !email) {
        return res.status(400).json({ message: 'Amount, phone, provider, and email are required' });
    }

    try {
        const payload = {
            email: email,
            amount: amount, // defined in pesewas already
            mobile_money: {
                phone: phone,
                provider: provider
            }
        };

        const response = await axios.post(`https://api.paystack.co/charge`, payload, {
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        // Paystack usually returns a 'pending' or 'send_otp' status for MoMo while prompt is sent to user
        res.json({ success: true, data: response.data.data });
    } catch (error) {
        console.error('Paystack charge error:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            message: error.response?.data?.message || 'Charge failed' 
        });
    }
});

// Submit Paystack OTP
router.post('/submit-otp', async (req, res) => {
    const { otp, reference } = req.body;
    try {
        const response = await axios.post(`https://api.paystack.co/charge/submit_otp`, {
            otp,
            reference
        }, {
            headers: {
                Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        res.json({ success: true, data: response.data.data });
    } catch (error) {
        console.error('Paystack submit OTP error:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            message: error.response?.data?.message || 'Failed to submit OTP' 
        });
    }
});

// Create a new sale
router.post('/', (req, res) => {
    const { user_id, customer_id, items, payment_method, amount_paid } = req.body;

    // Calculate total
    const total_amount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Insert into Sales table
    const saleSql = 'INSERT INTO Sales (user_id, customer_id, total_amount, payment_method) VALUES (?, ?, ?, ?)';
    db.query(saleSql, [user_id, customer_id, total_amount, payment_method], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error creating sale' });

        const sale_id = result.insertId;

        // Insert each item into Sales_Items table
        const itemSql = 'INSERT INTO Sales_Items (sale_id, product_id, quantity, price) VALUES ?';
        const itemValues = items.map(item => [sale_id, item.product_id, item.quantity, item.price]);

        db.query(itemSql, [itemValues], (err) => {
            if (err) return res.status(500).json({ message: 'Error saving sale items' });

            // Update stock for each product
            items.forEach(item => {
                db.query('UPDATE Products SET quantity = quantity - ? WHERE product_id = ?',
                    [item.quantity, item.product_id]);
            });

            // Record payment
            const paymentSql = 'INSERT INTO Payments (sale_id, amount_paid, change_given) VALUES (?, ?, ?)';
            const change = amount_paid - total_amount;
            db.query(paymentSql, [sale_id, amount_paid, change]);

            res.json({
                message: 'Sale completed successfully',
                sale_id,
                total_amount,
                change: change.toFixed(2)
            });
        });
    });
});

// Get all sales
router.get('/', (req, res) => {
    const sql = `SELECT Sales.*, Users.username 
                 FROM Sales 
                 JOIN Users ON Sales.user_id = Users.user_id 
                 ORDER BY Sales.date DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Error fetching sales' });
        res.json(results);
    });
});

module.exports = router;
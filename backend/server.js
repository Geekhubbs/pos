const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const crypto = require('crypto');

dotenv.config();
const db = require('./config/db');
const authRoutes = require('./routes/auth');


const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
const productRoutes = require('./routes/products');
app.use('/api/products', productRoutes);
const salesRoutes = require('./routes/sales');
app.use('/api/sales', salesRoutes);
const customerRoutes = require('./routes/customers');
app.use('/api/customers', customerRoutes);

// Paystack Webhook
app.post('/api/webhooks/paystack', (req, res) => {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    // Validate event (requires raw body ideally, but simplified here)
    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');
    if (hash == req.headers['x-paystack-signature']) {
        const event = req.body;
        console.log('Received Paystack Webhook:', event.event);
        if (event.event === 'charge.success') {
            console.log('Payment successful for reference:', event.data.reference);
            // Additional DB updates can be handled here if needed
        }
    }
    res.sendStatus(200);
});

app.get('/', (req, res) => {
    res.send('POS backend is running!')
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
});


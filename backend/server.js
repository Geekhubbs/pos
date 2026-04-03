const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

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

app.get('/', (req, res) => {
    res.send('POS backend is running!')
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
});


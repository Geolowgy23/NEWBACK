// controllers/adminController.js
const db = require('../config/db');
const jwt = require('jsonwebtoken');

// Fetch all orders (Admin only)
exports.getOrders = (req, res) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).send('Access denied.');

    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET || 'your-secret-key', (err, verified) => {
        if (err || verified.role !== 'admin') return res.status(403).send('Invalid token.');
        const query = `
            SELECT 
                o.id, o.user_id, u.username, o.product_name, o.quantity, 
                o.order_date, o.total_price, o.status
            FROM orders o 
            JOIN users u ON o.user_id = u.id;
        `;
        db.query(query, (err, results) => {
            if (err) return res.status(500).send('Server error');
            res.json(results);
        });
    });
};

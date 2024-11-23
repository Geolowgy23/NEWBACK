    const express = require('express');
    const jwt = require('jsonwebtoken');
    const router = express.Router();
    const db = require('../config/db'); // Ensure this imports your database configuration

    // Fetch all orders (no userId filter)
    router.get('/orders', (req, res) => {
        // Check if the token is provided in the request headers
        const token = req.headers['authorization'];

        if (!token) {
            return res.status(401).send('Access denied. No token provided.');
        }

        // Verify the token and extract user info
        jwt.verify(token.split(' ')[1], process.env.JWT_SECRET || 'your-secret-key', (err, verified) => {
            if (err) {
                return res.status(403).send('Invalid token.');
            }

            // SQL query to fetch all orders (no filter by user)
            const query = `
                SELECT id, user_id, total_price, total_items, created_at, status, name, address
                FROM orders
            `;

            db.query(query, (err, results) => {
                if (err) {
                    console.error('Error fetching orders:', err);
                    return res.status(500).send('Server error');
                }

                if (results.length === 0) {m
                    return res.status(404).send('No orders found');
                }

                // Send the fetched orders as the response
                res.json(results);
            });
        });
    });

    module.exports = router;

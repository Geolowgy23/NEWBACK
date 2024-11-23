// controllers/authController.js
const db = require('../config/db'); // Ensure this imports your database configuration

// Fetch Orders for a specific user
exports.Orders = (req, res) => {
    const userId = req.params.userId;  // Get user ID from the route params

    // SQL query to fetch the specific columns from the orders table and the user's name and address
    const query = `
        SELECT o.id, o.user_id, o.total_price, o.total_items, o.created_at, o.status, u.name, u.address
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.user_id = ?
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching orders:', err);
            return res.status(500).send('Server error');
        }

        if (results.length === 0) {
            return res.status(404).send('No orders found for this user');
        }

        // Send the fetched orders as the response
        res.json(results);
    });
};

module.exports = exports;

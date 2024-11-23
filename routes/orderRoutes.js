const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = require('../config/db'); // Ensure this is correctly linked

// Order confirmation route
router.post('/confirm-order', (req, res) => {
    const { items, totalPrice, totalItems } = req.body;

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

        const userId = verified.id; // Get the userId from the token

        // Validate incoming order data
        if (!userId || !items || items.length === 0) {
            return res.status(400).send('Invalid order data');
        }

        // Fetch the user details (name and address)
        const getUserDetailsQuery = 'SELECT name, address FROM users WHERE id = ?';
        db.query(getUserDetailsQuery, [userId], (err, userDetailsResult) => {
            if (err || userDetailsResult.length === 0) {
                console.error('Error fetching user details:', err);
                return res.status(500).send('User not found');
            }

            const { name, address } = userDetailsResult[0]; // Extract user details

            // Insert the order into the orders table, including name and address
            const insertOrderQuery = 'INSERT INTO orders (user_id, total_price, total_items, name, address) VALUES (?, ?, ?, ?, ?)';
            db.query(insertOrderQuery, [userId, totalPrice, totalItems, name, address], (err, result) => {
                if (err) {
                    console.error('Error inserting order:', err);
                    return res.status(500).send('Order failed');
                }

                const orderId = result.insertId; // Get the order ID for the newly created order

                // Prepare an array to insert order items into order_items
                const orderItemsData = [];
                let processedItems = 0;

                items.forEach((item) => {
                    const cupId = item.cup.id;
                    const quantity = item.quantity;
                    const price = item.price;

                    // Get the product_id for the cup_id
                    const getProductQuery = 'SELECT id FROM products WHERE id = ?';
                    db.query(getProductQuery, [cupId], (err, productResult) => {
                        if (err || productResult.length === 0) {
                            console.error('Product not found for cup_id:', cupId);
                            return res.status(500).send('Product not found for cup');
                        }

                        const productId = productResult[0].id; // Get the product_id based on cup_id

                        // Add the order item data to the orderItemsData array
                        orderItemsData.push([userId, orderId, cupId, quantity, price, productId]);

                        processedItems++;

                        // If all order items have been processed, insert them into the order_items table
                        if (processedItems === items.length) {
                            const insertOrderItemQuery = 'INSERT INTO order_items (user_id, order_id, cup_id, quantity, price, product_id) VALUES ?';
                            db.query(insertOrderItemQuery, [orderItemsData], (err) => {
                                if (err) {
                                    console.error('Error inserting order items:', err);
                                    return res.status(500).send('Order items failed');
                                }

                                res.send('Order confirmed successfully');
                            }); 
                        }
                    });
                });
            });
        });
    });
});

module.exports = router;

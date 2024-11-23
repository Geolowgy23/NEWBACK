const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');
const app = express();

app.use(cors());
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'pzamdbdb', 
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        throw err;
    }
    console.log('MySQL Connected...');
});

// Registration route
app.post('/register', async (req, res) => {
    const { username, password, name, address } = req.body;

    if (!username || !password || !name || !address) {
        return res.status(400).send('All fields are required');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const checkQuery = 'SELECT * FROM users WHERE username = ?';
        db.query(checkQuery, [username], (err, result) => {
            if (err) {
                console.error('Error checking user existence:', err);
                return res.status(500).send('Server error');
            }

            if (result.length > 0) {
                return res.status(400).send('Username already exists');
            }

            const insertQuery = 'INSERT INTO users (username, password, name, address) VALUES (?, ?, ?, ?)';
            db.query(insertQuery, [username, hashedPassword, name, address], (err) => {
                if (err) {
                    console.error('Error inserting user into the database:', err);
                    return res.status(500).send('User registration failed');
                }
                res.send('User registered successfully');
            });
        });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).send('Server error');
    }
});


// User Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }

    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(400).send('User not found');
        }

        const validPassword = await bcrypt.compare(password, results[0].password);
        if (!validPassword) {
            return res.status(400).send('Invalid credentials');
        }

        const token = jwt.sign({ id: results[0].id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
        res.json({ token });
    });
});

// Admin Login Route
app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;

    // Check if the provided credentials match the admin's credentials
    if (username === 'admin' && password === '123admin') {
        const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
        return res.json({ token });
    }

    return res.status(401).send('Invalid admin credentials');
});

app.get('/admin/orders', (req, res) => {
    const query = 'SELECT * FROM orders';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Failed to fetch orders' });
        }
        res.json(results);
    });
});

// Fetch user profile data
app.get('/api/profile', (req, res) => {
    const token = req.headers['authorization'];

    // Check if the token is provided
    if (!token) return res.status(401).send('Access denied.');

    // Verify the token
    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET || 'your-secret-key', (err, verified) => {
        if (err) return res.status(403).send('Invalid token.');

        // Fetch user information based on the user ID in the token
        const query = 'SELECT name, address FROM users WHERE id = ?';
        db.query(query, [verified.id], (err, result) => {
            if (err) {
                console.error('Error fetching profile:', err);
                return res.status(500).send('Server error');
            }

            if (result.length === 0) {
                return res.status(404).send('User not found');
            }

            // Return user profile data
            res.json(result[0]); // Return the first result which should be the user data
        });
    });
});

// Update user profile data
app.put('/api/profile/update', (req, res) => {
    const token = req.headers['authorization'];

    // Check if the token is provided
    if (!token) return res.status(401).send('Access denied.');

    // Verify the token
    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET || 'your-secret-key', (err, verified) => {
        if (err) return res.status(403).send('Invalid token.');

        const { name, address } = req.body; // Get name and address from request body
        const query = 'UPDATE users SET name = ?, address = ? WHERE id = ?';

        // Update the user information based on the user ID in the token
        db.query(query, [name, address, verified.id], (err, result) => {
            if (err) {
                console.error('Error updating profile:', err);
                return res.status(500).send('Server error');
            }

            res.send('Profile updated successfully');
        });
    });
});

// Payment link generation route
app.post('/api/payment-link', async (req, res) => {
    const { data } = req.body;
    const { amount } = data.attributes;

    if (!amount) {
        return res.status(400).send('Amount is required');
    }

    try {
        const response = await axios.post('https://api.paymongo.com/v1/links', {
            data: {
                attributes: {
                    amount: amount * 1,
                    description: "Payment for Order",
                    remarks: "none"
                }
            }
        }, {
            headers: {
                'accept': 'application/json',
                'authorization': `Basic ${Buffer.from('sk_test_qktYNDx5UjE2gznY1es6vnba').toString('base64')}`,
                'content-type': 'application/json'
            }
        });

        return res.json(response.data);
    } catch (error) {
        console.error('Payment link creation error:', error.response ? error.response.data : error.message);
        return res.status(500).json({ message: 'Payment link creation failed', error: error.response ? error.response.data : error.message });
    }
});

// Use the orderRoutes (Make sure you have the orderRoutes defined)
const orderRoutes = require('./routes/orderRoutes'); // Siguraduhing ito ay tama
app.use('/api/orders', orderRoutes);  // Gamitin ang '/api/orders' para sa order routes

// Start server
app.listen(5000, () => console.log('Server running on port 5000'));


const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
  })
  

  // Endpoint to update the order status
  app.put('/admin/orders/:orderId', (req, res) => {
    const { orderId } = req.params;
    const status = 'Accepted'; // Define the new status for the order
    const itemStatus = 'Delivered'; // Define the new status for the items

    const queryOrder = 'UPDATE orders SET status = ? WHERE id = ?';
    const queryItems = 'UPDATE order_items SET status = ? WHERE order_id = ?';

    db.query(queryOrder, [status, orderId], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to update order status' });
        }

        // Update the associated order_items
        db.query(queryItems, [itemStatus, orderId], (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to update order items status' });
            }
            res.status(200).json({ message: 'Order and items updated successfully' });
        });
    });
});



// Get all inventory items for the dashboard
// Endpoint to get inventory items along with stock
app.get('/api/inventory', (req, res) => {
    const query = 'SELECT product_id, cup_name, stocks FROM inventory';
    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Failed to fetch inventory data' });
        }
        res.json(results); // Return the results with stock info
    });
});

// Endpoint to update stock quantity
app.put('/api/inventory/:productId', (req, res) => {
    const { productId } = req.params;
    const { newStock } = req.body;  // Get the new stock value from the request body

    // SQL query to update the stock
    const query = 'UPDATE inventory SET stocks = ? WHERE product_id = ?';
    db.query(query, [newStock, productId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Failed to update stock' });
        }
        res.json({ message: 'Stock updated successfully' });
    });
});






app.get('/api/orders/user', (req, res) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).send('Access denied.');

    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET || 'your-secret-key', (err, verified) => {
        if (err) return res.status(403).send('Invalid token.');

        const userId = verified.id;  // Extract user ID from the token
        const query = 'SELECT * FROM orders WHERE user_id = ?';  // Adjust based on your DB structure
        db.query(query, [userId], (err, results) => {
            if (err) {
                console.error('Error fetching user orders:', err);
                return res.status(500).send('Failed to fetch user orders');
            }
            res.json(results);
        });
    });
});

// app.get('/orders', (req, res) => {
//     // SQL query to fetch all orders from the orders table
//     const query = `
//         SELECT id, user_id, order_id, cup_id, quantity, price, product_id
//         FROM order_items
//     `;

//     db.query(query, (err, results) => {
//         if (err) {
//             console.error('Error fetching orders:', err);
//             return res.status(500).send('Server error');
//         }

//         if (results.length === 0) {
//             return res.status(404).send('No orders found');
//         }

//         // Send the fetched orders as the response
//         res.json(results);
//     });
// });








// app.get('/orders', (req, res) => {
//     // SQL query to fetch all orders from the order_items table and join with products to get the image column
//     const query = `
//         SELECT oi.id, oi.user_id, oi.order_id, oi.cup_id, oi.quantity, oi.price, oi.product_id, p.image
//         FROM order_items oi
//         INNER JOIN products p ON oi.product_id = p.id
//     `;

//     db.query(query, (err, results) => {
//         if (err) {
//             console.error('Error fetching orders:', err);
//             return res.status(500).send('Server error');
//         }

//         if (results.length === 0) {
//             return res.status(404).send('No orders found');
//         }

//         // Send the fetched orders with product image as the response
//         res.json(results);
//     });
// });




app.get('/orders', (req, res) => {
    const username = req.query.username; // Get the username from the query params

    if (!username) {
        return res.status(400).send('Username is required');
    }

    // SQL query to fetch orders for the specific user including the status
    const query = `
        SELECT 
            oi.id, 
            oi.user_id, 
            oi.order_id, 
            oi.cup_id, 
            oi.quantity, 
            oi.price, 
            oi.product_id, 
            p.image, 
            oi.status,  -- Include status
            oi.product_name
        FROM order_items oi
        INNER JOIN products p ON oi.product_id = p.id
        INNER JOIN users u ON oi.user_id = u.id
        WHERE u.username = ?;
    `;

    db.query(query, [username], (err, results) => {
        if (err) {
            console.error('Error fetching orders:', err);
            return res.status(500).send('Server error');
        }

        if (results.length === 0) {
            return res.status(404).send('No orders found for the given username');
        }

        // Send the fetched orders as the response, including the status
        res.json(results);
    });
});









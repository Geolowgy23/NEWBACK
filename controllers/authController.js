// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// User Registration
exports.register = async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const checkQuery = 'SELECT * FROM users WHERE username = ?';
        db.query(checkQuery, [username], (err, result) => {
            if (err) return res.status(500).send('Server error');
            if (result.length > 0) return res.status(400).send('Username already exists');
            const insertQuery = 'INSERT INTO users (username, password) VALUES (?, ?)';
            db.query(insertQuery, [username, hashedPassword], (err) => {
                if (err) return res.status(500).send('User registration failed');
                res.send('User registered successfully');
            });
        });
    } catch (error) {
        res.status(500).send('Server error');
    }
};

// User Login
exports.login = (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).send('Username and password are required');
    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], async (err, results) => {
        if (err || results.length === 0) return res.status(400).send('User not found');
        const validPassword = await bcrypt.compare(password, results[0].password);
        if (!validPassword) return res.status(400).send('Invalid credentials');
        const token = jwt.sign({ id: results[0].id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
        res.json({ token });
    });
};

// Admin Login
exports.adminLogin = (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '123admin') {
        const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
        return res.json({ token });
    }
    res.status(401).send('Invalid admin credentials');
};

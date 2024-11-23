// controllers/profileController.js
const db = require('../config/db');
const jwt = require('jsonwebtoken');

// Fetch user profile
exports.getProfile = (req, res) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).send('Access denied.');

    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET || 'your-secret-key', (err, verified) => {
        if (err) return res.status(403).send('Invalid token.');
        const query = 'SELECT name, address FROM users WHERE id = ?';
        db.query(query, [verified.id], (err, result) => {
            if (err) return res.status(500).send('Server error');
            if (result.length === 0) return res.status(404).send('User not found');
            res.json(result[0]);
        });
    });
};

// Update user profile
exports.updateProfile = (req, res) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).send('Access denied.');

    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET || 'your-secret-key', (err, verified) => {
        if (err) return res.status(403).send('Invalid token.');
        const { name, address } = req.body;
        const query = 'UPDATE users SET name = ?, address = ? WHERE id = ?';
        db.query(query, [name, address, verified.id], (err) => {
            if (err) return res.status(500).send('Server error');
            res.send('Profile updated successfully');
        });
    });
};

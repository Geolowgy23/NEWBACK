// config/db.js
const mysql = require('mysql');

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

module.exports = db;

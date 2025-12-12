const mysql = require('mysql2');


const db = mysql.createPool({
  host: 'localhost',
  user: 'hotel_admin',
  password: 'Santos@pingo3027', 
  database: 'Hotel',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = db;
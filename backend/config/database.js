const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'hotel_admin',
  password: 'Santos@pingo3027',
  database: 'Hotel', 
});


module.exports = db;
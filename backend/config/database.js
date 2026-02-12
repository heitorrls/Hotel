const mysql = require('mysql2');

// Mudei de 'connection' para 'db' para bater com o exports lá embaixo
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',      
    password: 'root',  // Verifique se sua senha local é 'root' mesmo ou vazia ''
    database: 'Hotel'  // Nome do banco de dados
});

module.exports = db;
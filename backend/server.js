const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const routes = require('./routes/routes'); 
const db = require('./config/database'); 
const path = require('path'); 

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, '../frontend')));

// Teste de conexão (Adaptado para Pool)
db.query('SELECT 1', (err, results) => {
  if (err) {
    console.error('Erro crítico no banco de dados:', err);
  } else {
    console.log('Banco de dados conectado com sucesso (Pool)!');
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html')); 
});

app.use('/api', routes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT} (http://localhost:${PORT})`);
  console.log('Acesse a aplicação em http://localhost:3000');
});
const db = require('../config/database');

const usuarios = {
  findAll: (callback) => {
    db.query('SELECT * FROM usuarios', callback);
  },
  findById: (id, callback) => {
    db.query('SELECT * FROM usuarios WHERE id = ?', [id], callback);
  },
  create: (data, callback) => {
    db.query('INSERT INTO usuarios (usuario, senha, nome, nivel_acesso) VALUES (?, ?, ?, ?)', 
      [data.usuario, data.senha, data.nome, data.nivel_acesso], callback);
  },
  update: (id, data, callback) => {
    db.query('UPDATE usuarios SET usuario = ?, senha = ?, nome = ?, nivel_acesso = ? WHERE id = ?', 
      [data.usuario, data.senha, data.nome, data.nivel_acesso, id], callback);
  },
  delete: (id, callback) => {
    db.query('DELETE FROM usuarios WHERE id = ?', [id], callback);
  },
};

const tiposquarto = {
  findAll: (callback) => {
    db.query('SELECT * FROM tiposquarto', callback);
  },
  findById: (id, callback) => {
    db.query('SELECT * FROM tiposquarto WHERE id = ?', [id], callback);
  },
  create: (data, callback) => {
    db.query('INSERT INTO tiposquarto (tipo, descricao, valor_diaria) VALUES (?, ?, ?)', 
      [data.tipo, data.descricao, data.valor_diaria], callback);
  },
  update: (id, data, callback) => {
    db.query('UPDATE tiposquarto SET tipo = ?, descricao = ?, valor_diaria = ? WHERE id = ?', 
      [data.tipo, data.descricao, data.valor_diaria, id], callback);
  },
  delete: (id, callback) => {
    db.query('DELETE FROM tiposquarto WHERE id = ?', [id], callback);
  },
};

const clientes = {
  findAll: (callback) => {
    db.query('SELECT * FROM clientes', callback);
  },
  findById: (id, callback) => {
    db.query('SELECT * FROM clientes WHERE id = ?', [id], callback);
  },
  findByCpf: (cpf, callback) => {
    const cleanCpf = (cpf || '').toString().replace(/\D/g, '');
    db.query(
      "SELECT * FROM clientes WHERE REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') = ?",
      [cleanCpf],
      callback
    );
  },
  findByPassaporte: (passaporte, callback) => {
    db.query('SELECT * FROM clientes WHERE passaporte = ?', [passaporte], callback);
  },
  create: (data, callback) => {
    db.query(
      'INSERT INTO clientes (cpf, passaporte, nome, telefone, email, endereco, cep, data_nascimento, nacionalidade) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
      [data.cpf, data.passaporte, data.nome, data.telefone, data.email, data.endereco, data.cep, data.data_nascimento, data.nacionalidade], 
      callback
    );
  },
  update: (id, data, callback) => {
    clientes.updateById(id, data, callback);
  },
  updateById: (id, data, callback) => {
    db.query(
      'UPDATE clientes SET nome = ?, telefone = ?, email = ?, endereco = ?, cep = ?, passaporte = ?, data_nascimento = ?, nacionalidade = ? WHERE id = ?', 
      [data.nome, data.telefone, data.email, data.endereco, data.cep, data.passaporte, data.data_nascimento, data.nacionalidade, id], 
      callback
    );
  },
  delete: (cpf, callback) => {
    const cleanCpf = (cpf || '').toString().replace(/\D/g, '');
    db.query(
      "DELETE FROM clientes WHERE REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') = ?",
      [cleanCpf],
      callback
    );
  },
  deleteById: (id, callback) => {
    db.query('DELETE FROM clientes WHERE id = ?', [id], callback);
  },
};

const quartos = {
  findAll: (callback) => {
    db.query('SELECT * FROM quartos', callback);
  },
  findByNumero: (numero, callback) => {
    db.query('SELECT * FROM quartos WHERE numero = ?', [numero], callback);
  },
  create: (data, callback) => {
    const status = data.status || 'disponivel';
    db.query(
      'INSERT INTO quartos (numero, tipo_id, descricao, valor_diaria, status) VALUES (?, ?, ?, ?, ?)',
      [data.numero, data.tipo_id, data.descricao, data.valor_diaria, status],
      callback
    );
  },
  update: (numero, dados, cb) => {
    db.query(
      `UPDATE quartos SET tipo_id = ?, status = ?, descricao = ?, valor_diaria = ? WHERE numero = ?`,
      [dados.tipo_id, dados.status, dados.descricao, dados.valor_diaria, numero],
      cb
    );
  },
  delete: (numero, callback) => {
    db.query('DELETE FROM quartos WHERE numero = ?', [numero], callback);
  },
};

const reservas = {
  findAll: (callback) => {
    db.query('SELECT * FROM reservas', callback);
  },
  findByQuarto: (quarto_numero, cb) => {
    db.query('SELECT * FROM reservas WHERE quarto_numero = ?', [quarto_numero], cb);
  },
  create: (data, callback) => {
    db.query('INSERT INTO reservas (quarto_numero, cliente_cpf, data_inicio, data_fim, valor_total) VALUES (?, ?, ?, ?, ?)', 
      [data.quarto_numero, data.cliente_cpf, data.data_inicio, data.data_fim, data.valor_total], callback);
  },
  update: (id, data, callback) => {
    db.query('UPDATE reservas SET quarto_numero = ?, cliente_cpf = ?, data_inicio = ?, data_fim = ?, valor_total = ? WHERE id = ?', 
      [data.quarto_numero, data.cliente_cpf, data.data_inicio, data.data_fim, data.valor_total, id], callback);
  },
  delete: (id, cb) => {
    db.query('DELETE FROM reservas WHERE id = ?', [id], cb);
  },
};

const consumos = {
  findAll: (callback) => {
    db.query('SELECT * FROM consumos', callback);
  },
  findByReserva: (reserva_id, cb) => {
    db.query('SELECT * FROM consumos WHERE reserva_id = ?', [reserva_id], cb);
  },
  create: (data, callback) => {
    db.query('INSERT INTO consumos (reserva_id, descricao, valor) VALUES (?, ?, ?)', 
      [data.reserva_id, data.descricao, data.valor], callback);
  },
  update: (id, data, callback) => {
    db.query('UPDATE consumos SET reserva_id = ?, descricao = ?, valor = ? WHERE id = ?', 
      [data.reserva_id, data.descricao, data.valor, id], callback);
  },
  delete: (id, cb) => {
    db.query('DELETE FROM consumos WHERE id = ?', [id], cb);
  },
};

module.exports = {
  usuarios,
  tiposquarto,
  clientes,
  quartos,
  reservas,
  consumos,
};

async function carregarHospedesAtivos() {
  const tbody = document.getElementById("ativos-tbody");
  tbody.innerHTML = '<tr><td colspan="9">Carregando...</td></tr>';
  const resp = await fetch("/api/hospedes-ativos");
  const dados = await resp.json();
  if (!Array.isArray(dados) || dados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9">Nenhum hóspede ativo</td></tr>';
    return;
  }
  tbody.innerHTML = "";
  dados.forEach((item) => {
    tbody.innerHTML += `
      <tr>
        <td>${item.cpf}</td>
        <td>${item.nome}</td>
        <td>${item.quarto}</td>
        <td>${item.tipo_quarto}</td>
        <td>${item.hora}</td>
        <td>${item.telefone}</td>
        <td>${item.email}</td>
        <td>R$${item.valor_diaria}</td>
        <td>${item.motivo_hospedagem || 'Sem motivo informado'}</td>
      </tr>
    `;
  });
}

// Exemplo de função para buscar cliente por CPF ou passaporte
function buscarCliente({ cpf, passaporte, id }, callback) {
  let sql = "SELECT * FROM clientes WHERE ";
  let params = [];
  if (id) {
    sql += "id = ?";
    params.push(id);
  } else if (cpf) {
    sql += "cpf = ?";
    params.push(cpf);
  } else if (passaporte) {
    sql += "passaporte = ?";
    params.push(passaporte);
  } else {
    return callback(new Error("Informe CPF, passaporte ou id"));
  }
  db.query(sql, params, (err, results) => {
    if (err) return callback(err);
    callback(null, results[0]);
  });
}
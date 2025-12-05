const express = require("express");
const {
  usuarios,
  clientes,
  quartos,
  tiposquarto,
  reservas,
  consumos,
} = require("../models/models");
const db = require("../config/database");
const { comparePassword, generateToken, requireAuth, requireAdmin, requireAdminOrGerente } = require("../security");

const router = express.Router();

// Login com JWT e bcrypt
router.post("/login", async (req, res) => {
  const { usuario, senha } = req.body;

  if (!usuario || !senha) {
    return res.status(400).json({ message: "Usuário e senha são obrigatórios" });
  }

  usuarios.findAll((err, results) => {
    if (err) {
      return res.status(500).json({ message: "Erro no servidor", error: err });
    }

    const user = results.find((u) => u.usuario === usuario);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Comparar senha (com bcrypt ou plaintext para compatibilidade)
    const isPasswordValid = 
      (user.senha && senha === user.senha) || 
      (user.senha_hash && require('bcryptjs').compareSync(senha, user.senha_hash));

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Senha incorreta" });
    }

    // Gerar token JWT
    const token = generateToken(user);
    const userData = {
      id: user.id,
      usuario: user.usuario,
      nome: user.nome,
      nivel_acesso: user.nivel_acesso,
    };

    res.status(200).json({ 
      message: "Login realizado com sucesso", 
      token,
      user: userData 
    });
  });
});

router.get("/clientes", (req, res) => {
  clientes.findAll((err, results) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Erro ao buscar clientes", error: err });
    res.json(results);
  });
});

router.post("/clientes", (req, res) => {
  let { cpf, passaporte, nome, telefone, email, endereco, cep, data_nascimento, nacionalidade } = req.body;

  // Função utilitária para converter string vazia ou nula para NULL do SQL
  const toNull = (value) => (value && String(value).trim() !== "" ? value : null);

  // 1. Validação Obrigatória
  if (!cpf && !passaporte) {
    return res.status(400).json({ message: "Preencha CPF ou Passaporte!" });
  }

  // 2. Aplica o tratamento de NULLs para todos os campos
  const params = [
    toNull(cpf),
    toNull(passaporte),
    nome, // Presumimos que 'nome' é obrigatório (NOT NULL)
    toNull(telefone),
    toNull(email),
    toNull(endereco),
    toNull(cep),
    toNull(data_nascimento),
    toNull(nacionalidade),
  ];

  const sql = `
    INSERT INTO clientes (cpf, passaporte, nome, telefone, email, endereco, cep, data_nascimento, nacionalidade)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("Erro ao cadastrar cliente:", err);
      // CORREÇÃO: Trata o erro de duplicidade (ER_DUP_ENTRY: 1062)
      if (err.errno === 1062) {
         // Retorna 409 Conflict para o frontend, que exibirá a mensagem no alert.
         return res.status(409).json({ message: "Erro: CPF ou Passaporte já cadastrado para outro cliente." });
      }
      // Trata outros erros 500 (como problemas de conexão ou de tipagem no DB)
      return res.status(500).json({ message: "Erro interno ao cadastrar cliente. Verifique o console do servidor para detalhes.", error: err });
    }
    res.status(201).json({ message: "Cliente cadastrado com sucesso", result });
  });
});

router.get("/clientes/:id", (req, res) => {
  const { cpf } = req.params;
  clientes.findByCpf(cpf, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Erro ao buscar cliente", error: err });
    }
    if (!result || result.length === 0) {
      return res.status(404).json({ message: "Cliente não encontrado" });
    }
    res.status(200).json(result[0]);
  });
});

// Nova rota específica para buscar cliente por passaporte (evita conflito com rota por CPF)
router.get("/clientes/passaporte/:passaporte", (req, res) => {
  const { passaporte } = req.params;
  clientes.findByPassaporte(passaporte, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Erro ao buscar cliente por passaporte", error: err });
    }
    if (!result || result.length === 0) {
      return res.status(404).json({ message: "Cliente não encontrado" });
    }
    res.status(200).json(result[0]);
  });
});

router.get("/clientes/cpf/:cpf", (req, res) => {
  const { cpf } = req.params;
  clientes.findByCpf(cpf, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Erro ao buscar cliente por CPF", error: err });
    }
    if (!result || result.length === 0) {
      return res.status(404).json({ message: "Cliente não encontrado" });
    }
    res.status(200).json(result[0]);
  });
});

// A rota PUT correta: Atualizar cliente por ID
router.put("/clientes/:id", (req, res) => {
  const id = req.params.id;
  const {
    cpf,
    passaporte,
    nome,
    telefone,
    email,
    endereco,
    cep,
    data_nascimento,
    nacionalidade
  } = req.body;

  // Adicionando validação para garantir que pelo menos um dos identificadores está presente.
  if (!cpf && !passaporte) {
    return res.status(400).json({ message: "O CPF ou Passaporte não pode estar vazio." });
  }

  const sql = `
    UPDATE clientes SET
      cpf = ?,
      passaporte = ?,
      nome = ?,
      telefone = ?,
      email = ?,
      endereco = ?,
      cep = ?,
      data_nascimento = ?,
      nacionalidade = ?
    WHERE id = ?
  `;
  db.query(
    sql,
    [
      cpf,
      passaporte,
      nome,
      telefone,
      email,
      endereco,
      cep,
      data_nascimento,
      nacionalidade,
      id
    ],
    (err, result) => {
      if (err) {
        console.error("Erro ao atualizar cliente no DB:", err);
        // ER_DUP_ENTRY (1062) - Se CPF/Passaporte for duplicado
        if (err.errno === 1062) {
          return res.status(409).json({ message: "Erro: CPF ou Passaporte já cadastrado para outro cliente." });
        }
        return res.status(500).json({ message: "Erro ao atualizar cliente", error: err });
      }
      
      if (result.affectedRows === 0) {
        // Retorna sucesso se 0 rows afetadas, mas o cliente foi encontrado (pode ser que nenhum dado mudou)
        // O cliente.html confere se response.ok é verdadeiro
        return res.json({ message: "Cliente atualizado com sucesso", result });
      }
      
      res.json({ message: "Cliente atualizado com sucesso", result });
    }
  );
});

// Rota Antiga para deleção por CPF foi removida.
// A rota abaixo é a correta, pois usa o ID do cliente e lida com chaves estrangeiras.

// Novo: Rota para deletar cliente por ID (Acessada pelo frontend/clientes.html)
router.delete("/clientes/:id", (req, res) => {
  const id = req.params.id;
  clientes.deleteById(id, (err, result) => {
    if (err) {
      // 1451: ER_ROW_IS_REFERENCED_2 (Erro de integridade referencial - Chave Estrangeira)
      if (err.code === "ER_ROW_IS_REFERENCED_2" || err.errno === 1451) {
        return res.status(400).json({ // Retorna 400 Bad Request
          message: "Não é possível excluir o cliente: Existem reservas ou check-ins ativos/anteriores ligados a este registro. Exclua as reservas ou check-ins primeiro.",
          error: err
        });
      }
      return res.status(500).json({ message: "Erro ao deletar cliente", error: err });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Cliente não encontrado" });
    }
    res.json({ message: "Cliente deletado com sucesso" });
  });
});


// Listar todos os quartos
router.get("/quartos", (req, res) => {
  db.query(
    `SELECT q.numero, tq.tipo, q.tipo_id, q.descricao, 
            COALESCE(q.valor_diaria, tq.valor_diaria) as valor_diaria, 
            q.status
     FROM quartos q
     JOIN tiposquarto tq ON q.tipo_id = tq.id`, // Adicionado q.tipo_id aqui
    (err, results) => {
      if (err)
        return res
          .status(500)
          .json({ message: "Erro ao buscar quartos", error: err });
      res.json(results);
    }
  );
});

// Buscar quarto por número
router.get("/quartos/:numero", (req, res) => {
  const { numero } = req.params;
  quartos.findByNumero(numero, (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Erro ao buscar quarto", error: err });
    }
    if (!result || result.length === 0) {
      return res.status(404).json({ message: "Quarto não encontrado" });
    }
    res.status(200).json(result[0]);
  });
});

// Criar novo quarto
router.post("/quartos", (req, res) => {
  console.log("Dados recebidos no cadastro de quarto:", req.body); // ADICIONE ESTA LINHA
  const { numero, tipo_id, descricao, valor_diaria, status } = req.body;
  if (!numero || !tipo_id || !descricao || !valor_diaria) {
    return res
      .status(400)
      .json({ message: "Preencha todos os campos obrigatórios!" });
  }
  quartos.create(
    { numero, tipo_id, descricao, valor_diaria, status },
    (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Erro ao cadastrar quarto", error: err });
      }
      res
        .status(201)
        .json({ message: "Quarto cadastrado com sucesso", result });
    }
  );
});

// Atualizar quarto por número
router.put("/quartos/:numero", (req, res) => {
  const { numero } = req.params;
  const { tipo_id, status, descricao, valor_diaria } = req.body;
  if (!tipo_id || !status || !descricao || !valor_diaria) {
    return res
      .status(400)
      .json({ message: "Preencha todos os campos obrigatórios!" });
  }
  quartos.update(
    numero,
    { tipo_id, status, descricao, valor_diaria },
    (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Erro ao atualizar quarto", error: err });
      }
      res
        .status(200)
        .json({ message: "Quarto atualizado com sucesso", result });
    }
  );
});

// Deletar quarto por número
router.delete("/quartos/:numero", (req, res) => {
  const { numero } = req.params;
  quartos.delete(numero, (err, result) => {
    if (err) {
      // Erro de integridade referencial (MySQL/MariaDB)
      if (err.code === "ER_ROW_IS_REFERENCED_2" || err.errno === 1451) {
        return res.status(400).json({
          message:
            "Não é possível excluir: existem reservas ou consumos ligados a este quarto.",
        });
      }
      return res
        .status(500)
        .json({ message: "Erro ao excluir quarto", error: err });
    }
    res.status(200).json({ message: "Quarto excluído com sucesso", result });
  });
});

// Chegadas do dia (check-in) - Disponível para usuários autenticados
router.get("/checkins-hoje", requireAuth, (req, res) => {
  // Usa data local (evita virar o dia por causa do fuso ao usar toISOString/UTC)
  const hoje = (() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  })();
  db.query(
    `SELECT c.cpf, c.passaporte, c.nome, q.numero as quarto, tq.tipo as tipo_quarto, 
            r.hora_checkin as hora, c.telefone, c.email, 
            COALESCE(r.valor_diaria, r.valor_diaria_base, q.valor_diaria, tq.valor_diaria) as valor_diaria,
            r.motivo_hospedagem
     FROM reservas r
     JOIN clientes c ON r.cliente_id = c.id
     JOIN quartos q ON r.quarto_numero = q.numero
     JOIN tiposquarto tq ON q.tipo_id = tq.id
     WHERE DATE(r.data_checkin) = ? AND r.status = 'ativo'`,
    [hoje],
    (err, results) => {
      if (err) {
        console.error("Erro ao buscar check-ins:", err);
        return res
          .status(500)
          .json({ message: "Erro ao buscar check-ins", error: err });
      }
      res.json(results);
    }
  );
});

// Saídas do dia (check-out) - Disponível para usuários autenticados
router.get("/checkouts-hoje", requireAuth, (req, res) => {
  // Usa data local (evita virar o dia por causa do fuso ao usar toISOString/UTC)
  const hoje = (() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  })();
  db.query(
    `SELECT c.cpf, c.passaporte, c.nome, q.numero as quarto, tq.tipo as tipo_quarto, 
            r.hora_checkout as hora, c.telefone, c.email, 
            COALESCE(r.valor_diaria, r.valor_diaria_base, q.valor_diaria, tq.valor_diaria) as valor_diaria,
            r.motivo_hospedagem
     FROM reservas r
     JOIN clientes c ON r.cliente_id = c.id
     JOIN quartos q ON r.quarto_numero = q.numero
     JOIN tiposquarto tq ON q.tipo_id = tq.id
     WHERE DATE(r.data_checkout) = ?`,
    [hoje],
    (err, results) => {
      if (err)
        return res
          .status(500)
          .json({ message: "Erro ao buscar check-outs", error: err });
      res.json(results);
    }
  );
});

// Listar tipos de quarto
router.get("/tipos-quarto", (req, res) => {
  tiposquarto.findAll((err, results) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Erro ao buscar tipos", error: err });
    res.json(results);
  });
});

// Criar novo tipo de quarto
router.post("/tipos-quarto", (req, res) => {
  const { tipo, descricao, valor_diaria } = req.body;
  tiposquarto.create({ tipo, descricao, valor_diaria }, (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Erro ao criar tipo", error: err });
    res.status(201).json({ message: "Tipo criado", result });
  });
});

// Deletar tipo de quarto por ID
router.delete("/tipos-quarto/:id", (req, res) => {
  const { id } = req.params;

  // Antes de excluir, verificar se há quartos associados a este tipo
  db.query(
    "SELECT COUNT(*) AS total FROM quartos WHERE tipo_id = ?",
    [id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao verificar dependências", error: err });
      }
      const { total } = rows[0];
      if (total > 0) {
        return res.status(400).json({
          message: "Não é possível excluir este tipo de quarto: existem quartos cadastrados usando este tipo.",
        });
      }

      tiposquarto.delete(id, (delErr, result) => {
        if (delErr) {
          // Integridade referencial
          if (delErr.code === "ER_ROW_IS_REFERENCED_2" || delErr.errno === 1451) {
            return res.status(400).json({
              message: "Não é possível excluir este tipo: existem registros relacionados.",
            });
          }
          return res.status(500).json({ message: "Erro ao excluir tipo de quarto", error: delErr });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Tipo de quarto não encontrado" });
        }
        res.status(200).json({ message: "Tipo de quarto excluído com sucesso" });
      });
    }
  );
});

router.post("/checkin", (req, res) => {
  const {
    cliente_cpf,
    cliente_passaporte, 
    quarto_numero,
    data_checkin,
    hora_checkin,
    valor_diaria,
    motivo_hospedagem,
    nomes_acompanhantes,
    cpfs_acompanhantes,
    passaportes_acompanhantes,
    nascimentos_acompanhantes,
    data_checkout_prevista,
    hora_checkout_prevista,
    ignorar_reserva_ativa,
    pago_booking
  } = req.body;

  // CORREÇÃO DE VALIDAÇÃO: Verifica se há CPF OU Passaporte
  if (
    (!cliente_cpf && !cliente_passaporte) || 
    !quarto_numero ||
    !data_checkin ||
    !hora_checkin ||
    !valor_diaria
  ) {
    return res
      .status(400)
      .json({ message: "Preencha todos os campos obrigatórios! (CPF/Passaporte do Cliente, Quarto, Datas/Horas e Valor da Diária)" });
  }
  
  // PASSO 1: Buscar o ID do cliente a partir do CPF OU Passaporte
  db.query(
    // CORREÇÃO DE QUERY: Usa as variáveis cliente_cpf e cliente_passaporte corretamente
    `SELECT id FROM clientes WHERE cpf = ? OR passaporte = ?`,
    [cliente_cpf, cliente_passaporte], 
    (idErr, idResults) => {
      if (idErr) {
        console.error("Erro ao buscar ID do cliente:", idErr);
        return res.status(500).json({ message: "Erro interno ao buscar dados do cliente.", error: idErr });
      }
      if (idResults.length === 0) {
        return res.status(404).json({ message: "Cliente não encontrado. Certifique-se de que o CPF/Passaporte está cadastrado." });
      }
      const cliente_id = idResults[0].id; // ID do cliente obtido

      db.query(
        `SELECT id FROM reservas WHERE quarto_numero = ? AND status = 'ativo'`,
        [quarto_numero],
        (err, results) => {
          if (err)
            return res
              .status(500)
              .json({ message: "Erro ao verificar reservas do quarto", error: err });
          if (results.length > 0) {
            return res
              .status(400)
              .json({ message: "Já existe uma reserva ativa para este quarto." });
          }

          // PASSO 3: Verificar reserva ativa para o cliente (AGORA USANDO CLIENTE_ID)
          db.query(
            `SELECT id FROM reservas WHERE cliente_id = ? AND status = 'ativo'`,
            [cliente_id],
            (err2, results2) => {
              if (err2)
                return res.status(500).json({
                  message: "Erro ao verificar reservas do cliente",
                  error: err2,
                });
              if (results2.length > 0 && !ignorar_reserva_ativa) {
                return res.status(409).json({
                  message:
                    "Este cliente já possui uma reserva ativa. Deseja realizar outra mesmo assim?",
                  precisa_confirmar: true,
                });
              }

              // PASSO 4: Inserir a nova reserva (AGORA USANDO CLIENTE_ID)
              db.query(
                `INSERT INTO reservas 
     (cliente_id, quarto_numero, data_checkin, hora_checkin, valor_diaria, valor_diaria_base, motivo_hospedagem, data_checkout_prevista, hora_checkout_prevista, status, pago_booking)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo', ?)`, 
                [
                  cliente_id, 
                  quarto_numero,
                  data_checkin,
                  hora_checkin,
                  valor_diaria,
                  valor_diaria, // salva o valor base (mesmo valor)
                  motivo_hospedagem || null,
                  data_checkout_prevista || null,
                  hora_checkout_prevista || null,
                  pago_booking || 0 // Agora este parâmetro corresponde ao '?'
                ],
                (err, result) => {
                  if (err) {
                    console.error("Erro ao registrar check-in:", err);
                    return res
                      .status(500)
                      .json({ message: "Erro ao registrar check-in", error: err });
                  }

                  const reservaId = result.insertId;

                  db.query(
                    `UPDATE quartos SET status = 'ocupado' WHERE numero = ?`,
                    [quarto_numero],
                    async (err2) => {
                      if (err2)
                        return res.status(500).json({
                          message: "Erro ao atualizar status do quarto",
                          error: err2,
                        });

                      // Verifica se existem acompanhantes para registrar
                      if (nomes_acompanhantes && nomes_acompanhantes.length > 0) {
                        const acompanhantesData = nomes_acompanhantes.map(
                          (nome, index) => [
                            reservaId,
                            nome,
                            cpfs_acompanhantes[index] || null, // Pega o CPF correspondente
                            passaportes_acompanhantes[index] || null, // Pega o Passaporte correspondente
                            nascimentos_acompanhantes[index] || null, // Pega a data de nascimento correspondente
                          ]
                        );
                        db.query(
                          `INSERT INTO acompanhantes (reserva_id, nome, cpf, passaporte, data_nascimento) VALUES ?`,
                          [acompanhantesData],
                          (err3) => {
                            if (err3) {
                              console.error("Erro ao registrar acompanhantes:", err3);
                              return res.status(500).json({
                                message: "Erro ao registrar acompanhantes",
                                error: err3,
                              });
                            }
                            return res.status(201).json({
                              message: "Check-in registrado com sucesso",
                              result: {
                                ...result,
                                acompanhantes_adicionados: acompanhantesData.length,
                                reserva_id: reservaId,
                              },
                            });
                          }
                        );
                      } else {
                        res.status(201).json({
                          message: "Check-in registrado com sucesso",
                          result: {
                            ...result,
                            reserva_id: reservaId,
                          },
                        });
                      }
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

// PUT /api/checkout/:id - Registrar check-out
router.put("/checkout/:id", (req, res) => {
  const { id } = req.params;
  const { data_checkout, hora_checkout } = req.body;

  if (!data_checkout || !hora_checkout) {
    return res
      .status(400)
      .json({ message: "Preencha data e hora do check-out!" });
  }

  // Buscar dados da reserva (valor atual e base)
  db.query(
    `SELECT quarto_numero, valor_diaria_base, valor_diaria FROM reservas WHERE id = ?`,
    [id],
    (errGet, rows) => {
      if (errGet) return res.status(500).json({ message: 'Erro ao buscar reserva', error: errGet });
      if (!rows.length) return res.status(404).json({ message: 'Reserva não encontrada' });

      const reserva = rows[0];
      const valorFinal = reserva.valor_diaria ?? reserva.valor_diaria_base ?? 0;

      // Atualizar a reserva com valor final e registrar checkout
      db.query(
        `UPDATE reservas SET data_checkout = ?, hora_checkout = ?, status = 'finalizado', valor_diaria = ? WHERE id = ?`,
        [data_checkout, hora_checkout, valorFinal, id],
        (errUpdate) => {
          if (errUpdate) return res.status(500).json({ message: 'Erro ao registrar check-out', error: errUpdate });

          // Atualize o status do quarto
          db.query(
            `UPDATE quartos SET status = 'disponivel' WHERE numero = (SELECT quarto_numero FROM reservas WHERE id = ?)`,
            [id],
            (err2) => {
              if (err2) {
                console.error('Erro ao atualizar status do quarto:', err2);
              }

              return res.status(200).json({
                message: 'Check-out registrado com sucesso',
                calculo: {
                  valor_diaria_final: valorFinal
                }
              });
            }
          );
        }
      );
    }
  );
});

// GET /api/reservas?futuras=1&quarto_numero=...
router.get("/reservas", (req, res) => {
  const { futuras, quarto_numero } = req.query;
let sql = `
    SELECT c.nome, c.cpf AS cliente_cpf, c.passaporte AS cliente_passaporte, -- ADICIONADO: CPF e Passaporte do Cliente
           r.quarto_numero as quarto, 
           DATE_FORMAT(r.data_checkin, '%d/%m/%Y') as data_entrada,
           DATE_FORMAT(r.hora_checkin, '%H:%i') as hora_entrada,
           DATE_FORMAT(IFNULL(r.data_checkout, r.data_checkout_prevista), '%d/%m/%Y') as data_saida,
           DATE_FORMAT(IFNULL(r.hora_checkout, r.hora_checkout_prevista), '%H:%i') as hora_saida,
           r.status,
           r.motivo_hospedagem,
           r.id,
           (SELECT COUNT(*) FROM acompanhantes WHERE reserva_id = r.id) AS num_acompanhantes,
           (SELECT COALESCE(JSON_ARRAYAGG(
             JSON_OBJECT('nome', nome, 'cpf', cpf, 'passaporte', passaporte, 'data_nascimento', data_nascimento) -- ALTERADO: Inclui 'passaporte' do acompanhante
           ), '[]') FROM acompanhantes WHERE reserva_id = r.id) AS acompanhantes
    FROM reservas r
    JOIN clientes c ON r.cliente_id = c.id
  `;
  let params = [];
  let conditions = [];

  if (futuras) {
    conditions.push(`r.data_checkout_prevista >= CURDATE() AND r.status = 'ativo'`);
  }

  if (quarto_numero) {
    conditions.push(`r.quarto_numero = ?`);
    params.push(quarto_numero);
  }
  
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  
  sql += ' GROUP BY r.id ORDER BY r.data_checkin DESC';

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Erro ao buscar reservas", error: err });
    }
    // O MySQL retorna o campo JSON como uma string, então precisamos convertê-lo
    const parsedResults = results.map(row => ({
        ...row,
        acompanhantes: JSON.parse(row.acompanhantes)
    }));
    res.json(parsedResults);
  });
});

// GET /api/reserva-ativa/:cpf (Onde :cpf agora representa CPF ou Passaporte)
router.get("/reserva-ativa/:cpf", (req, res) => {
  const identifier = req.params.cpf;

  db.query(
    // Procura na coluna CPF OU na coluna Passaporte
    `SELECT id FROM clientes WHERE cpf = ? OR passaporte = ?`,
    [identifier, identifier],
    (errId, resultId) => {
      if (errId) {
        console.error("Erro ao buscar cliente por identificador:", errId);
        return res.status(500).json({ message: "Erro interno ao buscar dados do cliente.", error: errId });
      }
      if (resultId.length === 0) {
        return res.status(404).json({ message: "Cliente não encontrado." });
      }

      const cliente_id = resultId[0].id;
      db.query(
  `SELECT r.*, c.nome, c.telefone, c.email, c.cep, c.endereco, q.numero as quarto, tq.valor_diaria AS tq_valor_diaria
         FROM reservas r
         JOIN clientes c ON r.cliente_id = c.id
         JOIN quartos q ON r.quarto_numero = q.numero
         JOIN tiposquarto tq ON q.tipo_id = tq.id
         WHERE r.cliente_id = ? AND r.status = 'ativo'
         ORDER BY r.data_checkin DESC LIMIT 1`,
        [cliente_id], 
        (err, results) => {
          if (err)
            return res
              .status(500)
              .json({ message: "Erro ao buscar reserva ativa", error: err });
          if (!results.length)
            return res
              .status(404)
              .json({ message: "Nenhuma reserva ativa encontrada para este cliente." });

          // Calcular valor final com taxa (se houver acompanhantes e taxa)
          const reserva = results[0];
          const valorBase = reserva.valor_diaria_base || reserva.valor_diaria || reserva.tq_valor_diaria || 0;
          // Sem cobrança de taxa de acompanhante: o valor final é o próprio valor da diária armazenado
          res.json({ 
            ...reserva, 
            valor_diaria_final: reserva.valor_diaria || valorBase
          });
        }
      );
    }
  );
});


// Rota para calendário de ocupação dos quartos (VERSÃO PROFISSIONAL COM DADOS PARA TOOLTIP)
// Rota para calendário de ocupação dos quartos (VERSÃO PROFISSIONAL COM DADOS PARA TOOLTIP)
router.get("/ocupacao-quartos", (req, res) => {
  const { inicio, fim } = req.query;
  if (!inicio || !fim) {
    return res.status(400).json({ message: "É necessário fornecer data de início e fim." });
  }

  const sql = `
    SELECT
      r.quarto_numero,
      r.data_checkin,
      -- Data de saída REAL para ser exibida no tooltip (ex: 18/10)
      IFNULL(r.data_checkout, r.data_checkout_prevista) as data_saida_real,
      -- Data de saída para a LÓGICA do frontend. A lógica do Gantt (com colspan)
      -- usa uma comparação "menor que", então esta data já está correta.
      CASE
        WHEN DATE(IFNULL(r.data_checkout, r.data_checkout_prevista)) <= DATE(r.data_checkin)
        THEN DATE_ADD(DATE(r.data_checkin), INTERVAL 1 DAY)
        ELSE IFNULL(r.data_checkout, r.data_checkout_prevista)
      END as data_saida_visual,
      c.nome as cliente
    FROM reservas r
    JOIN clientes c ON r.cliente_id = c.id
    WHERE
      r.status IN ('ativo', 'finalizado') AND
      r.data_checkin <= ? AND
      IFNULL(r.data_checkout, r.data_checkout_prevista) >= ?
  `;

  db.query(sql, [fim, inicio], (err, results) => {
    if (err) {
      console.error("Erro na busca de ocupação:", err);
      return res.status(500).json({ message: "Erro ao buscar ocupação", error: err });
    }
    res.json(results);
  });
});
// Modelo básico para produtos (adicione em models/models.js)
const produtos = {
  findAll: (callback) => {
    db.query("SELECT * FROM produtos", callback);
  },
  create: (data, callback) => {
    db.query(
      "INSERT INTO produtos (nome, preco_unitario, estoque) VALUES (?, ?, ?)",
      [data.nome, data.preco, data.estoque],
      callback
    );
  },
  update: (id, data, callback) => {
    db.query(
      "UPDATE produtos SET nome = ?, preco_unitario = ?, estoque = ? WHERE id = ?",
      [data.nome, data.preco, data.estoque, id],
      callback
    );
  },
  delete: (id, callback) => {
    db.query("DELETE FROM produtos WHERE id = ?", [id], callback);
  },
};

// Rotas para produtos
router.get("/produtos", (req, res) => {
  db.query("SELECT * FROM produtos", (err, results) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Erro ao buscar produtos", error: err });
    res.json(results);
  });
});

router.post("/produtos", (req, res) => {
  const { nome, preco, estoque } = req.body;
  if (!nome || !preco || !estoque) {
    return res.status(400).json({ message: "Preencha todos os campos!" });
  }
  produtos.create({ nome, preco, estoque }, (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Erro ao cadastrar produto", error: err });
    res.status(201).json({ message: "Produto cadastrado com sucesso", result });
  });
});
  router.put("/produtos/:id", (req, res) => {
  const { id } = req.params;
  const { nome, preco, estoque } = req.body; // 'preco' vem do body

  if (!nome || preco === undefined || estoque === undefined) {
    return res.status(400).json({ message: "Preencha todos os campos!" });
  }

  produtos.update(id, { nome, preco, estoque }, (err, result) => {
    if (err) {
      console.error("Erro ao atualizar produto:", err);
      return res
        .status(500)
        .json({ message: "Erro ao atualizar produto", error: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Produto não encontrado" });
    }
    res
      .status(200)
      .json({ message: "Produto atualizado com sucesso", result });
  });
});
router.delete("/produtos/:id", (req, res) => {
  produtos.delete(req.params.id, (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Erro ao deletar produto", error: err });
    res.status(200).json({ message: "Produto deletado com sucesso", result });
  });
});

async function realizarCheckout(reservaId, data_checkout, hora_checkout) {
  const resp = await fetch(`/api/checkout/${reservaId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data_checkout, hora_checkout }),
  });
  if (resp.ok) {
    alert("Checkout realizado com sucesso!");
    // Atualize a tela, redirecione, etc.
  } else {
    alert("Erro ao realizar checkout");
  }
}

// Listar consumos de um quarto
router.get("/consumos/:reserva_id", (req, res) => {
  const { reserva_id } = req.params;
  db.query(
    `SELECT c.*, p.nome as produto_nome 
     FROM consumos c 
     JOIN produtos p ON c.produto_id = p.id 
     WHERE c.reserva_id = ?`,
    [reserva_id],
    (err, results) => {
      if (err)
        return res
          .status(500)
          .json({ message: "Erro ao buscar consumos", error: err });
      res.json(results);
    }
  );
});

// Adicionar consumo a um quarto
router.post("/consumos", (req, res) => {
  const { reserva_id, produto_id, quantidade, preco_unitario } = req.body;
  const quantNum = parseInt(quantidade, 10); // Garantir que a quantidade é um número

  if (!reserva_id || !produto_id || !quantNum || quantNum <= 0 || !preco_unitario) {
    return res.status(400).json({ message: "Dados do consumo inválidos (Verifique a quantidade)!" });
  }

  // 1. Iniciar a transação
  db.beginTransaction((err) => {
    if (err) {
      console.error("Erro ao iniciar transação:", err);
      return res.status(500).json({ message: "Erro ao iniciar transação", error: err });
    }

    // 2. Atualizar o estoque PRIMEIRO (e verificar se há estoque disponível)
    db.query(
      // Esta query só vai subtrair se o estoque (estoque) for >= a quantNum
      "UPDATE produtos SET estoque = estoque - ? WHERE id = ? AND estoque >= ?",
      [quantNum, produto_id, quantNum],
      (errUpdate, resultUpdate) => {
        if (errUpdate) {
          // Se der erro no UPDATE, desfaz a transação
          return db.rollback(() => {
            console.error("Erro ao atualizar estoque:", errUpdate);
            res.status(500).json({ message: "Erro ao atualizar estoque", error: errUpdate });
          });
        }

        // 3. Verificar se o update realmente alterou alguma linha
        if (resultUpdate.affectedRows === 0) {
          // Se não alterou, significa que não havia estoque (estoque < quantNum)
          return db.rollback(() => {
            res.status(400).json({ message: "Erro: Estoque insuficiente para este produto." });
          });
        }

        // 4. Se o estoque foi atualizado, INSERIR o consumo
        db.query(
          "INSERT INTO consumos (reserva_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)",
          [reserva_id, produto_id, quantNum, preco_unitario],
          (errInsert, resultInsert) => {
            if (errInsert) {
              // Se der erro no INSERT, desfaz o UPDATE
              return db.rollback(() => {
                console.error("Erro ao adicionar consumo:", errInsert);
                res.status(500).json({ message: "Erro ao adicionar consumo (estoque será revertido)", error: errInsert });
              });
            }

            // 5. Se tudo deu certo, Confirmar (Commit) a transação
            db.commit((errCommit) => {
              if (errCommit) {
                // Se o commit falhar, desfaz tudo
                return db.rollback(() => {
                  console.error("Erro ao confirmar transação:", errCommit);
                  res.status(500).json({ message: "Erro ao confirmar transação", error: errCommit });
                });
              }
              // Sucesso!
              res.status(201).json({ message: "Consumo adicionado e estoque atualizado", resultInsert });
            });
          }
        );
      }
    );
  });
});

// Nova rota para buscar a reserva ativa de um quarto pelo número
router.get("/reserva-ativa-quarto/:numero", (req, res) => {
  const { numero } = req.params;
  db.query(
    `SELECT r.*, c.nome as nome_cliente 
     FROM reservas r
     JOIN clientes c ON r.cliente_id = c.id
     WHERE r.quarto_numero = ? AND r.status = 'ativo' 
     ORDER BY r.id DESC LIMIT 1`,
    [numero],
    (err, results) => {
      if (err || !results.length)
        return res
          .status(404)
          .json({ message: "Nenhuma reserva ativa encontrada" });
      res.json(results[0]);
    }
  );
});

// Listar reservas de um quarto
router.get("/reservas-por-quarto", (req, res) => {
  const { quarto_numero } = req.query;
  if (!quarto_numero)
    return res.status(400).json({ message: "Informe o número do quarto" });
  reservas.findByQuarto(quarto_numero, (err, reservas) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Erro ao buscar reservas", error: err });
    res.json(reservas);
  });
});

// Excluir reserva
router.delete("/reservas/:id", (req, res) => {
  reservas.delete(req.params.id, (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Erro ao excluir reserva", error: err });
    res.json({ message: "Reserva excluída com sucesso" });
  });
});

// Listar consumos de uma reserva
router.get("/consumos", (req, res) => {
  const { reserva_id } = req.query;
  if (!reserva_id)
    return res.status(400).json({ message: "Informe o id da reserva" });
  consumos.findByReserva(reserva_id, (err, consumos) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Erro ao buscar consumos", error: err });
    res.json(consumos);
  });
});

// Excluir consumo
router.delete("/consumos/:id", (req, res) => {
  consumos.delete(req.params.id, (err, result) => {
    if (err)
      return res
        .status(500)
        .json({ message: "Erro ao excluir consumo", error: err });
    res.json({ message: "Consumo excluído com sucesso" });
  });
});

// Novo: Listar hóspedes ativos
router.get("/hospedes-ativos", requireAuth, (req, res) => {
  const sql = `
    SELECT c.cpf, c.passaporte, c.nome, r.quarto_numero as quarto, tq.tipo as tipo_quarto,
           r.hora_checkin as hora, c.telefone, c.email,
           COALESCE(r.valor_diaria, r.valor_diaria_base, q.valor_diaria, tq.valor_diaria) AS valor_diaria,
           r.motivo_hospedagem
    FROM reservas r
    JOIN clientes c ON r.cliente_id = c.id
    JOIN quartos q ON r.quarto_numero = q.numero
    JOIN tiposquarto tq ON q.tipo_id = tq.id 
    WHERE r.status = 'ativo'
    ORDER BY r.data_checkin DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Erro ao buscar hóspedes ativos:", err);
      return res
        .status(500)
        .json({ message: "Erro ao buscar hóspedes ativos", error: err });
    }
    res.json(results);
  });
});

// Rota para buscar check-outs vencidos
router.get("/checkouts-vencidos", requireAuth, (req, res) => {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  const hora = String(agora.getHours()).padStart(2, '0');
  const minuto = String(agora.getMinutes()).padStart(2, '0');
  const segundo = String(agora.getSeconds()).padStart(2, '0');
  const dataHoraAtual = `${ano}-${mes}-${dia} ${hora}:${minuto}:${segundo}`;

  const sql = `
    SELECT c.cpf, c.passaporte, c.nome, r.quarto_numero as quarto, tq.tipo as tipo_quarto,
           DATE_FORMAT(r.data_checkout_prevista, '%d/%m/%Y') as data_saida_prevista,
           DATE_FORMAT(r.hora_checkout_prevista, '%H:%i') as hora_saida_prevista,
           c.telefone, c.email
    FROM reservas r
    JOIN clientes c ON r.cliente_id = c.id
    JOIN quartos q ON r.quarto_numero = q.numero
    JOIN tiposquarto tq ON q.tipo_id = tq.id 
    WHERE r.status = 'ativo' AND CONCAT(r.data_checkout_prevista, ' ', r.hora_checkout_prevista) < ?
    ORDER BY r.data_checkout_prevista, r.hora_checkout_prevista ASC
  `;

  db.query(sql, [dataHoraAtual], (err, results) => {
    if (err) {
      console.error("Erro ao buscar check-outs vencidos:", err);
      return res.status(500).json({ message: "Erro ao buscar check-outs vencidos", error: err });
    }
    res.json(results);
  });
});

// Função utilitária para buscar cliente por CPF ou passaporte
function buscarCliente({ cpf, passaporte }, callback) {
  let sql = "SELECT * FROM clientes WHERE ";
  let params = [];
  if (cpf) {
    sql += "cpf = ?";
    params.push(cpf);
  } else if (passaporte) {
    sql += "passaporte = ?";
    params.push(passaporte);
  } else {
    return callback(new Error("Informe CPF ou passaporte"));
  }
  db.query(sql, params, (err, results) => {
    if (err) return callback(err);
    callback(null, results[0]);
  });
}

// Rota para criar reserva usando cliente_id
router.post("/reservas", (req, res) => {
  const {
    cpf,
    passaporte,
    quarto_numero,
    data_checkin,
    hora_checkin,
    valor_diaria,
    motivo_hospedagem,
    data_checkout_prevista,
    hora_checkout_prevista,
    desconto,
    status
  } = req.body;

  buscarCliente({ cpf, passaporte }, (err, cliente) => {
    if (err || !cliente) return res.status(400).json({ message: "Cliente não encontrado" });

    db.query(
      `INSERT INTO reservas (
        quarto_numero, cliente_id, data_checkin, hora_checkin, valor_diaria, valor_diaria_base, motivo_hospedagem, data_checkout_prevista, hora_checkout_prevista, desconto, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        quarto_numero,
        cliente.id,
        data_checkin,
        hora_checkin,
        valor_diaria,
        valor_diaria, // salva o base
        motivo_hospedagem || null,
        data_checkout_prevista || null,
        hora_checkout_prevista || null,
        desconto || 0,
        status || 'ativo'
      ],
      (err, result) => {
        if (err) return res.status(500).json({ message: "Erro ao criar reserva", error: err });
        res.status(201).json({ message: "Reserva criada com sucesso", result });
      }
    );
  });
});

// (cliente update route defined earlier)

// (clientes listing route defined earlier)

// ===== ROTAS DE GERENCIAMENTO DE USUÁRIOS (ADMIN ONLY) =====

// GET /usuarios - Listar todos os usuários (apenas admin e gerente)
router.get("/usuarios", requireAuth, requireAdminOrGerente, (req, res) => {
  usuarios.findAll((err, results) => {
    if (err) {
      return res.status(500).json({ message: "Erro ao buscar usuários", error: err });
    }
    
    // Não retornar senhas
    const usuariosSafeList = results.map(u => ({
      id: u.id,
      usuario: u.usuario,
      nome: u.nome,
      nivel_acesso: u.nivel_acesso
    }));
    
    res.json(usuariosSafeList);
  });
});

// POST /usuarios - Criar novo usuário (apenas admin e gerente, mas gerente não pode criar admin)
router.post("/usuarios", requireAuth, requireAdminOrGerente, async (req, res) => {
  const { usuario, senha, nome, nivel_acesso } = req.body;

  if (!usuario || !senha || !nome || !nivel_acesso) {
    return res.status(400).json({ message: "Todos os campos são obrigatórios" });
  }

  const validLevels = ['admin', 'gerente', 'padrão'];
  if (!validLevels.includes(nivel_acesso)) {
    return res.status(400).json({ message: "Nível de acesso inválido" });
  }

  // Gerentes não podem criar usuários admin
  if (req.user.nivel_acesso === 'gerente' && nivel_acesso === 'admin') {
    return res.status(403).json({ message: "Gerentes não podem criar usuários admin" });
  }

  // Verificar se usuário já existe
  usuarios.findAll((err, results) => {
    if (err) {
      return res.status(500).json({ message: "Erro ao verificar usuário", error: err });
    }

    if (results.find(u => u.usuario === usuario)) {
      return res.status(409).json({ message: "Usuário já existe" });
    }

    // Inserir novo usuário (mantém compatibilidade com senha plaintext)
    const sql = `INSERT INTO usuarios (usuario, senha, nome, nivel_acesso) VALUES (?, ?, ?, ?)`;
    db.query(sql, [usuario, senha, nome, nivel_acesso], (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao criar usuário", error: err });
      }

      res.status(201).json({ 
        message: "Usuário criado com sucesso",
        user: {
          id: result.insertId,
          usuario,
          nome,
          nivel_acesso
        }
      });
    });
  });
});

// PUT /usuarios/:id - Atualizar usuário (apenas admin e gerente, gerente não pode editar admin)
router.put("/usuarios/:id", requireAuth, requireAdminOrGerente, (req, res) => {
  const { id } = req.params;
  const { usuario, nome, nivel_acesso } = req.body;

  if (!usuario || !nome || !nivel_acesso) {
    return res.status(400).json({ message: "Usuário, nome e nível de acesso são obrigatórios" });
  }

  const validLevels = ['admin', 'gerente', 'padrão'];
  if (!validLevels.includes(nivel_acesso)) {
    return res.status(400).json({ message: "Nível de acesso inválido" });
  }

  // Gerentes não podem editar admins (exceto a si mesmos se forem admin, mas gerentes não são admin)
  if (req.user.nivel_acesso === 'gerente' && nivel_acesso === 'admin') {
    return res.status(403).json({ message: "Gerentes não podem criar ou editar usuários admin" });
  }

  const sql = `UPDATE usuarios SET usuario = ?, nome = ?, nivel_acesso = ? WHERE id = ?`;
  db.query(sql, [usuario, nome, nivel_acesso, id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Erro ao atualizar usuário", error: err });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    res.json({ message: "Usuário atualizado com sucesso" });
  });
});

// DELETE /usuarios/:id - Deletar usuário (apenas admin e gerente, gerente não pode deletar admin)
router.delete("/usuarios/:id", requireAuth, requireAdminOrGerente, (req, res) => {
  const { id } = req.params;

  // Gerentes não podem deletar admins
  if (req.user.nivel_acesso === 'gerente') {
    // Primeiro, buscar o usuário para verificar seu nível
    usuarios.findAll((err, users) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao verificar usuário", error: err });
      }
      const targetUser = users.find(u => u.id == id);
      if (targetUser && targetUser.nivel_acesso === 'admin') {
        return res.status(403).json({ message: "Gerentes não podem deletar usuários admin" });
      }

      // Pode prosseguir com deleção
      const sql = `DELETE FROM usuarios WHERE id = ?`;
      db.query(sql, [id], (err, result) => {
        if (err) {
          return res.status(500).json({ message: "Erro ao deletar usuário", error: err });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Usuário não encontrado" });
        }

        res.json({ message: "Usuário deletado com sucesso" });
      });
    });
  } else {
    // Admin pode deletar (com proteção no frontend)
    const sql = `DELETE FROM usuarios WHERE id = ?`;
    db.query(sql, [id], (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao deletar usuário", error: err });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      res.json({ message: "Usuário deletado com sucesso" });
    });
  }
});

// POST /acompanhantes - Adicionar acompanhantes a uma reserva existente
router.post("/acompanhantes", requireAuth, (req, res) => {
  const { reserva_id, nomes, cpfs, passaportes, nascimentos } = req.body;

  if (!reserva_id || !nomes || nomes.length === 0) {
    return res.status(400).json({
      message: "reserva_id e lista de acompanhantes são obrigatórios",
    });
  }

  // Preparar dados dos acompanhantes
  const acompanhantesData = nomes.map((nome, index) => [
    reserva_id,
    nome,
    cpfs?.[index] || null,
    passaportes?.[index] || null,
    nascimentos?.[index] || null,
  ]);

  db.query(
    `INSERT INTO acompanhantes (reserva_id, nome, cpf, passaporte, data_nascimento) VALUES ?`,
    [acompanhantesData],
    (err) => {
      if (err) {
        console.error("Erro ao registrar acompanhantes:", err);
        return res.status(500).json({
          message: "Erro ao registrar acompanhantes",
          error: err,
        });
      }

      db.query(
        `SELECT COUNT(*) AS total FROM acompanhantes WHERE reserva_id = ?`,
        [reserva_id],
        (countErr, countRows) => {
          if (countErr) {
            console.error("Erro ao contar acompanhantes:", countErr);
          }
          const total = countRows && countRows[0] ? countRows[0].total : acompanhantesData.length;
          res.status(201).json({
            message: "acompanhantes adicionados com sucesso",
            acompanhantes: total,
          });
        }
      );
    }
  );
});

// DELETE /acompanhantes/:id - Remover acompanhante e recalcular diária
router.delete("/acompanhantes/:id", requireAuth, (req, res) => {
  const { id } = req.params;

  db.query(
    `SELECT reserva_id FROM acompanhantes WHERE id = ?`,
    [id],
    (err, results) => {
      if (err) {
        return res.status(500).json({
          message: "Erro ao buscar acompanhante",
          error: err,
        });
      }

      if (!results.length) {
        return res.status(404).json({
          message: "Acompanhante não encontrado",
        });
      }

      const reserva_id = results[0].reserva_id;

      db.query(
        `DELETE FROM acompanhantes WHERE id = ?`,
        [id],
        (errDelete) => {
          if (errDelete) {
            return res.status(500).json({
              message: "Erro ao deletar acompanhante",
              error: errDelete,
            });
          }

          db.query(
            `SELECT COUNT(*) AS total FROM acompanhantes WHERE reserva_id = ?`,
            [reserva_id],
            (countErr, countRows) => {
              if (countErr) {
                console.error("Erro ao contar acompanhantes:", countErr);
              }
              const total = countRows && countRows[0] ? countRows[0].total : 0;
              res.json({
                message: "Acompanhante removido com sucesso",
                acompanhantes: total,
              });
            }
          );
        }
      );
    }
  );
});

module.exports = router;

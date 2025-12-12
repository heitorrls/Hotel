document.addEventListener('DOMContentLoaded', () => {
  // LOGIN
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const usuario = document.getElementById('usuario').value;
      const senha = document.getElementById('senha').value;

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usuario, senha }),
        });
        const data = await response.json();
        if (response.ok) {
          alert('Login realizado com sucesso!');
        } else {
          alert(data.message || 'Erro ao realizar login');
        }
      } catch (error) {
        alert('Erro ao conectar ao servidor');
      }
    });
  }

  // CADASTRO DE CLIENTE
  const cadastroForm = document.getElementById('cadastroForm');
  if (cadastroForm) {
    cadastroForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const nome = document.getElementById('nome').value;
      const cpf = document.getElementById('cpf').value;
      const telefone = document.getElementById('telefone').value;
      const email = document.getElementById('email').value;
      const endereco = document.getElementById('endereco').value;
      const cep = document.getElementById('cep').value;
      const passaporte = document.getElementById('passaporte').value; // Novo campo
      const data_nascimento = document.getElementById('data_nascimento').value;
      const nacionalidade = document.getElementById('nacionalidade').value;

      try {
        const response = await fetch('/api/clientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, cpf, telefone, email, endereco, cep, passaporte, data_nascimento, nacionalidade }),
        });
        const data = await response.json();
        if (response.ok) {
          alert('Cliente cadastrado com sucesso!');
          cadastroForm.reset();
          carregarClientes && carregarClientes(); // Atualiza a tabela se estiver na página de clientes
        } else {
          alert(data.message || 'Erro ao cadastrar cliente');
        }
      } catch (error) {
        alert('Erro ao conectar ao servidor');
      }
    });
  }

  // CADASTRO DE QUARTO DINÂMICO
  let tiposQuarto = [];

  async function carregarTiposQuarto() {
    const resp = await fetch('/api/tipos-quarto');
    const tiposQuarto = await resp.json();
    const select = document.getElementById('tipo_id');
    if (select) {
      select.innerHTML = tiposQuarto.map(tipo =>
        `<option value="${tipo.id}" data-valor="${tipo.valor_diaria}">${tipo.tipo}</option>`
      ).join('');
    }
  }

  const selectTipo = document.getElementById('tipo_id');
  const inputValor = document.getElementById('valor');

  if (selectTipo && inputValor) {
    selectTipo.addEventListener('change', function () {
      const selectedOption = selectTipo.options[selectTipo.selectedIndex];
      const valor = selectedOption.getAttribute('data-valor');
      if (valor) {
        inputValor.value = valor;
      }
    });
  }

  if (document.getElementById('cadastroQuartoForm')) {
    carregarTiposQuarto();
  }

  const cadastroQuartoForm = document.getElementById('cadastroQuartoForm');
  if (cadastroQuartoForm) {
    cadastroQuartoForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const tipo_id = document.getElementById('tipo_id').value;
      const numero = document.getElementById('numero').value;
      const descricao = document.getElementById('descricao').value;
      const valor_diaria = parseFloat(document.getElementById('valor').value.replace(',', '.'));
      const status = 'disponivel';

      try {
        const response = await fetch('/api/quartos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            numero,
            tipo_id,
            descricao,
            valor_diaria,
            status
          }),
        });
        const data = await response.json();
        if (response.ok) {
          alert('Quarto cadastrado com sucesso!');
          cadastroQuartoForm.reset();
        } else {
          alert(data.message || 'Erro ao cadastrar quarto');
        }
      } catch (error) {
        alert('Erro ao conectar ao servidor');
      }
    });
  }

  // Modal de novo tipo de quarto
  const novoTipoBtn = document.getElementById('novoTipoBtn');
  const modalNovoTipo = document.getElementById('modalNovoTipo');
  const salvarNovoTipo = document.getElementById('salvarNovoTipo');
  const cancelarNovoTipo = document.getElementById('cancelarNovoTipo');

  if (novoTipoBtn && modalNovoTipo && salvarNovoTipo && cancelarNovoTipo) {
    novoTipoBtn.onclick = () => { modalNovoTipo.style.display = 'flex'; };
    cancelarNovoTipo.onclick = () => { modalNovoTipo.style.display = 'none'; };
    salvarNovoTipo.onclick = async () => {
      const tipo = document.getElementById('novoTipoTipo').value;
      const descricao = document.getElementById('novoTipoDescricao').value;
      const valor_diaria = document.getElementById('novoTipoValor').value;

      if (!tipo || !descricao || !valor_diaria) {
        alert('Preencha todos os campos!');
        return;
      }

      // Salva o novo tipo no backend
      const resp = await fetch('/api/tipos-quarto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, descricao, valor_diaria })
      });

      if (resp.ok) {
        alert('Tipo de quarto cadastrado!');
        modalNovoTipo.style.display = 'none';
        // Limpa campos do modal
        document.getElementById('novoTipoTipo').value = '';
        document.getElementById('novoTipoDescricao').value = '';
        document.getElementById('novoTipoValor').value = '';
        // Atualiza o select de tipos e já seleciona o novo tipo
        await carregarTiposQuarto();
        const select = document.getElementById('tipo_id');
        if (select) {
          // Seleciona o último tipo cadastrado
          select.selectedIndex = select.options.length - 1;
        }
      } else {
        alert('Erro ao cadastrar tipo de quarto');
      }
    };
    // Fechar modal ao clicar fora do conteúdo
    modalNovoTipo.onclick = (e) => {
      if (e.target === modalNovoTipo) modalNovoTipo.style.display = 'none';
    };
  }

  async function carregarCheckins() {
    const tbody = document.getElementById('checkin-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8">Carregando...</td></tr>';
    const token = sessionStorage.getItem('token');
    const resp = await fetch('/api/checkins-hoje', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const dados = await resp.json();
    if (dados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8">Nenhum check-in hoje</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    dados.forEach(item => {
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
        </tr>
      `;
    });
  }

  async function carregarCheckouts() {
    const tbody = document.getElementById('checkout-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8">Carregando...</td></tr>';
    const token = sessionStorage.getItem('token');
    const resp = await fetch('/api/checkouts-hoje', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const dados = await resp.json();
    if (dados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8">Nenhum check-out hoje</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    dados.forEach(item => {
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
        </tr>
      `;
    });
  }

  // Listar clientes na tabela de clientes.html
  async function carregarClientes() {
    const tbody = document.getElementById('clientes-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7">Carregando...</td></tr>';
    try {
      const resp = await fetch('/api/clientes');
      const clientes = await resp.json();
      if (!clientes.length) {
        tbody.innerHTML = '<tr><td colspan="7">Nenhum cliente cadastrado</td></tr>';
        return;
      }
      tbody.innerHTML = '';
      clientes.forEach(cliente => {
        tbody.innerHTML += `
          <tr>
            <td>${cliente.cpf}</td>
            <td>${cliente.nome}</td>
            <td>${cliente.cep}</td>
            <td>${cliente.endereco}</td>
            <td>${cliente.telefone}</td>
            <td>${cliente.email}</td>
            <td>${cliente.data_cadastro ? cliente.data_cadastro : ''}</td>
          </tr>
        `;
      });
    } catch (error) {
      tbody.innerHTML = '<tr><td colspan="7">Erro ao carregar clientes</td></tr>';
    }
  }

  carregarCheckins();
  carregarCheckouts();
  carregarClientes();

  async function preencherFormularioEdicaoCliente() {
    const urlParams = new URLSearchParams(window.location.search);
    const clienteId = urlParams.get('id');
    if (clienteId) {
      try {
        const resp = await fetch(`/api/clientes/${clienteId}`);
        const cliente = await resp.json();
        if (cliente) {
          document.getElementById('nome').value = cliente.nome || '';
          document.getElementById('cpf').value = cliente.cpf || '';
          document.getElementById('telefonecliente').value = cliente.telefone || '';
          document.getElementById('emailcliente').value = cliente.email || '';
          document.getElementById('endereco').value = cliente.endereco || '';
          document.getElementById('cep').value = cliente.cep || '';
        }
      } catch (error) {
        alert('Erro ao carregar dados do cliente');
      }
    }
  }

  preencherFormularioEdicaoCliente();

  let sql = `
    SELECT c.nome, r.quarto_numero as quarto, 
           DATE_FORMAT(r.data_checkin, '%d/%m/%Y') as data_entrada,
           DATE_FORMAT(r.hora_checkin, '%H:%i') as hora_entrada,
           DATE_FORMAT(COALESCE(r.data_checkout, r.data_checkout_prevista), '%d/%m/%Y') as data_saida,
           DATE_FORMAT(COALESCE(r.hora_checkout, r.hora_checkout_prevista), '%H:%i') as hora_saida,
           r.status,
           r.acompanhantes,
           r.motivo_hospedagem,
           r.id
    FROM Reservas r
    JOIN Clientes c ON r.cliente_cpf = c.cpf
  `;

  let quartoAtual = null;

  async function abrirModalConsumo(numero) {
    window.quartoSelecionado = numero;
    // Buscar reserva ativa do quarto
    const respReserva = await fetch(`/api/reserva-ativa-quarto/${numero}`);
    if (!respReserva.ok) {
      alert('Nenhuma reserva ativa para este quarto.');
      return;
    }
    const reserva = await respReserva.json();
    window.reservaSelecionada = reserva.id;

    // Carregar produtos
    const respProdutos = await fetch('/api/produtos');
    const produtos = await respProdutos.json();
    const select = document.getElementById('consumoProduto');
    if (produtos.length === 0) {
      select.innerHTML = '<option disabled selected>Nenhum produto cadastrado</option>';
    } else {
      select.innerHTML = produtos.map(p =>
        `<option value="${p.id}" data-preco="${p.preco_unitario}">${p.nome}</option>`
      ).join('');
      // Preencher preço ao selecionar produto
      select.onchange = function() {
        const preco = select.options[select.selectedIndex].getAttribute('data-preco');
        document.getElementById('consumoValor').value = preco;
      };
      // Preencher preço do primeiro produto
      document.getElementById('consumoValor').value = produtos[0].preco_unitario;
    }
    document.getElementById('modalConsumo').style.display = 'block';
  }

  function fecharModalConsumo() {
    document.getElementById('modalConsumo').style.display = 'none';
    document.getElementById('consumoQuantidade').value = '';
    document.getElementById('consumoValor').value = '';
  }

  async function salvarConsumo() {
    const produto_id = document.getElementById('consumoProduto').value;
    const quantidade = document.getElementById('consumoQuantidade').value;
    const preco_unitario = document.getElementById('consumoValor').value;
    const reserva_id = window.reservaSelecionada;

    if (!produto_id || !quantidade || !preco_unitario || !reserva_id) {
      alert('Preencha todos os campos!');
      return;
    }

    const resp = await fetch('/api/consumos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reserva_id,
        produto_id,
        quantidade,
        preco_unitario
      })
    });
    if (resp.ok) {
      alert('Consumo adicionado!');
      fecharModalConsumo();
      // Atualize a lista de consumos do quarto, se desejar
    } else {
      alert('Erro ao adicionar consumo');
    }
  }

  async function mostrarConsumos(quarto_numero) {
    const resp = await fetch(`/api/consumos/${quarto_numero}`);
    const consumos = await resp.json();
    let html = '<h4>Consumos:</h4>';
    if (!consumos.length) {
      html += '<p>Nenhum consumo registrado.</p>';
    } else {
      html += '<ul>';
      consumos.forEach(c => {
        html += `<li>${c.produto} - ${c.quantidade} x R$${c.valor} (${new Date(c.data_consumo).toLocaleString()})</li>`;
      });
      html += '</ul>';
    }
    document.getElementById('consumos-quarto').innerHTML = html;
  }

  async function mostrarConsumos(reserva) {
    const respConsumos = await fetch(`/api/consumos/${reserva.id}`);
    const consumos = await respConsumos.json();
    const tbody = document.querySelector('.checkout_screen_table_body');
    tbody.innerHTML = '';
    if (consumos.length) {
      consumos.forEach(c => {
        tbody.innerHTML += `
          <tr>
            <td class="checkout_screen_table_cell">${c.produto_nome}</td>
            <td class="checkout_screen_table_cell">${c.quantidade}</td>
            <td class="checkout_screen_table_cell">${(c.quantidade * c.preco_unitario).toFixed(2)}</td>
          </tr>
        `;
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="3" class="checkout_screen_table_cell">Nenhum consumo registrado</td></tr>';
    }
  }

  async function carregarReserva() {
    const urlParams = new URLSearchParams(window.location.search);
    const reservaId = urlParams.get('id');
    if (!reservaId) {
      alert('ID da reserva não encontrado');
      return;
    }

    try {
      const resp = await fetch(`/api/reservas/${reservaId}`);
      const reserva = await resp.json();
      if (!reserva) {
        alert('Reserva não encontrada');
        return;
      }

      // Preencher formulário com dados da reserva
      document.getElementById('nome').value = reserva.nome_cliente || '';
      document.getElementById('cpf').value = reserva.cpf_cliente || '';
      document.getElementById('telefone').value = reserva.telefone_cliente || '';
      document.getElementById('email').value = reserva.email_cliente || '';
      document.getElementById('endereco').value = reserva.endereco_cliente || '';
      document.getElementById('cep').value = reserva.cep_cliente || '';
      document.getElementById('data_checkin').value = reserva.data_checkin || '';
      document.getElementById('hora_checkin').value = reserva.hora_checkin || '';
      document.getElementById('data_checkout').value = reserva.data_checkout || '';
      document.getElementById('hora_checkout').value = reserva.hora_checkout || '';
      document.getElementById('status').value = reserva.status || '';
      document.getElementById('motivo_hospedagem').value = reserva.motivo_hospedagem || '';
      document.getElementById('data_checkout_prevista').value = reserva.data_checkout_prevista || '';
      document.getElementById('hora_checkout_prevista').value = reserva.hora_checkout_prevista || '';

      // Carregar consumos da reserva
      mostrarConsumos(reserva);
    } catch (error) {
      alert('Erro ao carregar reserva');
    }
  }

  if (window.location.pathname.includes('reservas.html') && window.location.search.includes('id=')) {
    carregarReserva();
  }

  function editarQuarto(numero) {
    // Mostre inputs para editar e botões para salvar/excluir/interditar
    // Exemplo:
    // <button onclick="salvarEdicaoQuarto(${numero})">Salvar</button>
    // <button onclick="excluirQuarto(${numero})">Excluir</button>
    // <button onclick="interditarQuarto(${numero})">Interditar</button>
  }

  async function excluirQuarto(numero) {
    if (!confirm('Tem certeza que deseja excluir este quarto?')) return;
    const resp = await fetch(`/api/quartos/${numero}`, { method: 'DELETE' });
    if (resp.ok) {
      alert('Quarto excluído!');
      // Atualize a lista de quartos
    } else {
      alert('Erro ao excluir quarto');
    }
  }

  async function interditarQuarto(numero) {
    const resp = await fetch(`/api/quartos/${numero}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'interditado' })
    });
    if (resp.ok) {
      alert('Quarto interditado!');
      // Atualize a lista de quartos
    } else {
      alert('Erro ao interditar quarto');
    }
  }

  async function carregarQuartosParaCheckout() {
    const resp = await fetch('/api/quartos');
    const quartos = await resp.json();
    const select = document.getElementById('quarto');
    if (!select) return;
    select.innerHTML = quartos.map(q =>
      `<option value="${q.numero}">Quarto ${q.numero}</option>`
    ).join('');
  }
  document.addEventListener('DOMContentLoaded', carregarQuartosParaCheckout);

  const selectEditar = document.getElementById("quarto-editar-select");
  selectEditar.innerHTML = quartos.map(q =>
    `<option value="${q.numero}">Quarto ${q.numero} - ${q.tipo}</option>`
  ).join('');

  setTimeout(() => {
  }, 100);

  // Exemplo de busca de cliente e uso do id
  function buscarCliente(cpf, passaporte, callback) {
    let url = "/api/clientes/busca?";
    if (cpf) url += "cpf=" + cpf;
    else if (passaporte) url += "passaporte=" + passaporte;
    fetch(url)
      .then(res => res.json())
      .then(cliente => callback(cliente.id))
      .catch(() => callback(null));
  }

  // Exemplo de criação de reserva usando cliente_id
  function criarReserva(dadosReserva) {
    buscarCliente(dadosReserva.cpf, dadosReserva.passaporte, function(clienteId) {
      if (!clienteId) {
        alert("Cliente não encontrado");
        return;
      }
      dadosReserva.cliente_id = clienteId;
      fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosReserva)
      })
      .then(res => res.json())
      .then(data => alert(data.message));
    });
  }
});
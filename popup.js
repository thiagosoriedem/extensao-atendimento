const campoTitulo = document.getElementById('titulo');
const campoAtalho = document.getElementById('atalho');
const campoCategoria = document.getElementById('categoria');
const campoTexto = document.getElementById('texto');
const btnSalvar = document.getElementById('btnSalvar');
const btnCancelar = document.getElementById('btnCancelar');
const btnFixar = document.getElementById('btnFixar');
const btnCarregarPadrao = document.getElementById('btnCarregarPadrao');
const listaMensagens = document.getElementById('listaMensagens');
const iconeBotao = document.getElementById('iconeBotao');
const textoBotao = document.getElementById('textoBotao');
const campoBusca = document.getElementById('campoBusca');

// Elementos de pastas dinâmicas
const novaPastaNome = document.getElementById('novaPastaNome');
const btnCriarPasta = document.getElementById('btnCriarPasta');
const iconePastaBtn = document.getElementById('iconePastaBtn');
const listaPastasGerenciador = document.getElementById('listaPastasGerenciador');
const btnCancelarEdicaoPasta = document.getElementById('btnCancelarEdicaoPasta');
const tituloSeçãoPasta = document.getElementById('tituloSeçãoPasta');

const btnExportar = document.getElementById('btnExportar');
const inputImportar = document.getElementById('inputImportar');

// Elementos de anexos
const btnAnexar = document.getElementById('btnAnexar');
const inputAnexo = document.getElementById('inputAnexo');
const listaAnexos = document.getElementById('listaAnexos');

// Elementos da Agenda
const telaPrincipal = document.getElementById('tela-principal');
const telaAgenda = document.getElementById('tela-agenda');
const btnSalvarAgenda = document.getElementById('btnSalvarAgenda');
const btnAdicionarMedicoAgenda = document.getElementById('btnAdicionarMedicoAgenda');
const containerGerenciadorAgenda = document.getElementById('container-gerenciador-agenda');
const campoBuscaAgenda = document.getElementById('campoBuscaAgenda');
const btnExportarAgenda = document.getElementById('btnExportarAgenda');
const inputImportarAgenda = document.getElementById('inputImportarAgenda');

// Elementos da Remarcação
const telaRemarcacao = document.getElementById('tela-remarcacao');
const navBtnRemarcacao = document.getElementById('nav-btn-remarcacao');
const remarcacaoAgendaOrigem = document.getElementById('remarcacao-agenda-origem');
const remarcacaoAgendaDestino = document.getElementById('remarcacao-agenda-destino');
const remarcacaoNovaData = document.getElementById('remarcacao-nova-data');
const remarcacaoObservacao = document.getElementById('remarcacao-observacao');
const btnIniciarRemarcacao = document.getElementById('btnIniciarRemarcacao');

// Elementos de Navegação
const navBtnMensagens = document.getElementById('nav-btn-mensagens');
const navBtnAgenda = document.getElementById('nav-btn-agenda');

let idMensagemEmEdicao = null;
let pastaEmEdicaoNome = null; // Controla se estamos renomeando uma pasta
let todasAsMensagens = [];
let itemArrastado = null;
let todasAsPastas = []; // Armazena as pastas com suas cores
let anexosTemporarios = []; // Array para armazenar anexos antes de salvar

const PASTAS_PADRAO = ["Consultas > Geral", "Exames > Geral", "Administrativo > Geral", "Outros"];
const UNIDADES_DISPONIVEIS = [
    "SOS OTORRINO ALTIPLANO",
    "SOS OTORRINO BESSA",
    "SOS OTORRINO CAMPINA GRANDE",
    "SOS OTORRINO MANAIRA",
    "SOS OTORRINO MANGABEIRA",
    "SOS OTORRINO TAMBAU 24 HRS",
    "SOS OTORRINO TAMBAÚ DIA",
    "SOS OTORRINO TELEMEDICINA",
    "SOS OTORRINO TORRE",
    "SOS OTORRINO VALENTINA",
    "CAMPINA GRANDE - DESIGN MALL"
].sort();

// ================== NAVEGAÇÃO ENTRE TELAS ==================
navBtnAgenda.addEventListener('click', () => {
  telaPrincipal.style.display = 'none';
  telaRemarcacao.style.display = 'none';
  telaAgenda.style.display = 'block';
  navBtnMensagens.classList.remove('active');
  navBtnRemarcacao.classList.remove('active');
  navBtnAgenda.classList.add('active');
  carregarEditorAgenda();
});

navBtnMensagens.addEventListener('click', () => {
  telaPrincipal.style.display = 'block';
  telaAgenda.style.display = 'none';
  telaRemarcacao.style.display = 'none';
  navBtnAgenda.classList.remove('active');
  navBtnRemarcacao.classList.remove('active');
  navBtnMensagens.classList.add('active');
});

navBtnRemarcacao.addEventListener('click', () => {
  telaPrincipal.style.display = 'none';
  telaAgenda.style.display = 'none';
  telaRemarcacao.style.display = 'block';
  navBtnMensagens.classList.remove('active');
  navBtnAgenda.classList.remove('active');
  navBtnRemarcacao.classList.add('active');
  carregarAgendasRemarcacao();
});

function getIconeAnexo(tipo) {
  if (tipo.startsWith('image/')) return 'image';
  if (tipo === 'application/pdf') return 'picture_as_pdf';
  if (tipo.includes('word') || tipo.includes('document')) return 'description';
  if (tipo.includes('sheet') || tipo.includes('excel')) return 'table_chart';
  if (tipo.includes('archive') || tipo.includes('zip')) return 'folder_zip';
  return 'attachment';
}

function adicionarAnexo(arquivo) {
  if (anexosTemporarios.length >= 10) {
    return alert('Máximo de 10 anexos por mensagem!');
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const anexo = {
      nome: arquivo.name,
      tipo: arquivo.type || 'application/octet-stream',
      tamanho: arquivo.size,
      dados: e.target.result // Base64
    };
    anexosTemporarios.push(anexo);
    exibirListaAnexos();
  };
  reader.onerror = () => alert('Erro ao ler o arquivo!');
  reader.readAsDataURL(arquivo);
}

function removerAnexo(indice) {
  anexosTemporarios.splice(indice, 1);
  exibirListaAnexos();
}

function exibirListaAnexos() {
  listaAnexos.innerHTML = '';
  
  if (anexosTemporarios.length === 0) {
    return;
  }

  anexosTemporarios.forEach((anexo, indice) => {
    const div = document.createElement('div');
    div.className = 'item-anexo';
    div.innerHTML = `
      <div class="anexo-info">
        <span class="anexo-icone material-icons-round">${getIconeAnexo(anexo.tipo)}</span>
        <div>
          <div class="anexo-nome" title="${anexo.nome}">${anexo.nome}</div>
          <div class="anexo-tamanho">${formatarTamanhoBytesAnexo(anexo.tamanho)}</div>
        </div>
      </div>
      <button type="button" class="btn-remover-anexo" title="Remover anexo">
        <span class="material-icons-round">close</span>
      </button>
    `;
    
    div.querySelector('.btn-remover-anexo').addEventListener('click', () => removerAnexo(indice));
    listaAnexos.appendChild(div);
  });
}

btnAnexar.addEventListener('click', () => {
  inputAnexo.click();
});

inputAnexo.addEventListener('change', (evento) => {
  const arquivos = evento.target.files;
  for (let arquivo of arquivos) {
    adicionarAnexo(arquivo);
  }
  // Limpar o input para permitir selecionar o mesmo arquivo novamente
  inputAnexo.value = '';
});

document.addEventListener('DOMContentLoaded', () => {
  atualizarInterfacePastas();
  carregarMensagens();
  campoBuscaAgenda.addEventListener('input', filtrarMedicosAgenda);
  inputImportarAgenda.addEventListener('change', importarDadosAgenda);
  btnIniciarRemarcacao.addEventListener('click', iniciarRemarcacao);
  inicializarAgenda();
});

campoBusca.addEventListener('input', (e) => {
  filtrarEExibirMensagens(e.target.value.toLowerCase().trim());
});

btnFixar.addEventListener('click', () => {
  chrome.windows.create({ url: chrome.runtime.getURL("popup.html"), type: "popup", width: 580, height: 660 });
});

// ================== GERENCIAMENTO DE AGENDA ==================

function filtrarMedicosAgenda() {
  const termo = campoBuscaAgenda.value.toLowerCase().trim();
  const medicos = containerGerenciadorAgenda.querySelectorAll('.medico-editor');

  medicos.forEach(medicoDiv => {
    const nomeMedicoInput = medicoDiv.querySelector('.medico-nome-input');
    if (nomeMedicoInput) {
      const nomeMedico = nomeMedicoInput.value.toLowerCase();
      const visivel = nomeMedico.includes(termo);
      // Usamos .closest() para garantir que pegamos o card inteiro do médico
      medicoDiv.style.display = visivel ? 'block' : 'none';
    }
  });
}

function inicializarAgenda() {
  chrome.storage.local.get('mapeamentoAgenda', (data) => {
    // Se não houver agenda salva, busca do arquivo JSON padrão.
    if (!data.mapeamentoAgenda || Object.keys(data.mapeamentoAgenda).length === 0) {
      console.log("Nenhuma agenda encontrada. Carregando do arquivo 'agenda_padrao.json'...");
      fetch(chrome.runtime.getURL('agenda_padrao.json'))
        .then(response => response.json())
        .then(dadosPadrao => {
          chrome.storage.local.set({ mapeamentoAgenda: dadosPadrao }, () => {
            console.log("Agenda padrão carregada e salva no armazenamento local.");
          });
        })
        .catch(err => console.error("Erro ao carregar agenda padrão:", err));
    }
  });
}

btnExportarAgenda.addEventListener('click', () => {
  chrome.storage.local.get('mapeamentoAgenda', (data) => {
    if (!data.mapeamentoAgenda || Object.keys(data.mapeamentoAgenda).length === 0) {
      return alert('Nenhum dado de agenda para exportar!');
    }
    const blob = new Blob([JSON.stringify(data.mapeamentoAgenda, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dataFormatada = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    a.href = url;
    a.download = `backup_agenda_${dataFormatada}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
});

function importarDadosAgenda(evento) {
  const arquivo = evento.target.files[0];
  if (!arquivo) return;

  const leitor = new FileReader();
  leitor.onload = (e) => {
    try {
      const dadosImportados = JSON.parse(e.target.result);

      if (typeof dadosImportados !== 'object' || dadosImportados === null || Object.keys(dadosImportados).length === 0) {
        throw new Error("Arquivo JSON inválido ou vazio.");
      }

      chrome.storage.local.set({ mapeamentoAgenda: dadosImportados }, () => {
        alert('Dados da agenda importados com sucesso!');
        carregarEditorAgenda(); // Recarrega a tela para exibir os novos dados
      });
    } catch (err) {
      alert('Erro ao ler o arquivo. Certifique-se de que é um arquivo JSON de agenda válido.');
    }
  };
  leitor.readAsText(arquivo);
}

function carregarEditorAgenda() {
  chrome.storage.local.get('mapeamentoAgenda', (data) => {
    const mapeamento = data.mapeamentoAgenda || {};
    containerGerenciadorAgenda.innerHTML = '';

    // Converte o objeto de mapeamento em um array para ordenação
    const medicosOrdenados = Object.entries(mapeamento).sort(([, a], [, b]) => {
      // Ordena pelo nome, ignorando maiúsculas/minúsculas e acentos
      return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    });

    // Itera sobre o array ordenado para criar os elementos
    for (const [medicoId, medico] of medicosOrdenados) {
      const medicoDiv = document.createElement('div');
      medicoDiv.className = 'card medico-editor';
      medicoDiv.setAttribute('data-medico-id', medicoId);
      
      let horariosHtml = medico.horarios.map((h, index) => criarHtmlHorario(medicoId, index, h)).join('');

      medicoDiv.innerHTML = `
        <div class="form-linha" style="align-items: flex-end;">
          <div class="form-grupo">
            <label>ID do Médico</label>
            <input type="text" class="medico-id-input" value="${medicoId}" readonly style="background-color: #e2e8f0;">
          </div>
          <div class="form-grupo">
            <label>Nome do Médico</label>
            <input type="text" class="medico-nome-input" value="${medico.nome}">
          </div>
          <button class="btn-acao deletar-medico" title="Remover Médico"><span class="material-icons-round">delete</span></button>
        </div>
        <div class="secao-titulo" style="margin-top:10px;">Horários</div>
        <div class="horarios-container">${horariosHtml}</div>
        <div class="botoes-container" style="margin-top: 8px; gap: 4px;">
          <button class="btn-backup limpar-horarios" style="font-size:11px; padding: 4px 8px; flex: 0.5; background-color: #fff1f2; border-color: #ffdde0; color: var(--danger);"><span class="material-icons-round" style="font-size:14px;">delete_sweep</span> Limpar</button>
          <button class="btn-backup adicionar-horario" style="font-size:11px; padding: 4px 8px; flex: 1;">+ Adicionar Horário</button>
        </div>
      `;
      containerGerenciadorAgenda.appendChild(medicoDiv);
    }
    adicionarListenersAgenda();
  });
}

function criarHtmlHorario(medicoId, horarioIndex, horario) {
  const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  let optionsDia = dias.map((dia, i) => `<option value="${i}" ${i === horario.dia ? 'selected' : ''}>${dia}</option>`).join('');
  let optionsUnidade = UNIDADES_DISPONIVEIS.map(unidade => `<option value="${unidade}" ${unidade === horario.unidade ? 'selected' : ''}>${unidade}</option>`).join('');

  return `
    <div class="form-linha horario-item" data-horario-index="${horarioIndex}" style="gap: 4px; align-items: center;">
      <select class="horario-dia">${optionsDia}</select>
      <input type="number" step="0.1" class="horario-inicio" placeholder="Início" value="${horario.inicio}">
      <input type="number" step="0.1" class="horario-fim" placeholder="Fim" value="${horario.fim}">
      <select class="horario-unidade">${optionsUnidade}</select>
      <button class="btn-acao deletar-horario" title="Remover Horário"><span class="material-icons-round" style="font-size:16px;">close</span></button>
    </div>
  `;
}

function adicionarListenersAgenda() {
  document.querySelectorAll('.deletar-medico').forEach(btn => btn.addEventListener('click', (e) => e.currentTarget.closest('.medico-editor').remove()));
  document.querySelectorAll('.deletar-horario').forEach(btn => btn.addEventListener('click', (e) => e.currentTarget.closest('.horario-item').remove()));
  document.querySelectorAll('.adicionar-horario').forEach(btn => btn.addEventListener('click', (e) => {
    const container = e.currentTarget.previousElementSibling;
    const medicoId = e.currentTarget.closest('.medico-editor').dataset.medicoId;
    const novoIndex = container.children.length;
    const novoHorarioHtml = criarHtmlHorario(medicoId, novoIndex, { dia: 1, inicio: '', fim: '', unidade: '' });
    container.insertAdjacentHTML('beforeend', novoHorarioHtml);
    adicionarListenersAgenda(); // Re-adiciona listeners para os novos botões
  }));
  document.querySelectorAll('.limpar-horarios').forEach(btn => btn.addEventListener('click', (e) => {
    if (confirm('Tem certeza que deseja limpar todos os horários deste profissional?')) {
      const container = e.currentTarget.closest('.medico-editor').querySelector('.horarios-container');
      container.innerHTML = '';
    }
  }));
}

btnAdicionarMedicoAgenda.addEventListener('click', () => {
  const novoId = `medico_${Date.now()}`;
  const medicoDiv = document.createElement('div');
  medicoDiv.className = 'card medico-editor';
  medicoDiv.setAttribute('data-medico-id', novoId);
  medicoDiv.innerHTML = `
    <div class="form-linha" style="align-items: flex-end;">
      <div class="form-grupo">
        <label>ID do Médico</label>
        <input type="text" class="medico-id-input" value="${prompt('Digite o ID do novo médico (ex: 3943):', '') || novoId}">
      </div>
      <div class="form-grupo">
        <label>Nome do Médico</label>
        <input type="text" class="medico-nome-input" value="" placeholder="Nome completo do médico">
      </div>
      <button class="btn-acao deletar-medico" title="Remover Médico"><span class="material-icons-round">delete</span></button>
    </div>
    <div class="secao-titulo" style="margin-top:10px;">Horários</div>
    <div class="horarios-container"></div>
    <div class="botoes-container" style="margin-top: 8px; gap: 4px;">
      <button class="btn-backup limpar-horarios" style="font-size:11px; padding: 4px 8px; flex: 0.5; background-color: #fff1f2; border-color: #ffdde0; color: var(--danger);"><span class="material-icons-round" style="font-size:14px;">delete_sweep</span> Limpar</button>
      <button class="btn-backup adicionar-horario" style="font-size:11px; padding: 4px 8px; flex: 1;">+ Adicionar Horário</button>
    </div>
  `;
  containerGerenciadorAgenda.appendChild(medicoDiv);
  adicionarListenersAgenda();
});

btnSalvarAgenda.addEventListener('click', () => {
  const novoMapeamento = {};
  const editores = document.querySelectorAll('.medico-editor');

  for (const editor of editores) {
    const idInput = editor.querySelector('.medico-id-input');
    const nomeInput = editor.querySelector('.medico-nome-input');
    const medicoId = idInput.value.trim();
    const medicoNome = nomeInput.value.trim();

    if (!medicoId || !medicoNome) {
      alert('ID e Nome do Médico são obrigatórios.');
      idInput.focus();
      return;
    }

    const horarios = [];
    const itensHorario = editor.querySelectorAll('.horario-item');
    for (const item of itensHorario) {
      const dia = parseFloat(item.querySelector('.horario-dia').value);
      const inicio = parseFloat(item.querySelector('.horario-inicio').value);
      const fim = parseFloat(item.querySelector('.horario-fim').value);
      const unidade = item.querySelector('.horario-unidade').value.trim();

      if (!isNaN(dia) && !isNaN(inicio) && !isNaN(fim) && unidade) {
        horarios.push({ dia, inicio, fim, unidade });
      }
    }

    novoMapeamento[medicoId] = {
      nome: medicoNome,
      horarios: horarios
    };
  }

  chrome.storage.local.set({ mapeamentoAgenda: novoMapeamento }, () => {
    alert('Agenda salva com sucesso!');
    navBtnMensagens.click(); // Volta para a tela de mensagens
  });
});

// ================== REMARCAÇÃO EM LOTE ==================
function carregarAgendasRemarcacao() {
  chrome.storage.local.get(['mapeamentoAgenda', 'ultimaRemarcacao'], (data) => {
    const mapeamento = data.mapeamentoAgenda || {};
    const ultimaRemarcacao = data.ultimaRemarcacao || {};

    const medicosOrdenados = Object.entries(mapeamento).sort(([, a], [, b]) => {
      return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    });

    remarcacaoAgendaOrigem.innerHTML = '<option value="">Selecione a origem</option>';
    remarcacaoAgendaDestino.innerHTML = '<option value="">Selecione o destino</option>';

    for (const [medicoId, medico] of medicosOrdenados) {
      const option = document.createElement('option');
      option.value = medicoId;
      option.textContent = medico.nome;
      remarcacaoAgendaOrigem.appendChild(option.cloneNode(true));
      remarcacaoAgendaDestino.appendChild(option.cloneNode(true));
    }

    // Restaura os últimos valores usados
    if (ultimaRemarcacao.sourceId) {
      remarcacaoAgendaOrigem.value = ultimaRemarcacao.sourceId;
    }
    if (ultimaRemarcacao.destinationId) {
      remarcacaoAgendaDestino.value = ultimaRemarcacao.destinationId;
    }
    if (ultimaRemarcacao.newDate) {
      remarcacaoNovaData.value = ultimaRemarcacao.newDate;
    }
    if (ultimaRemarcacao.observationText) {
      remarcacaoObservacao.value = ultimaRemarcacao.observationText;
    } else {
      remarcacaoObservacao.value = 'Remarcado do dia {data_original} para o dia {data_nova}.';
    }
  });
}

function iniciarRemarcacao() {
  const sourceId = remarcacaoAgendaOrigem.value;
  const destinationId = remarcacaoAgendaDestino.value;
  const newDate = remarcacaoNovaData.value;
  const observationText = remarcacaoObservacao.value;

  if (!sourceId || !destinationId || !newDate) {
    alert('Por favor, preencha todos os campos: agenda de origem, destino e a nova data.');
    return;
  }

  if (sourceId === destinationId) {
    alert('A agenda de origem e destino não podem ser a mesma.');
    return;
  }

  // Salva os dados para persistência
  chrome.storage.local.set({
    ultimaRemarcacao: {
      sourceId,
      destinationId,
      newDate,
      observationText
    }
  });

  if (!confirm(`Confirma a remarcação de TODOS os agendamentos da agenda "${remarcacaoAgendaOrigem.options[remarcacaoAgendaOrigem.selectedIndex].text}" para a agenda "${remarcacaoAgendaDestino.options[remarcacaoAgendaDestino.selectedIndex].text}" na data ${newDate.split('-').reverse().join('/')}? \n\nESTA AÇÃO NÃO PODE SER DESFEITA.`)) {
    return;
  }

  chrome.runtime.sendMessage({
    acao: 'iniciarRemarcacaoLote',
    sourceAgendaId: sourceId,
    destinationAgendaId: destinationId,
    newDate: newDate,
    observation: observationText
  });
}

// ================== GERENCIAMENTO E EDIÇÃO DE PASTAS ==================
btnCriarPasta.addEventListener('click', () => {
  // ... (código existente)
  const nomePasta = novaPastaNome.value.trim();
  if (!nomePasta) return alert('Digite um nome válido para a pasta!');
  if (nomePasta.toLowerCase() === "outros") return alert('A pasta "Outros" é um diretório do sistema e não pode ser modificada.');
  
  chrome.storage.local.get({ pastas: [] }, (resultado) => {
    let listaPastas = migrarEstruturaPastas(resultado.pastas);

    if (pastaEmEdicaoNome) {
      // MODO EDIÇÃO DE PASTA
      if (listaPastas.some(p => p.nome.toLowerCase() === nomePasta.toLowerCase() && p.nome.toLowerCase() !== pastaEmEdicaoNome.toLowerCase())) {
        return alert('Já existe outra pasta com este nome!');
      }

      // 1. Atualiza o nome no array de pastas
      listaPastas = listaPastas.map(p => p.nome === pastaEmEdicaoNome ? { ...p, nome: nomePasta } : p);

      // 2. Varre as mensagens e migra as que pertenciam à pasta antiga para a nova automaticamente
      chrome.storage.local.get({ mensagens: [] }, (resMsg) => {
        const mensagensAtualizadas = (resMsg.mensagens || []).map(msg => {
          if (msg.categoria === pastaEmEdicaoNome) {
            return { ...msg, categoria: nomePasta };
          }
          return msg;
        });

        chrome.storage.local.set({ mensagens: mensagensAtualizadas, pastas: listaPastas }, () => {
          resetarFormularioPasta();
          atualizarInterfacePastas();
          carregarMensagens();
          chrome.runtime.sendMessage({ acao: "atualizar_menu" });
          alert('Pasta e mensagens internas atualizadas!');
        });
      });

    } else {
      // MODO CRIAÇÃO DE PASTA
      if (listaPastas.some(p => p.nome.toLowerCase() === nomePasta.toLowerCase())) {
        return alert('Esta pasta já existe!');
      }
      listaPastas.push({ nome: nomePasta, cor: null });
      listaPastas.sort();

      chrome.storage.local.set({ pastas: listaPastas }, () => {
        novaPastaNome.value = '';
        atualizarInterfacePastas();
        chrome.runtime.sendMessage({ acao: "atualizar_menu" });
      });
    }
  });
});

btnCancelarEdicaoPasta.addEventListener('click', resetarFormularioPasta);

function migrarEstruturaPastas(pastas) {
  if (!pastas || pastas.length === 0) {
    return PASTAS_PADRAO.map(p => ({ nome: p, cor: null }));
  }
  // Se o primeiro item for uma string, assume que a estrutura toda é antiga
  if (typeof pastas[0] === 'string') {
    return pastas.map(p => ({ nome: p, cor: null }));
  }
  return pastas;
}

function atualizarInterfacePastas() {
  chrome.storage.local.get({ pastas: [] }, (resultado) => {
    todasAsPastas = migrarEstruturaPastas(resultado.pastas);
    todasAsPastas.sort((a, b) => a.nome.localeCompare(b.nome));

    // 1. Atualiza o seletor dropdown das mensagens
    campoCategoria.innerHTML = '';
    todasAsPastas.forEach(pastaObj => {
      const opt = document.createElement('option');
      opt.value = pastaObj.nome; 
      opt.textContent = pastaObj.nome;
      campoCategoria.appendChild(opt);
    });

    // 2. Desenha a lista de gerenciamento (Lápis e Lixeira)
    listaPastasGerenciador.innerHTML = '';
    todasAsPastas.forEach(pastaObj => {
      const pastaNome = pastaObj.nome;
      const pastaCor = pastaObj.cor || '#e2e8f0'; // Cor padrão se não houver

      // "Outros" não deve ser editada ou deletada para evitar bugs estruturais
      if (pastaNome === "Outros") return;

      const div = document.createElement('div');
      div.className = 'item-pasta-gerencia';
      div.innerHTML = `
        <span class="item-pasta-nome" title="${pastaNome}">${pastaNome}</span>
        <div class="acoes-item">
          <input type="color" class="item-pasta-cor" value="${pastaCor}" title="Alterar cor da pasta">
          <button class="btn-acao editar-pasta" style="padding:2px;" title="Renomear Pasta"><span class="material-icons-round" style="font-size:14px; color:var(--warning);">edit</span></button>
          <button class="btn-acao deletar-pasta" style="padding:2px;" title="Excluir Pasta e mover mensagens para 'Outros'"><span class="material-icons-round" style="font-size:14px; color:var(--danger);">delete</span></button>
        </div>
      `;

      div.querySelector('.editar-pasta').addEventListener('click', () => prepararEdicaoPasta(pastaNome));
      div.querySelector('.deletar-pasta').addEventListener('click', () => deletarPasta(pastaNome));
      
      const inputCor = div.querySelector('.item-pasta-cor');
      inputCor.addEventListener('change', (e) => {
        const novaCor = e.target.value;
        const pastaIndex = todasAsPastas.findIndex(p => p.nome === pastaNome);
        if (pastaIndex > -1) {
          todasAsPastas[pastaIndex].cor = novaCor;
          chrome.storage.local.set({ pastas: todasAsPastas }, () => carregarMensagens());
        }
      });

      listaPastasGerenciador.appendChild(div);
    });
  });
}

function prepararEdicaoPasta(nome) {
  pastaEmEdicaoNome = nome;
  novaPastaNome.value = nome;
  tituloSeçãoPasta.textContent = "📝 Renomear Pasta";
  iconePastaBtn.textContent = "edit";
  btnCriarPasta.classList.add('modo-edicao');
  btnCancelarEdicaoPasta.style.display = "block";
  novaPastaNome.focus();
}

function resetarFormularioPasta() {
  pastaEmEdicaoNome = null;
  novaPastaNome.value = '';
  tituloSeçãoPasta.textContent = "📂 Gerenciar Pastas / Subpastas";
  iconePastaBtn.textContent = "create_new_folder";
  btnCriarPasta.classList.remove('modo-edicao');
  btnCancelarEdicaoPasta.style.display = "none";
}

function deletarPasta(nome) {
  if (confirm(`Tem certeza que deseja excluir a pasta "${nome}"? As mensagens contidas nela serão movidas para a pasta "Outros".`)) {
    chrome.storage.local.get({ pastas: [], mensagens: [] }, (resultado) => {
      const pastasAtuais = migrarEstruturaPastas(resultado.pastas);
      const pastasFiltradas = pastasAtuais.filter(p => p.nome !== nome);
      
      // Move os textos órfãos da pasta deletada para a pasta "Outros"
      const mensagensTratadas = (resultado.mensagens || []).map(msg => {
        if (msg.categoria === nome) {
          return { ...msg, categoria: "Outros" };
        }
        return msg;
      });

      chrome.storage.local.set({ pastas: pastasFiltradas, mensagens: mensagensTratadas }, () => {
        if (pastaEmEdicaoNome === nome) resetarFormularioPasta();
        atualizarInterfacePastas();
        carregarMensagens();
        chrome.runtime.sendMessage({ acao: "atualizar_menu" });
      });
    });
  }
}

// ================== EXPORTAR / IMPORTAR ==================
btnExportar.addEventListener('click', () => {
  // ... (código existente)
  chrome.storage.local.get({ mensagens: [], pastas: [] }, (data) => {
    const mensagens = data.mensagens || [];
    const pastas = migrarEstruturaPastas(data.pastas);

    if (mensagens.length === 0) return alert('Nenhuma mensagem para exportar!');
    const dadosBackup = { mensagens: mensagens, pastas: pastas };
    const blob = new Blob([JSON.stringify(dadosBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `backup_padrao.json`; a.click();
  });
});

inputImportar.addEventListener('change', (evento) => {
  // ... (código existente)
  const arquivo = evento.target.files[0];
  if (!arquivo) return;
  const leitor = new FileReader();
  leitor.onload = (e) => {
    try {
      const dados = JSON.parse(e.target.result);
      
      const mensagensImportar = Array.isArray(dados) ? dados : (dados.mensagens || []);
      const pastasImportarRaw = Array.isArray(dados) ? [] : (dados.pastas || []);
      const pastasImportar = migrarEstruturaPastas(pastasImportarRaw);

      if (mensagensImportar.length === 0) return alert('Nenhum dado válido encontrado no arquivo.');

      chrome.storage.local.get({ mensagens: [], pastas: [] }, (resultado) => {
        const atuaisMensagens = resultado.mensagens || [];
        let atuaisPastas = migrarEstruturaPastas(resultado.pastas);
        const mapaPastasAtuais = new Map(atuaisPastas.map(p => [p.nome, p]));

        const tratadas = mensagensImportar.map((msg, index) => ({
          id: "msg_" + Date.now() + "_" + index + "_" + Math.floor(Math.random() * 1000),
          titulo: msg.titulo || "Sem Título",
          atalho: (msg.atalho || "").replace('--', '').trim().toLowerCase(),
          categoria: msg.categoria || "Outros",
          texto: msg.texto || ""
        }));

        tratadas.forEach(msg => {
          if (msg.categoria && !mapaPastasAtuais.has(msg.categoria)) {
            mapaPastasAtuais.set(msg.categoria, { nome: msg.categoria, cor: null });
          }
        });

        pastasImportar.forEach(p => {
          if (p.nome && !mapaPastasAtuais.has(p.nome)) {
            mapaPastasAtuais.set(p.nome, p);
          }
        });

        const pastasFinais = Array.from(mapaPastasAtuais.values()).sort((a, b) => a.nome.localeCompare(b.nome));

        chrome.storage.local.set({ mensagens: [...atuaisMensagens, ...tratadas], pastas: pastasFinais }, () => {
          chrome.runtime.sendMessage({ acao: "atualizar_menu" }, () => {
            atualizarInterfacePastas();
            carregarMensagens();
            alert('Perfeito! Toda a sua estrutura de mensagens e pastas foi importada com sucesso neste computador.');
          });
        });
      });
    } catch (err) { 
      alert('Erro ao ler o arquivo. Certifique-se de que é o arquivo .json correto exportado da extensão.'); 
    }
  };
  leitor.readAsText(arquivo);
});

// ================== SALVAR E ATUALIZAR MENSAGENS ==================
btnSalvar.addEventListener('click', () => {
  const titulo = campoTitulo.value.trim();
  let atalho = campoAtalho.value.trim().toLowerCase().replace('--', '');
  const categoria = campoCategoria.value;
  const texto = campoTexto.value.trim();

  if (!titulo || !texto) return alert('Preencha os campos obrigatórios!');

  chrome.storage.local.get({ mensagens: [] }, (resultado) => {
    let mensagens = resultado.mensagens;

    if (atalho && mensagens.some(m => m.atalho === atalho && m.id !== idMensagemEmEdicao)) {
      return alert('Este código de atalho já está sendo usado em outra mensagem!');
    }
    
    const novaMensagem = { 
      id: idMensagemEmEdicao || "msg_" + Date.now(), 
      titulo, 
      atalho, 
      categoria, 
      texto,
      // Garante que o array de anexos seja salvo
      anexos: anexosTemporarios 
    };

    if (idMensagemEmEdicao) {
      mensagens = mensagens.map(msg => msg.id === idMensagemEmEdicao ? novaMensagem : msg);
    } else {
      mensagens.push(novaMensagem);
    }

    chrome.storage.local.set({ mensagens }, () => {
      resetarFormulario();
      carregarMensagens();
      chrome.runtime.sendMessage({ acao: "atualizar_menu" });
    });
  });
});

btnCancelar.addEventListener('click', resetarFormulario);

function carregarMensagens() {
  chrome.storage.local.get({ mensagens: [] }, (resultado) => {
    todasAsMensagens = resultado.mensagens;
    filtrarEExibirMensagens(campoBusca.value.toLowerCase().trim());
  });
}

function filtrarEExibirMensagens(termo) {
  listaMensagens.innerHTML = '';

  // 1. Filtra as mensagens baseado no termo de busca
  const filtradas = todasAsMensagens.filter(msg => 
    msg.titulo.toLowerCase().includes(termo) || 
    msg.texto.toLowerCase().includes(termo) ||
    msg.categoria.toLowerCase().includes(termo) ||
    (msg.atalho && msg.atalho.includes(termo))
  );

  if (filtradas.length === 0) {
    listaMensagens.innerHTML = '<p style="font-size:12px; color:#64748b; text-align:center; margin-top:20px;">Nenhuma mensagem encontrada.</p>';
    return;
  }

  // 2. ESTRUTURAÇÃO DA ÁRVORE HIERÁRQUICA (CORRIGIDA)
  const arvoreAbstrata = { subpastas: {}, mensagens: [] };

  filtradas.forEach(msg => {
    const caminho = msg.categoria || "Outros";
    // Divide por " > " para identificar os níveis
    const partes = caminho.split(" > ").map(p => p.trim()).filter(p => p.length > 0);
    
    let noAtual = arvoreAbstrata;

    // Navega na árvore criando as subpastas necessárias
    partes.forEach(parte => {
      if (!noAtual.subpastas[parte]) {
        noAtual.subpastas[parte] = { subpastas: {}, mensagens: [] };
      }
      // Avança o ponteiro para dentro da pasta que acabou de criar/encontrar
      noAtual = noAtual.subpastas[parte];
    });

    // Guarda a mensagem no último nível alcançado
    noAtual.mensagens.push(msg);
  });

  // 3. FUNÇÃO RECURSIVA PARA DESENHAR A ÁRVORE NA TELA
  function renderizarNoDaArvore(nomeNo, dadosNo, conteinerDestino, nivelHierarquia = 0) {
    // Se o nó atual não tem subpastas nem mensagens, não renderiza nada
    if (nomeNo && Object.keys(dadosNo.subpastas).length === 0 && dadosNo.mensagens.length === 0) {
      return;
    }

    let areaFilhos = conteinerDestino;

    // Se tiver nome, significa que é uma pasta real (não o nó raiz)
    if (nomeNo) {
      const blocoGrupo = document.createElement('div');
      blocoGrupo.className = 'bloco-hierarquia-grupo';
      blocoGrupo.style.marginBottom = '6px';
      // Aplica um recuo progressivo para a direita para marcar as subpastas
      blocoGrupo.style.marginLeft = nivelHierarquia > 1 ? '14px' : '0px';
      
      const pastaInfo = todasAsPastas.find(p => p.nome.endsWith(nomeNo));
      const corPasta = pastaInfo?.cor || 'var(--primary)';

      blocoGrupo.innerHTML = `
        <div class="pasta-header-titulo" style="display: flex; align-items: center; justify-content: space-between; background: ${nivelHierarquia > 1 ? '#f8fafc' : '#f1f5f9'}; border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; cursor: pointer; user-select: none; margin-bottom: 4px;">
          <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: var(--text);">
            <span class="material-icons-round icone-pasta-estado" style="font-size: 15px; color: var(--primary);">folder</span>
            <span>${nomeNo.toUpperCase()}</span>
          </div>
          <span class="material-icons-round icone-seta-estado" style="font-size: 14px; color: var(--text-secondary); transition: transform 0.2s;">expand_more</span>
        </div>
        <div class="conteudo-ramificacao-pasta" style="display: none; flex-direction: column; border-left: 1px dashed #cbd5e1; margin-left: 6px; padding-left: 4px;"></div>
      `;

      const headerClicavel = blocoGrupo.querySelector('.pasta-header-titulo');
      areaFilhos = blocoGrupo.querySelector('.conteudo-ramificacao-pasta');
      const iconePasta = blocoGrupo.querySelector('.icone-pasta-estado');
      const iconeSeta = blocoGrupo.querySelector('.icone-seta-estado');
      iconePasta.style.color = corPasta;

      // Expandir / Recolher ao clicar na pasta
      headerClicavel.addEventListener('click', (e) => {
        e.stopPropagation();
        const estaEscondido = areaFilhos.style.display === 'none';
        
        if (estaEscondido) {
          areaFilhos.style.display = 'flex';
          iconePasta.textContent = 'folder_open';
          iconeSeta.style.transform = 'rotate(180deg)';
        } else {
          areaFilhos.style.display = 'none';
          iconePasta.textContent = 'folder';
          iconeSeta.style.transform = 'rotate(0deg)';
        }
      });

      // Se o usuário estiver pesquisando algo, abre tudo automaticamente
      if (termo.length > 0) {
        areaFilhos.style.display = 'flex';
        iconePasta.textContent = 'folder_open';
        iconeSeta.style.transform = 'rotate(180deg)';
      }

      conteinerDestino.appendChild(blocoGrupo);
    }

    // 4. RENDERIZA AS SUBPASTAS (Recursão passando a nova área de filhos)
    const subpastasOrdenadas = Object.keys(dadosNo.subpastas).sort();
    subpastasOrdenadas.forEach(sub => {
      renderizarNoDaArvore(sub, dadosNo.subpastas[sub], areaFilhos, nivelHierarquia + 1);
    });

    // 5. RENDERIZA AS MENSAGENS DESTE NÍVEL
    dadosNo.mensagens.forEach((msg) => {
      const div = document.createElement('div');
      div.className = 'item-mensagem';
      div.setAttribute('draggable', 'true');
      div.setAttribute('data-id', msg.id);
      div.style.marginLeft = nivelHierarquia > 0 ? '8px' : '0px';
      div.style.marginBottom = '4px';

      const pastaDaMsg = todasAsPastas.find(p => p.nome === msg.categoria);
      const corDaPasta = pastaDaMsg?.cor || 'var(--text-secondary)';

      div.innerHTML = `
        <div class="item-info">
          <span class="item-titulo" style="color: ${corDaPasta};">${msg.titulo}</span>
          <div class="item-meta" title="Pasta: ${msg.categoria}">
            <span class="item-categoria-path"><span class="material-icons-round">folder_open</span> ${msg.categoria.split(' > ').pop()}</span>
            ${msg.atalho ? `· <span class="item-tag-atalho"><span class="material-icons-round">bolt</span> --${msg.atalho}</span>` : ''}
            ${msg.anexos && msg.anexos.length > 0 ? `· <span class="item-tag-anexo"><span class="material-icons-round">attach_file</span> ${msg.anexos.length}</span>` : ''}
          </div>
        </div>
        <div class="tooltip-previa"><strong>${msg.titulo}</strong>\n\n${msg.texto}${msg.anexos && msg.anexos.length > 0 ? `\n\n📎 ${msg.anexos.length} anexo(s)` : ''}</div>
        <div class="acoes-item">
          <button class="btn-acao editar"><span class="material-icons-round" style="font-size: 18px;">edit</span></button>
          <button class="btn-acao deletar"><span class="material-icons-round" style="font-size: 18px;">delete_outline</span></button>
        </div>
      `;

      div.addEventListener('click', (e) => e.stopPropagation());

      div.querySelector('.editar').addEventListener('click', (e) => { 
        e.stopPropagation(); 
        prepararEdicao(msg.id, msg.titulo, msg.atalho, msg.categoria, msg.texto, msg.anexos || []); 
      });
      
      div.querySelector('.deletar').addEventListener('click', (e) => { 
        e.stopPropagation(); 
        deletarMensagem(msg.id); 
      });
      
      adicionarEventosDragAndDrop(div);
      areaFilhos.appendChild(div);
    });
  }

  // Inicia a construção a partir da raiz invisível
  renderizarNoDaArvore(null, arvoreAbstrata, listaMensagens, 0);
}

function adicionarEventosDragAndDrop(elemento) {
  elemento.addEventListener('dragstart', (e) => {
    itemArrastado = elemento;
    elemento.classList.add('arrastando');
    document.body.classList.add('arrastando-ativo'); 
  });

  elemento.addEventListener('dragover', (e) => { e.preventDefault(); if (elemento !== itemArrastado) elemento.classList.add('drag-over'); });
  elemento.addEventListener('dragleave', () => elemento.classList.remove('drag-over'));
  elemento.addEventListener('dragend', () => {
    elemento.classList.remove('arrastando');
    document.body.classList.remove('arrastando-ativo');
    document.querySelectorAll('.item-mensagem').forEach(i => i.classList.remove('drag-over'));
  });

  elemento.addEventListener('drop', (e) => {
    e.preventDefault();
    elemento.classList.remove('drag-over');
    document.body.classList.remove('arrastando-ativo');
    if (elemento === itemArrastado) return;

    const idAlvo = elemento.getAttribute('data-id');
    const idArrastado = itemArrastado.getAttribute('data-id');

    const indexArrastado = todasAsMensagens.findIndex(m => m.id === idArrastado);
    const indexAlvo = todasAsMensagens.findIndex(m => m.id === idAlvo);

    if (indexArrastado !== -1 && indexAlvo !== -1) {
      const [itemRemovido] = todasAsMensagens.splice(indexArrastado, 1);
      todasAsMensagens.splice(indexAlvo, 0, itemRemovido);

      chrome.storage.local.set({ mensagens: todasAsMensagens }, () => {
        carregarMensagens(); 
        chrome.runtime.sendMessage({ acao: "atualizar_menu" }); 
      });
    }
  });
}

function prepararEdicao(id, titulo, atalho, category, texto, anexos = []) {
  idMensagemEmEdicao = id;
  campoTitulo.value = titulo;
  campoAtalho.value = atalho || '';
  campoCategoria.value = category;
  campoTexto.value = texto;
  // Carrega os anexos existentes para edição
  anexosTemporarios = anexos || []; 
  exibirListaAnexos();
  textoBotao.textContent = "Atualizar";
  iconeBotao.textContent = "edit";
  btnSalvar.classList.add('modo-edicao');
  btnCancelar.style.display = "block";
  campoTitulo.focus();
}

function resetarFormulario() {
  idMensagemEmEdicao = null;
  campoTitulo.value = '';
  campoAtalho.value = '';
  campoTexto.value = '';
  textoBotao.textContent = "Salvar Mensagem";
  iconeBotao.textContent = "add_circle_outline";
  btnSalvar.classList.remove('modo-edicao');
  btnCancelar.style.display = "none";
  // Limpa os anexos temporários
  anexosTemporarios = []; 
  exibirListaAnexos();
}

function deletarMensagem(id) {
  if (idMensagemEmEdicao === id) resetarFormulario();
  chrome.storage.local.get({ mensagens: [] }, (resultado) => {
    const filtradas = resultado.mensagens.filter(msg => msg.id !== id);
    chrome.storage.local.set({ mensagens: filtradas }, () => {
      carregarMensagens();
      chrome.runtime.sendMessage({ acao: "atualizar_menu" });
    });
  });
}

btnCarregarPadrao.addEventListener('click', () => {
  if (!confirm("Deseja carregar o backup padrão do sistema? Isso adicionará as mensagens configuradas na raiz da extensão às suas mensagens atuais.")) return;

  // Busca o caminho interno do arquivo 'backup_padrao.json' dentro da pasta da extensão
  const urlArquivoPadrao = chrome.runtime.getURL('backup_padrao.json');

  // Faz a leitura do arquivo local usando a API fetch nativa
  fetch(urlArquivoPadrao)
    .then(resposta => {
      if (!resposta.ok) throw new Error('Arquivo não encontrado na raiz da pasta.');
      return res = resposta.json();
    })
    .then(dados => {
      const mensagensImportar = Array.isArray(dados) ? dados : (dados.mensagens || []);
      const pastasImportar = Array.isArray(dados) ? [] : (dados.pastas || []);

      if (mensagensImportar.length === 0) {
        return alert('Nenhum dado válido encontrado dentro do arquivo backup_padrao.json.');
      }

      chrome.storage.local.get({ 
        mensagens: [],
        pastas: []
      }, (resultado) => {
        const atuaisMensagens = resultado.mensagens || [];
        let atuaisPastas = migrarEstruturaPastas(resultado.pastas);

        // Processa as mensagens do arquivo padrão gerando IDs únicos para o PC novo
        const tratadas = mensagensImportar.map((msg, index) => ({
          id: "msg_" + Date.now() + "_" + index + "_" + Math.floor(Math.random() * 1000),
          titulo: msg.titulo || "Sem Título",
          atalho: (msg.atalho || "").replace('--', '').trim().toLowerCase(),
          categoria: msg.categoria || "Outros",
          texto: msg.texto || ""
        }));

        // Garante a criação automática das pastas das mensagens
        tratadas.forEach(msg => {
          if (msg.categoria && !atuaisPastas.some(p => p.nome === msg.categoria)) {
            atuaisPastas.push({ nome: msg.categoria, cor: null });
          }
        });

        pastasImportar.forEach(p => {
          if (p.nome && !atuaisPastas.some(pasta => pasta.nome === p.nome)) {
            atuaisPastas.push(p);
          }
        });

        atuaisPastas.sort((a, b) => a.nome.localeCompare(b.nome));
        
        // Filtra mensagens que já existem (baseado em título e texto)
        const existingMessageHashes = new Set(atuaisMensagens.map(msg => `${msg.titulo}|${msg.texto}`));
        const novasMensagensUnicas = tratadas.filter(msg => {
          const msgHash = `${msg.titulo}|${msg.texto}`;
          if (existingMessageHashes.has(msgHash)) {
            return false; // Ignora se já existe
          }
          return true;
        });

        // Salva tudo de uma vez no banco local deste computador
        const mensagensFinais = [...atuaisMensagens, ...novasMensagensUnicas];
        chrome.storage.local.set({ mensagens: mensagensFinais, pastas: atuaisPastas }, () => {
          chrome.runtime.sendMessage({ acao: "atualizar_menu" }, () => {
            atualizarInterfacePastas();
            carregarMensagens();
            alert('Sucesso! O banco de dados padrão da SOS Otorrino foi carregado e estruturado neste computador.');
          });
        });
      });
    })
    .catch(erro => {
      console.error(erro);
      alert('Erro ao carregar o padrão: Certifique-se de que o arquivo foi salvo exatamente com o nome "backup_padrao.json" na raiz da pasta da extensão.');
    });
});
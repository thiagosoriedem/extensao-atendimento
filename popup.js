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

let idMensagemEmEdicao = null;
let pastaEmEdicaoNome = null; // Controla se estamos renomeando uma pasta
let todasAsMensagens = [];
let itemArrastado = null;

const PASTAS_PADRAO = ["Consultas > Geral", "Exames > Geral", "Administrativo > Geral", "Outros"];

document.addEventListener('DOMContentLoaded', () => {
  atualizarInterfacePastas();
  carregarMensagens();
});

campoBusca.addEventListener('input', (e) => {
  filtrarEExibirMensagens(e.target.value.toLowerCase().trim());
});

btnFixar.addEventListener('click', () => {
  chrome.windows.create({ url: chrome.runtime.getURL("popup.html"), type: "popup", width: 440, height: 660 });
});

// ================== GERENCIAMENTO E EDIÇÃO DE PASTAS ==================
btnCriarPasta.addEventListener('click', () => {
  const nomePasta = novaPastaNome.value.trim();
  if (!nomePasta) return alert('Digite um nome válido para a pasta!');
  if (nomePasta.toLowerCase() === "outros") return alert('A pasta "Outros" é um diretório do sistema e não pode ser modificada.');

  chrome.storage.local.get({ pastas: PASTAS_PADRAO }, (resultado) => {
    let listaPastas = resultado.pastas;

    if (pastaEmEdicaoNome) {
      // MODO EDIÇÃO DE PASTA
      if (listaPastas.map(p => p.toLowerCase()).includes(nomePasta.toLowerCase()) && nomePasta.toLowerCase() !== pastaEmEdicaoNome.toLowerCase()) {
        return alert('Já existe outra pasta com este nome!');
      }

      // 1. Atualiza o nome no array de pastas
      listaPastas = listaPastas.map(p => p === pastaEmEdicaoNome ? nomePasta : p);

      // 2. Varre as mensagens e migra as que pertenciam à pasta antiga para a nova automaticamente
      chrome.storage.local.get({ mensagens: [] }, (resMsg) => {
        const mensagensAtualizadas = resMsg.mensagens.map(msg => {
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
      if (listaPastas.map(p => p.toLowerCase()).includes(nomePasta.toLowerCase())) {
        return alert('Esta pasta já existe!');
      }
      listaPastas.push(nomePasta);
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

function atualizarInterfacePastas() {
  chrome.storage.local.get({ pastas: PASTAS_PADRAO }, (resultado) => {
    // 1. Atualiza o seletor dropdown das mensagens
    campoCategoria.innerHTML = '';
    resultado.pastas.forEach(pasta => {
      const opt = document.createElement('option');
      opt.value = pasta; opt.textContent = pasta;
      campoCategoria.appendChild(opt);
    });

    // 2. Desenha a lista de gerenciamento (Lápis e Lixeira)
    listaPastasGerenciador.innerHTML = '';
    resultado.pastas.forEach(pasta => {
      // "Outros" não deve ser editada ou deletada para evitar bugs estruturais
      if (pasta === "Outros") return;

      const div = document.createElement('div');
      div.className = 'item-pasta-gerencia';
      div.innerHTML = `
        <span class="item-pasta-nome" title="${pasta}">${pasta}</span>
        <div class="acoes-item">
          <button class="btn-acao editar-pasta" style="padding:2px;" title="Renomear Pasta"><span class="material-icons-round" style="font-size:14px; color:var(--warning);">edit</span></button>
          <button class="btn-acao deletar-pasta" style="padding:2px;" title="Excluir Pasta e mover mensagens para 'Outros'"><span class="material-icons-round" style="font-size:14px; color:var(--danger);">delete</span></button>
        </div>
      `;

      div.querySelector('.editar-pasta').addEventListener('click', () => prepararEdicaoPasta(pasta));
      div.querySelector('.deletar-pasta').addEventListener('click', () => deletarPasta(pasta));

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
    chrome.storage.local.get({ pastas: PASTAS_PADRAO, mensagens: [] }, (resultado) => {
      const pastasFiltradas = resultado.pastas.filter(p => p !== nome);
      
      // Move os textos órfãos da pasta deletada para a pasta "Outros"
      const mensagensTratadas = resultado.mensagens.map(msg => {
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
  chrome.storage.local.get({ mensagens: [], pastas: [] }, (resultado) => {
    if (resultado.mensagens.length === 0) return alert('Nenhuma mensagem para exportar!');
    const dadosBackup = { mensagens: resultado.mensagens, pastas: resultado.pastas };
    const blob = new Blob([JSON.stringify(dadosBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `backup_padrao.json`; a.click();
  });
});

inputImportar.addEventListener('change', (evento) => {
  const arquivo = evento.target.files[0];
  if (!arquivo) return;
  const leitor = new FileReader();
  leitor.onload = (e) => {
    try {
      const dados = JSON.parse(e.target.result);
      
      // Captura as mensagens e as pastas do arquivo de backup
      const mensagensImportar = Array.isArray(dados) ? dados : (dados.mensagens || []);
      const pastasImportar = Array.isArray(dados) ? [] : (dados.pastas || []);

      if (mensagensImportar.length === 0) return alert('Nenhum dado válido encontrado no arquivo.');

      chrome.storage.local.get({ 
        mensagens: [], 
        pastas: ["Consultas > Geral", "Exames > Geral", "Administrativo > Geral", "Outros"] 
      }, (resultado) => {
        const atuaisMensagens = resultado.mensagens;
        let atuaisPastas = resultado.pastas;

        // 1. Trata e limpa os IDs e atalhos das mensagens importadas
        const tratadas = mensagensImportar.map((msg, index) => ({
          id: "msg_" + Date.now() + "_" + index + "_" + Math.floor(Math.random() * 1000),
          titulo: msg.titulo || "Sem Título",
          atalho: (msg.atalho || "").replace('--', '').trim().toLowerCase(),
          categoria: msg.categoria || "Outros",
          texto: msg.texto || ""
        }));

        // 2. AUTOMAÇÃO DE SEGURANÇA: Garante que as pastas das mensagens importadas sejam criadas
        tratadas.forEach(msg => {
          if (msg.categoria && !atuaisPastas.includes(msg.categoria)) {
            atuaisPastas.push(msg.categoria);
          }
        });

        // Adiciona também as pastas explícitas do bloco de backup (se houver)
        pastasImportar.forEach(p => {
          if (p && !atuaisPastas.includes(p)) atuaisPastas.push(p);
        });

        // Ordena a lista final de pastas em ordem alfabética
        atuaisPastas.sort();

        // 3. Grava tudo de uma vez só no banco de dados local do computador novo
        chrome.storage.local.set({ mensagens: [...atuaisMensagens, ...tratadas], pastas: atuaisPastas }, () => {
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
    
    if (idMensagemEmEdicao) {
      mensagens = mensagens.map(msg => msg.id === idMensagemEmEdicao ? { ...msg, titulo, atalho, categoria, texto } : msg);
    } else {
      mensagens.push({ id: "msg_" + Date.now(), titulo, atalho, categoria, texto });
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

      div.innerHTML = `
        <div class="item-info">
          <span class="item-titulo">${msg.titulo}</span>
          <div class="item-meta">
            ${msg.atalho ? `<span class="item-tag-atalho" style="color: var(--warning); font-size: 10px; font-weight: 600; display: flex; align-items: center; gap: 2px; margin-top: 2px;"><span class="material-icons-round" style="font-size:10px;">bolt</span> --${msg.atalho}</span>` : ''}
          </div>
          <span class="item-preview" style="font-size: 11px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">${msg.texto}</span>
        </div>
        <div class="tooltip-previa"><strong>Prévia do Texto:</strong>\n\n${msg.texto}</div>
        <div class="acoes-item">
          <button class="btn-acao editar"><span class="material-icons-round" style="font-size: 18px;">edit</span></button>
          <button class="btn-acao deletar"><span class="material-icons-round" style="font-size: 18px;">delete_outline</span></button>
        </div>
      `;

      div.addEventListener('click', (e) => e.stopPropagation());

      div.querySelector('.editar').addEventListener('click', (e) => { 
        e.stopPropagation(); 
        prepararEdicao(msg.id, msg.titulo, msg.atalho, msg.categoria, msg.texto); 
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

function prepararEdicao(id, titulo, atalho, category, texto) {
  idMensagemEmEdicao = id;
  campoTitulo.value = titulo;
  campoAtalho.value = atalho || '';
  campoCategoria.value = category;
  campoTexto.value = texto;
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
        pastas: ["Consultas > Geral", "Exames > Geral", "Administrativo > Geral", "Outros"] 
      }, (resultado) => {
        const atuaisMensagens = resultado.mensagens;
        let atuaisPastas = resultado.pastas;

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
          if (msg.categoria && !atuaisPastas.includes(msg.categoria)) {
            atuaisPastas.push(msg.categoria);
          }
        });

        pastasImportar.forEach(p => {
          if (p && !atuaisPastas.includes(p)) atuaisPastas.push(p);
        });

        atuaisPastas.sort();

        // Salva tudo de uma vez no banco local deste computador
        chrome.storage.local.set({ mensagens: [...atuaisMensagens, ...tratadas], pastas: atuaisPastas }, () => {
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
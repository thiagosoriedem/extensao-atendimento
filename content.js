// content.js - VERSÃO COM FILTRO DE BUSCA + TOOLTIP + TEXTO CORRIDO (MARQUEE) AO PASSAR O MOUSE
let menuFlutuante = null;
let campoAtivo = null;
let mensagensLocais = [];
let termoPesquisaAtual = "";

// Variáveis para controle do Tooltip
let timerTooltip = null;
let elementoTooltip = null;

// Garante que o CSS da animação de letreiro esteja injetado na página do chat
if (!document.getElementById('ts-estilos-animacao')) {
  const estilos = document.createElement('style');
  estilos.id = 'ts-estilos-animacao';
  estilos.textContent = `
    @keyframes tsMarquee {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
  `;
  document.head.appendChild(estilos);
}

// Carrega as mensagens salvas na extensão
function carregarMensagensEAtalhos() {
  chrome.storage.local.get({ mensagens: [] }, (resultado) => {
    mensagensLocais = resultado.mensagens;
  });
}
carregarMensagensEAtalhos();

// Monitora alterações no storage em tempo real
chrome.storage.onChanged.addListener((alteracoes) => {
  if (alteracoes.mensagens) {
    mensagensLocais = alteracoes.mensagens.newValue || [];
  }
});

// Intercepta as teclas para controlar o Espaço e o Enter nos atalhos diretos
document.addEventListener('keydown', (evento) => {
  const campo = evento.target;
  if (!campo || campo.value === undefined) return;

  if (menuFlutuante && document.activeElement?.classList.contains('ts-filtro-busca')) {
    if (evento.key === 'Escape') {
      removerMenu();
      campoAtivo.focus();
    }
    return; 
  }

  if (evento.key === ' ' || evento.key === 'Spacebar' || evento.key === 'Enter') {
    const textoAtual = campo.value;
    const correspondencia = textoAtual.match(/--([a-zA-Z0-9_À-ÿ]+)$/);
    
    if (correspondencia) {
      const codigoAtalho = correspondencia[1].toLowerCase();
      const atalhoCompleto = correspondencia[0];
      const mensagemAchada = mensagensLocais.find(m => m.atalho === codigoAtalho);

      if (mensagemAchada) {
        evento.preventDefault();
        campoAtivo = campo;
        removerMenu();
        inserirMensagemSelecionada(mensagemAchada, atalhoCompleto);
        return;
      }
    }
  }

  if (menuFlutuante && evento.key === 'Escape') {
    removerMenu();
  }
});

document.addEventListener('input', (evento) => {
  const campo = evento.target;
  if (!campo || campo.value === undefined || campo.classList.contains('ts-filtro-busca')) return;

  const texto = campo.value;

  if (texto.endsWith('--')) {
    campoAtivo = campo;
    termoPesquisaAtual = "";
    abrirMenuMensagens(campo);
  } else if (menuFlutuante && !texto.includes('--')) {
    removerMenu();
  }
});

function abrirMenuMensagens(campo) {
  removerMenu();
  if (mensagensLocais.length === 0) return;

  menuFlutuante = document.createElement('div');
  menuFlutuante.id = 'ts-menu-sugestoes';
  
  Object.assign(menuFlutuante.style, {
    position: 'fixed',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.15)',
    zIndex: '99999999',
    width: '320px',
    maxHeight: '300px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '4px',
    fontFamily: 'Segoe UI, system-ui, sans-serif',
    fontSize: '13px'
  });

  const retangulo = campo.getBoundingClientRect();
  let topo = retangulo.bottom + window.scrollY + 6;
  let esquerda = retangulo.left + window.scrollX;

  if (topo + 300 > window.innerHeight) {
    topo = retangulo.top + window.scrollY - 306;
  }

  menuFlutuante.style.top = `${topo}px`;
  menuFlutuante.style.left = `${esquerda}px`;

  const containerBusca = document.createElement('div');
  containerBusca.style.padding = '6px';
  containerBusca.style.borderBottom = '1px solid #f1f5f9';

  const inputBusca = document.createElement('input');
  inputBusca.type = 'text';
  inputBusca.className = 'ts-filtro-busca';
  inputBusca.placeholder = '🔍 Digite para filtrar as mensagens...';
  inputBusca.value = termoPesquisaAtual;
  Object.assign(inputBusca.style, {
    width: '100%',
    boxSizing: 'border-box',
    padding: '6px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '12px',
    outline: 'none',
    fontFamily: 'inherit'
  });

  containerBusca.appendChild(inputBusca);
  menuFlutuante.appendChild(containerBusca);

  const areaLista = document.createElement('div');
  areaLista.className = 'ts-area-lista-mensagens';
  Object.assign(areaLista.style, {
    overflowY: 'auto',
    flex: '1',
    padding: '4px'
  });
  menuFlutuante.appendChild(areaLista);

  inputBusca.addEventListener('input', (e) => {
    termoPesquisaAtual = e.target.value.toLowerCase();
    renderizarListaFiltrada(areaLista);
  });

  renderizarListaFiltrada(areaLista);
  document.body.appendChild(menuFlutuante);

  setTimeout(() => inputBusca.focus(), 50);
  document.addEventListener('click', fecharMenuCliqueFora);
}

function renderizarListaFiltrada(conteinerDestino) {
  conteinerDestino.innerHTML = '';

  const filtradas = mensagensLocais.filter(msg => 
    msg.titulo.toLowerCase().includes(termoPesquisaAtual) || 
    msg.texto.toLowerCase().includes(termoPesquisaAtual) ||
    (msg.atalho && msg.atalho.toLowerCase().includes(termoPesquisaAtual)) ||
    (msg.categoria && msg.categoria.toLowerCase().includes(termoPesquisaAtual))
  );

  if (filtradas.length === 0) {
    conteinerDestino.innerHTML = `<div style="color:#64748b; font-size:11px; text-align:center; padding:12px;">Nenhuma mensagem encontrada...</div>`;
    return;
  }

  // Construção da árvore hierárquica
  const arvoreAbstrata = { subpastas: {}, mensagens: [] };

  filtradas.forEach(msg => {
    const caminho = msg.categoria || "Outros";
    const partes = caminho.split(" > ").map(p => p.trim()).filter(p => p.length > 0);
    
    let noAtual = arvoreAbstrata;

    partes.forEach(parte => {
      if (!noAtual.subpastas[parte]) {
        noAtual.subpastas[parte] = { subpastas: {}, mensagens: [] };
      }
      noAtual = noAtual.subpastas[parte];
    });

    noAtual.mensagens.push(msg);
  });

  // Função recursiva corrigida usando Emojis nativos robustos
  function renderizarNoDaArvore(nomeNo, dadosNo, conteinerAlvo, nivelHierarquia = 0) {
    if (nomeNo && Object.keys(dadosNo.subpastas).length === 0 && dadosNo.mensagens.length === 0) {
      return;
    }

    let areaFilhos = conteinerAlvo;

    if (nomeNo) {
      const blocoPasta = document.createElement('div');
      blocoPasta.style.marginBottom = '4px';
      blocoPasta.style.marginLeft = nivelHierarquia > 1 ? '12px' : '0px';

      // TUDO CERTINHO AQUI: Usando o emoji 📁 por padrão no carregamento
      blocoPasta.innerHTML = `
        <div class="ts-pasta-header" style="display: flex; align-items: center; justify-content: space-between; background: ${nivelHierarquia > 1 ? '#f8fafc' : '#f1f5f9'}; border: 1px solid #e2e8f0; border-radius: 6px; padding: 5px 8px; cursor: pointer; user-select: none; margin-bottom: 3px;">
          <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #334155;">
            <span class="ts-icone-pasta" style="font-size: 13px; font-style: normal;">📁</span>
            <span>${nomeNo.toUpperCase()}</span>
          </div>
          <span class="ts-icone-seta" style="font-size: 10px; color: #64748b; transition: transform 0.2s; font-style: normal;">▼</span>
        </div>
        <div class="ts-conteudo-ramificacao" style="display: none; flex-direction: column; border-left: 1px dashed #cbd5e1; margin-left: 5px; padding-left: 4px;"></div>
      `;

      const headerClicavel = blocoPasta.querySelector('.ts-pasta-header');
      areaFilhos = blocoPasta.querySelector('.ts-conteudo-ramificacao');
      const iconePasta = blocoPasta.querySelector('.ts-icone-pasta');
      const iconeSeta = blocoPasta.querySelector('.ts-icone-seta');

      headerClicavel.addEventListener('click', (e) => {
        e.stopPropagation();
        const estaEscondido = areaFilhos.style.display === 'none';
        
        if (estaEscondido) {
          areaFilhos.style.display = 'flex';
          iconePasta.textContent = '📂'; // Altera dinamicamente para o emoji de pasta aberta
          iconeSeta.style.transform = 'rotate(180deg)';
        } else {
          areaFilhos.style.display = 'none';
          iconePasta.textContent = '📁'; // Retorna para o emoji de pasta fechada
          iconeSeta.style.transform = 'rotate(0deg)';
        }
      });

      // Abre automaticamente se estiver rolando uma pesquisa por texto
      if (termoPesquisaAtual.length > 0) {
        areaFilhos.style.display = 'flex';
        iconePasta.textContent = '📂';
        iconeSeta.style.transform = 'rotate(180deg)';
      }

      conteinerAlvo.appendChild(blocoPasta);
    }

    const subpastasOrdenadas = Object.keys(dadosNo.subpastas).sort();
    subpastasOrdenadas.forEach(sub => {
      renderizarNoDaArvore(sub, dadosNo.subpastas[sub], areaFilhos, nivelHierarquia + 1);
    });

    dadosNo.mensagens.forEach((msg) => {
      const item = document.createElement('div');
      item.className = 'ts-menu-item';
      
      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; overflow:hidden;">
          <div class="ts-wrapper-titulo" style="width:72%; overflow:hidden; white-space:nowrap; position:relative;">
            <div class="ts-texto-titulo" style="display:inline-block; font-weight:600; color:#1e293b; transition:transform 0.15s; white-space:nowrap;">• ${msg.titulo}</div>
          </div>
          ${msg.atalho ? `<span style="font-size:10px; font-weight:700; color:#ea580c; background:#ffedd5; padding:2px 6px; border-radius:4px; flex-shrink:0; margin-left:4px;">--${msg.atalho}</span>` : ''}
        </div>
      `;
      
      Object.assign(item.style, {
        padding: '5px 6px',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        marginLeft: nivelHierarquia > 0 ? '6px' : '0px',
        marginBottom: '2px'
      });

      const wrapperTitulo = item.querySelector('.ts-wrapper-titulo');
      const elementoTexto = item.querySelector('.ts-texto-titulo');

      item.addEventListener('mouseenter', (e) => {
        item.style.backgroundColor = '#f1f5f9';
        
        if (elementoTexto.offsetWidth > wrapperTitulo.offsetWidth) {
          elementoTexto.innerHTML = `• ${msg.titulo} &nbsp;&nbsp;&nbsp;&nbsp; • ${msg.titulo}`;
          elementoTexto.style.animation = 'tsMarquee 6s linear infinite';
        }

        timerTooltip = setTimeout(() => {
          exibirTooltipPrevia(e, msg.texto);
        }, 1200);
      });

      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent';
        elementoTexto.style.animation = 'none';
        elementoTexto.innerHTML = `• ${msg.titulo}`;
        removerTooltip();
      });
      
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        removerTooltip();
        const textoNoCampo = campoAtivo.value;
        const correspondencia = textoNoCampo.match(/--([a-zA-Z0-9_À-ÿ]*)$/);
        const termoParaRemover = correspondencia ? correspondencia[0] : '--';
        
        inserirMensagemSelecionada(msg, termoParaRemover);
      });

      areaFilhos.appendChild(item);
    });
  }

  renderizarNoDaArvore(null, arvoreAbstrata, conteinerDestino, 0);
}

function exibirTooltipPrevia(evento, textoMensagem) {
  removerTooltip();

  elementoTooltip = document.createElement('div');
  elementoTooltip.className = 'ts-tooltip-previa-flutuante';
  
  const textoCortado = textoMensagem.length > 250 ? textoMensagem.substring(0, 250) + "..." : textoMensagem;
  elementoTooltip.innerHTML = `<strong>Prévia do Texto:</strong><br><span style="white-space: pre-wrap;">${textoCortado}</span>`;

  Object.assign(elementoTooltip.style, {
    position: 'fixed',
    backgroundColor: '#1e293b',
    color: '#ffffff',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '11px',
    lineHeight: '1.4',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: '999999999',
    maxWidth: '240px',
    pointerEvents: 'none',
    fontFamily: 'Segoe UI, system-ui, sans-serif'
  });

  const posicaoMenu = menuFlutuante.getBoundingClientRect();
  let esquerda = posicaoMenu.right + 8;
  let topo = evento.clientY - 20;

  if (esquerda + 240 > window.innerWidth) {
    esquerda = posicaoMenu.left - 248;
  }

  elementoTooltip.style.left = `${esquerda}px`;
  elementoTooltip.style.top = `${topo}px`;

  document.body.appendChild(elementoTooltip);
}

function removerTooltip() {
  if (timerTooltip) {
    clearTimeout(timerTooltip);
    timerTooltip = null;
  }
  if (elementoTooltip) {
    elementoTooltip.remove();
    elementoTooltip = null;
  }
}

function removerMenu() {
  removerTooltip();
  if (menuFlutuante) {
    menuFlutuante.remove();
    menuFlutuante = null;
  }
  document.removeEventListener('click', fecharMenuCliqueFora);
}

function fecharMenuCliqueFora(e) {
  if (menuFlutuante && !menuFlutuante.contains(e.target) && e.target !== campoAtivo) {
    removerMenu();
  }
}

/**
 * Converte uma string Base64 para um objeto File.
 * @param {string} base64 - A string de dados em Base64 (ex: "data:image/png;base64,iVBORw...").
 * @param {string} nomeArquivo - O nome que o arquivo terá.
 * @returns {File | null} O objeto File ou null se a conversão falhar.
 */
function base64ParaArquivo(base64, nomeArquivo) {
  try {
    let arr = base64.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]),
        n = bstr.length,
        u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], nomeArquivo, { type: mime });
  } catch (e) {
    console.error("Erro ao converter Base64 para Arquivo:", e);
    return null;
  }
}

/**
 * Envia uma sequência de mensagens, uma por uma.
 * @param {string[]} mensagens - Array com os textos das mensagens.
 * @param {HTMLElement} campo - O campo de texto onde as mensagens serão inseridas.
 * @param {number} index - O índice da mensagem atual a ser enviada.
 */
async function enviarMensagensEmSequencia(mensagens, campo, index = 0) {
  if (index >= mensagens.length) {
    campo.focus();
    return; // Finaliza a recursão
  }

  const texto = mensagens[index].trim();
  if (!texto) {
    // Pula mensagens vazias e continua para a próxima
    enviarMensagensEmSequencia(mensagens, campo, index + 1);
    return;
  }

  campo.value = texto;
  campo.dispatchEvent(new Event('input', { bubbles: true }));
  campo.dispatchEvent(new Event('change', { bubbles: true }));

  // Aguarda um instante para o WhatsApp processar o input
  await new Promise(resolve => setTimeout(resolve, 100));

  document.execCommand('insertText', false, ' '); // Truque para habilitar o botão de enviar
  document.execCommand('delete');
  document.execCommand('send'); // Comando que simula o envio

  // Aguarda antes de enviar a próxima mensagem
  setTimeout(() => enviarMensagensEmSequencia(mensagens, campo, index + 1), 300);
}

/**
 * Escreve os arquivos na área de transferência do navegador.
 * @param {Array} arquivos - Um array de objetos File para serem enviados.
 * @returns {Promise<boolean>} Retorna true se bem-sucedido, false caso contrário.
 */
async function enviarAnexos(arquivos) {
  if (!arquivos || arquivos.length === 0) return false;
  if (!navigator.clipboard || !navigator.clipboard.write) {
    console.error("TextSync PRO: A API de Clipboard (navigator.clipboard.write) não é suportada neste navegador ou contexto.");
    alert("Seu navegador não suporta o envio de anexos por esta extensão. Tente atualizar o Chrome.");
    return false;
  }

  try {
    const clipboardItems = arquivos.map(file => new ClipboardItem({ [file.type]: file }));
    await navigator.clipboard.write(clipboardItems);
    return true;
  } catch (error) {
    console.error("TextSync PRO: Erro ao escrever arquivos na área de transferência:", error);
    alert("Ocorreu um erro ao tentar anexar os arquivos. Verifique as permissões do navegador.");
    return false;
  }
}

async function inserirMensagemSelecionada(msg, termoParaRemover) {
  if (!campoAtivo) return;

  // Incrementa o contador de uso da mensagem de forma assíncrona
  chrome.storage.local.get({ mensagens: [] }, (data) => {
    const mensagens = data.mensagens || [];
    const index = mensagens.findIndex(m => m.id === msg.id);
    if (index !== -1) {
      // Garante que a propriedade exista antes de incrementar
      mensagens[index].useCount = (mensagens[index].useCount || 0) + 1;
      // Salva de volta no storage sem bloquear o fluxo principal
      chrome.storage.local.set({ mensagens });
    }
  });

  let textoFinal = msg.texto;

  let nomeAutomatico = "";
  const elementoNome = document.querySelector('.name span') || document.querySelector('.name');
  if (elementoNome) {
    nomeAutomatico = (elementoNome.textContent || elementoNome.innerText || "").trim().split('\n')[0];
  }

  const mapaTags = [
    { tag: "{nome}", promptMsg: "Digite o NOME do paciente/responsável:", valorAuto: nomeAutomatico || null },
    { tag: "{convenio}", promptMsg: "Digite o CONVÊNIO:", valorAuto: null },
    { tag: "{medico}", promptMsg: "Digite o nome do(a) MÉDICO(A):", valorAuto: null },
    { tag: "{exame}", promptMsg: "Digite o nome do EXAME/PROCEDIMENTO:", valorAuto: null },
    { tag: "{unidade}", promptMsg: "Digite a UNIDADE:", valorAuto: null },
    { tag: "{valor}", promptMsg: "Digite o VALOR:", valorAuto: null },
    { tag: "{data}", promptMsg: "Digite a DATA:", valorAuto: null },
    { tag: "{hora}", promptMsg: "Digite o HORÁRIO:", valorAuto: null },
    { tag: "{cpf}", promptMsg: "Digite o CPF:", valorAuto: null }
  ];

  for (const item of mapaTags) {
    if (textoFinal.includes(item.tag)) {
      let valorFinal = item.valorAuto;
      if (!valorFinal) {
        const valorUsuario = prompt(item.promptMsg);
        if (valorUsuario === null) { removerMenu(); return; }
        valorFinal = valorUsuario.trim();
      }
      textoFinal = textoFinal.split(item.tag).join(valorFinal);
    }
  }

  // Remove o termo do atalho (--atalho) do campo de texto
  if (campoAtivo.value !== undefined) {
    let valorCompleto = campoAtivo.value;
    if (termoParaRemover && valorCompleto.includes(termoParaRemover)) {
      const posicaoGatilho = valorCompleto.lastIndexOf(termoParaRemover);
      campoAtivo.value = valorCompleto.substring(0, posicaoGatilho);
      campoAtivo.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  removerMenu();

  // Verifica se há múltiplas mensagens para enviar
  if (textoFinal.includes('[MSG]')) {
    const mensagens = textoFinal.split('[MSG]');
    enviarMensagensEmSequencia(mensagens, campoAtivo);
    return;
  }

  // LÓGICA DE ENVIO DE ANEXOS
  if (msg.anexos && msg.anexos.length > 0) {
    const arquivosParaEnviar = msg.anexos.map(anexo => base64ParaArquivo(anexo.dados, anexo.nome)).filter(Boolean);
    
    if (arquivosParaEnviar.length > 0) {
      const sucesso = await enviarAnexos(arquivosParaEnviar);
      if (sucesso) {
        // Garante que o campo de texto principal tenha o foco antes de colar.
        campoAtivo.focus();
        // Simula o comando 'colar' do usuário para que o WhatsApp abra a tela de anexo.
        document.execCommand('paste');
      }
    }
    // Continua para colar o texto como legenda após um breve atraso.
    colarTextoComoLegenda(textoFinal);
  } else {
    // Se não houver anexos, cola o texto imediatamente.
    colarTextoComoLegenda(textoFinal, 0);
  }
}

function colarTextoComoLegenda(textoFinal, termoParaRemover, atraso = 150) {
  setTimeout(() => {
    // Re-seleciona o campo ativo, que pode ter mudado para o campo de legenda do anexo.
    const campoAtual = document.activeElement;
    const campoFinal = (campoAtual && (campoAtual.value !== undefined || campoAtual.isContentEditable)) ? campoAtual : campoAtivo;
    
    if (campoFinal.value !== undefined) {
      campoFinal.value += textoFinal;
      
      // Dispara eventos para que o React do WhatsApp reconheça a mudança
      campoFinal.dispatchEvent(new Event('input', { bubbles: true }));
      campoFinal.dispatchEvent(new Event('change', { bubbles: true }));
    }
    campoFinal.focus();
  }, atraso);
}

// ================== LÓGICA PARA PRÉ-VISUALIZAÇÃO NO NEORON ==================

if (window.location.hostname === 'direct.neoron.io') {
  let neoronTooltipTimer = null;
  let neoronTooltipElement = null;
  let lastHoveredItem = null;

  const hideNeoronPreview = () => {
    if (neoronTooltipTimer) {
      clearTimeout(neoronTooltipTimer);
      neoronTooltipTimer = null;
    }
    if (neoronTooltipElement) {
      neoronTooltipElement.remove();
      neoronTooltipElement = null;
    }
  };

  const showNeoronPreview = (event) => {
    lastHoveredItem = event.target.closest('span.nav-text');
    if (!lastHoveredItem) return;

    const chatMessageElement = lastHoveredItem.querySelector('p.queued-at > span[style="width: 100%;"]');
    if (chatMessageElement) {
      const messageText = chatMessageElement.textContent.trim();
      if (messageText) {
        createPreviewTooltip(event, messageText);
      }
    }
  };

  const createPreviewTooltip = (event, messageText) => {
    hideNeoronPreview();

    neoronTooltipTimer = setTimeout(() => {
      neoronTooltipElement = document.createElement('div');
      neoronTooltipElement.style.cssText = `
        position: fixed;
        background-color: #1e293b;
        color: #f8fafc;
        padding: 10px 12px;
        border-radius: 8px;
        font-size: 12px;
        line-height: 1.5;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 1000000000;
        max-width: 350px;
        pointer-events: none;
        font-family: 'Segoe UI', system-ui, sans-serif;
        white-space: pre-wrap;
        left: ${event.clientX + 15}px;
        top: ${event.clientY + 15}px;
      `;
      neoronTooltipElement.textContent = messageText;
      document.body.appendChild(neoronTooltipElement);
    }, 500); // Atraso de 500ms para exibir
  }

  document.body.addEventListener('mouseover', showNeoronPreview);
  document.body.addEventListener('mouseout', hideNeoronPreview);

  // Observador para MODIFICAR o tooltip padrão do Neoron em vez de criar um novo.
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(node => {
        // Verifica se o nó adicionado é o tooltip de chamada do Neoron
        if (node.nodeType === 1 && node.matches('.ant-tooltip.call-metadata-tooltip')) {
          const tooltipInner = node.querySelector('.ant-tooltip-inner');
          if (tooltipInner) {
            // Extrai a "Última mensagem" do texto do tooltip
            const fullText = tooltipInner.innerText;
            const match = fullText.match(/Última mensagem:\s*(.*)/);
            const message = match ? match[1].trim() : fullText.trim();

            // Modifica o conteúdo do tooltip original para mostrar apenas a mensagem
            tooltipInner.innerText = message;
            tooltipInner.style.whiteSpace = 'pre-wrap'; // Garante a quebra de linha
            tooltipInner.style.textAlign = 'left';
          }
        }
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
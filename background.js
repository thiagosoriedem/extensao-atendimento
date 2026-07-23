// background.js

let mensagensArmazenadas = [];

function atualizarMenuContexto() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "menu_principal",
      title: "📋 Inserir Mensagem Padrão",
      contexts: ["editable"]
    });

    chrome.storage.local.get({ 
      mensagens: [], 
      pastas: ["Consultas > Geral", "Exames > Geral", "Administrativo > Geral", "Outros"] 
    }, (resultado) => {
      mensagensArmazenadas = resultado.mensagens || []; // Armazena as mensagens
      const menusCriados = new Set();

      resultado.pastas.forEach(caminho => {
        const partes = caminho.split(" > ");
        let idAcumulado = "menu_principal";

        partes.forEach((parte, index) => {
          const idPasta = "cat_" + partes.slice(0, index + 1).join("_").toLowerCase().replace(/\s/g, "");
          
          if (!menusCriados.has(idPasta)) {
            chrome.contextMenus.create({
              id: idPasta,
              parentId: idAcumulado,
              title: (index === 0 ? "📁 " : "↳ ") + parte,
              contexts: ["editable"]
            });
            menusCriados.add(idPasta);
          }
          idAcumulado = idPasta;
        });
      });

      resultado.mensagens.forEach((msg) => {
        const caminhoMsg = msg.categoria || "Outros";
        const partesMsg = caminhoMsg.split(" > ");
        const idDestinoFinal = "cat_" + partesMsg.join("_").toLowerCase().replace(/\s/g, "");
        const paiFinal = menusCriados.has(idDestinoFinal) ? idDestinoFinal : "menu_principal";

        chrome.contextMenus.create({
          id: msg.id,
          parentId: paiFinal,
          title: msg.titulo,
          contexts: ["editable"]
        });
      });
    });
  });
}

chrome.runtime.onInstalled.addListener(atualizarMenuContexto);
chrome.runtime.onStartup.addListener(atualizarMenuContexto);

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const mensagemClicada = mensagensArmazenadas.find(msg => msg.id === info.menuItemId);
  if (mensagemClicada && tab.id) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: processarEInjetarTextoDoMenu,
      args: [mensagemClicada.texto]
    });
  }
});

chrome.runtime.onMessage.addListener((requisicao, sender, enviarResposta) => {
  if (requisicao.acao === "atualizar_menu") {
    atualizarMenuContexto();
    enviarResposta({ status: "ok" });
    return true;
  }

  // Ouve o pedido do content-agenda.js para trocar a unidade
  if (requisicao.acao === "trocarUnidadeAgenda" && sender.tab) {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN', // Executa no contexto da página, não no content script
      func: (idClinica) => {
        // Esta função é executada na página e tem acesso às funções dela
        if (typeof listar_clinicas === 'function' && typeof trocar_clinica === 'function') {
          console.log(`Executando troca para clínica ID: ${idClinica}`);
          listar_clinicas(); // Abre o modal (pode ser necessário para a sessão)
          trocar_clinica(idClinica); // Troca a clínica diretamente
        } else {
          console.error('As funções listar_clinicas ou trocar_clinica não estão disponíveis.');
        }
      },
      args: [requisicao.idClinica]
    });
    return true;
  }

  // Ouve o pedido do popup.js para iniciar a remarcação em lote
  if (requisicao.acao === 'iniciarRemarcacaoLote') {
    // Encontra a aba ativa do MedicalSys para enviar o comando
    chrome.tabs.query({ active: true, url: "*://app.medicalsys.com.br/atendimento/agenda/calendario/*" }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, requisicao);
      } else {
        alert('Nenhuma aba da agenda do MedicalSys foi encontrada. Por favor, navegue até a agenda e tente novamente.');
      }
    });
    return true; // Manter canal aberto para respostas assíncronas
  }

  // Ouve o pedido do content-agenda.js para executar o clique que abre o popover.
  // Isso é necessário para contornar o Content Security Policy (CSP) da página,
  // que bloqueia a injeção de scripts inline a partir do content script.
  if (requisicao.acao === 'executarCliquePopover' && sender.tab) {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN', // Executa no contexto da página para ter acesso ao jQuery e aos event listeners.
      func: (elementId) => {
        const el = document.getElementById(elementId);
        if (el) {
            const clickTarget = el.querySelector('div.fc-content > div > div > div') || el;
            const jq = window.jQuery || window.$;
            
            // A forma mais confiável é chamar o método .popover('show') da biblioteca.
            if (jq && typeof jq(clickTarget).popover === 'function') {
                jq(clickTarget).popover('show');
            } else {
                // Fallback para simular cliques duplos se a função .popover não estiver disponível.
                if (jq) {
                    jq(clickTarget).trigger('click');
                    setTimeout(() => jq(clickTarget).trigger('click'), 150);
                } else {
                    clickTarget.click();
                    setTimeout(() => clickTarget.click(), 150);
                }
            }
            el.removeAttribute('id'); // Limpa o ID temporário após o uso.
        }
      },
      args: [requisicao.elementId]
    }).then(() => enviarResposta({ status: "clique executado" }))
      .catch(err => console.error("Falha ao executar script de clique:", err));
    return true; // Manter canal aberto para resposta assíncrona.
  }
});

function processarEInjetarTextoDoMenu(textoOriginal) {
  let textoFinal = textoOriginal;
  const nomeAutomatico = null; // Funcionalidade de nome automático removida

  const horaAtual = new Date().getHours();
  let saudacao = "";
  if (horaAtual >= 5 && horaAtual < 12) {
    saudacao = "Bom dia";
  } else if (horaAtual >= 12 && horaAtual < 18) {
    saudacao = "Boa tarde";
  } else {
    saudacao = "Boa noite";
  }

  const mapaTags = [
    { tag: "{nome}", promptMsg: "Digite o NOME do paciente/responsável:", valorAuto: nomeAutomatico },
    { tag: "{convenio}", promptMsg: "Digite o CONVÊNIO:", valorAuto: null },
    { tag: "{medico}", promptMsg: "Digite o nome do(a) MÉDICO(A):", valorAuto: null },
    { tag: "{exame}", promptMsg: "Digite o nome do EXAME/PROCEDIMENTO:", valorAuto: null },
    { tag: "{unidade}", promptMsg: "Digite a UNIDADE:", valorAuto: null },
    { tag: "{valor}", promptMsg: "Digite o VALOR:", valorAuto: null },
    { tag: "{data}", promptMsg: "Digite a DATA:", valorAuto: null },
    { tag: "{hora}", promptMsg: "Digite o HORÁRIO:", valorAuto: null },
    { tag: "{cpf}", promptMsg: "Digite o CPF:", valorAuto: null },
    { tag: "{saudacao}", promptMsg: "", valorAuto: saudacao }
  ];

  for (const item of mapaTags) {
    if (textoFinal.includes(item.tag)) {
      let valorFinal = item.valorAuto;
      if (!valorFinal) {
        const valorUsuario = prompt(item.promptMsg);
        if (valorUsuario === null) return; 
        valorFinal = valorUsuario.trim();
      }
      textoFinal = textoFinal.split(item.tag).join(valorFinal);
    }
  }

  const elementoAtivo = document.activeElement;
  if (elementoAtivo) {
    if (elementoAtivo.value !== undefined) {
      const start = elementoAtivo.selectionStart || 0;
      const end = elementoAtivo.selectionEnd || 0;
      elementoAtivo.value = elementoAtivo.value.substring(0, start) + textoFinal + elementoAtivo.value.substring(end);
      elementoAtivo.dispatchEvent(new Event('input', { bubbles: true }));
      elementoAtivo.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (elementoAtivo.isContentEditable) {
      document.execCommand('insertText', false, textoFinal);
    }
  }
}
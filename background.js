// background.js

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
  chrome.storage.local.get({ mensagens: [] }, (resultado) => {
    const mensagemClicada = resultado.mensagens.find(msg => msg.id === info.menuItemId);
    if (mensagemClicada && tab.id) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: processarEInjetarTextoDoMenu,
        args: [mensagemClicada.texto]
      });
    }
  });
});

chrome.runtime.onMessage.addListener((requisicao, sender, enviarResposta) => {
  if (requisicao.acao === "atualizar_menu") {
    atualizarMenuContexto();
    enviarResposta({ status: "ok" });
    return true;
  }
});

function processarEInjetarTextoDoMenu(textoOriginal) {
  let textoFinal = textoOriginal;
  let nomeAutomatico = null;
  const elementoNome = document.querySelector('.name span') || document.querySelector('.name');
  if (elementoNome) {
    let nomeLimpo = (elementoNome.textContent || elementoNome.innerText || "").trim().split('\n')[0];
    if (nomeLimpo.length > 0) nomeAutomatico = nomeLimpo;
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
    { tag: "{cpf}", promptMsg: "Digite o CPF:", valorAuto: null }
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
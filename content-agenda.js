// content-agenda.js

console.log("TextSync PRO - Módulo de Agenda carregado.");
let mapeamentoMedicoUnidade = {};

// Carrega o mapeamento do storage ao iniciar
function carregarMapeamento() {
    chrome.storage.local.get('mapeamentoAgenda', (data) => {
        if (data.mapeamentoAgenda) {
            mapeamentoMedicoUnidade = data.mapeamentoAgenda;
            console.log("Mapeamento de agenda carregado do storage.", mapeamentoMedicoUnidade);
        } else {
            console.log("Nenhum mapeamento de agenda encontrado no storage.");
        }
    });
}

// Escuta por mudanças no storage para atualizar o mapeamento em tempo real
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.mapeamentoAgenda) {
        mapeamentoMedicoUnidade = changes.mapeamentoAgenda.newValue;
        console.log("Mapeamento de agenda atualizado em tempo real.");
        // Se um médico já estiver selecionado, atualiza o botão
        const selectProfissional = document.getElementById('calendarProfissional');
        if (selectProfissional && selectProfissional.value) {
            injetarBotao(selectProfissional);
        }
    }
});

function getUnidadeAtual(medicoId) {
    const medico = mapeamentoMedicoUnidade[medicoId];
    if (!medico) return null;

    const agora = new Date();
    const diaSemana = agora.getDay(); // 0=Domingo, 1=Segunda, ...
    const horaAtual = agora.getHours() + agora.getMinutes() / 60;

    for (const horario of medico.horarios) {
        if (horario.dia === diaSemana && horaAtual >= horario.inicio && horaAtual < horario.fim) {
            return horario.unidade;
        }
    }
    return null; // Fora do horário de atendimento
}

// Mapeia o nome da unidade para o ID da clínica usado nos botões de seleção
const mapaUnidadeParaIdClinica = {
    "SOS OTORRINO MANAIRA": "491",
    "SOS OTORRINO ALTIPLANO": "835",
    "SOS OTORRINO TAMBAÚ DIA": "499",
    "SOS OTORRINO BESSA": "502",
    "SOS OTORRINO CAMPINA GRANDE": "506",
    "SOS OTORRINO VALENTINA": "505",
    "SOS OTORRINO MANGABEIRA": "504",
    "SOS OTORRINO TORRE": "503",
    "SOS OTORRINO TAMBAU 24 HRS": "501",
    "SOS OTORRINO TELEMEDICINA": "532",
    "CAMPINA GRANDE - DESIGN MALL": "1424"
};

function simularClique(elemento) {
    if (elemento) {
        elemento.click();
        return true;
    }
    return false;
}

async function trocarUnidade(unidadeNome) {
    console.log(`Iniciando troca para unidade: ${unidadeNome}`);

    // 1. Clicar no botão para abrir o modal de clínicas
    const btnListarClinicas = document.querySelector('a[onclick="listar_clinicas()"]');
    if (!simularClique(btnListarClinicas)) {
        console.error("Botão 'listar_clinicas()' não encontrado.");
        return;
    }

    // 2. Aguardar o modal aparecer e encontrar a clínica correta
    await new Promise(resolve => setTimeout(resolve, 500)); // Espera para o modal

    const corpoModal = document.getElementById('body-modal-lista-clinicas');
    if (!corpoModal) {
        console.error("Modal de clínicas não foi encontrado.");
        return;
    }

    let linkClinica = null;
    const linhas = corpoModal.querySelectorAll('tr');
    for (const linha of linhas) {
        const nomeTd = linha.querySelector('td.text-left');
        if (nomeTd && nomeTd.textContent.trim().toUpperCase() === unidadeNome.toUpperCase()) {
            linkClinica = linha.querySelector('a[href*="trocar_clinica"]');
            break;
        }
    }

    if (!linkClinica) {
        console.error(`Clínica "${unidadeNome}" não encontrada no modal.`);
        // Tenta fechar o modal
        const btnFechar = document.querySelector('#modal_lista_clinicas .modal-header button.close');
        simularClique(btnFechar);
        return;
    }

    // 3. Clicar no link da clínica para trocar
    // A função `trocar_clinica` já está no href, então não precisamos simular o clique no `<a>`
    // mas sim executar a função que ele chama.
    const href = linkClinica.getAttribute('href');
    const match = href.match(/javascript:trocar_clinica\((\d+)\)/);
    if (match) {
        const clinicaId = match[1];
        console.log(`Trocando para o ID da clínica: ${clinicaId}`);
        // [CORREÇÃO] Injeta o script diretamente na página para garantir que ele possa chamar a função.
        const script = document.createElement('script');
        script.textContent = `trocar_clinica(${clinicaId});`;
        (document.head||document.documentElement).appendChild(script);
        script.remove();
    } else {
        console.error("Não foi possível executar a função trocar_clinica.");
        return; // Aborta se a função principal falhar
    }

    // 4. [CORREÇÃO] Usar MutationObserver para aguardar a atualização da UI de forma robusta
    // e então clicar no botão da unidade correta.
    const containerUnidades = document.querySelector('.selecao-unidades');
    if (!containerUnidades) {
        console.error("Container de seleção de unidades não encontrado para observar.");
        return;
    }
    const observerUnidade = new MutationObserver((mutations, obs) => {
        const idClinicaAlvo = mapaUnidadeParaIdClinica[unidadeNome.toUpperCase()];
        if (!idClinicaAlvo) {
            console.error(`ID da clínica para a unidade "${unidadeNome}" não encontrado no mapeamento.`);
            obs.disconnect();
            return;
        }

        // Tenta encontrar o botão da unidade alvo a cada mutação
        const botaoUnidade = document.querySelector(`.selecao-unidades button input[idclinica="${idClinicaAlvo}"]`);
        if (botaoUnidade && botaoUnidade.parentElement.style.display !== 'none') {
            simularClique(botaoUnidade.parentElement); // Clica no <button> pai do <input>
            console.log(`Unidade "${unidadeNome}" (ID: ${idClinicaAlvo}) selecionada com sucesso.`);
            obs.disconnect(); // Para de observar após o sucesso
        }
    });

    // Inicia a observação no container dos botões de unidade
    observerUnidade.observe(containerUnidades, {
        childList: true, // Observa adição/remoção de botões
        subtree: true,   // Observa mudanças nos filhos dos botões
        attributes: true, // Observa mudanças de atributos (como 'style')
        attributeFilter: ['style'] // Foca em mudanças de estilo (display: none -> block)
    });

    // Adiciona um timeout de segurança para parar de observar após 5 segundos se nada acontecer
    setTimeout(() => {
        observerUnidade.disconnect();
    }, 5000);
}

function injetarBotao(selectProfissional) {
    // Remove o botão antigo, se houver
    const botaoAntigo = document.getElementById('ts-troca-automatica');
    if (botaoAntigo) {
        botaoAntigo.remove();
    }

    const medicoId = selectProfissional.value;
    const unidadeSugerida = getUnidadeAtual(medicoId);

    if (!unidadeSugerida) {
        return; // Não faz nada se não houver sugestão
    }

    const medicoInfo = mapeamentoMedicoUnidade[medicoId];
    const nomeMedico = medicoInfo ? medicoInfo.nome : "Profissional";

    const botao = document.createElement('div');
    botao.id = 'ts-troca-automatica';
    botao.innerHTML = `
        <span style="font-weight: 500;">Sugestão de Unidade para ${nomeMedico}:</span>
        <strong style="color: #2563eb;">${unidadeSugerida}</strong>
        <button style="margin-left: 10px; padding: 4px 8px; border: 1px solid #2563eb; background-color: #dbeafe; color: #2563eb; border-radius: 4px; cursor: pointer;">
            Trocar Automaticamente
        </button>
    `;
    Object.assign(botao.style, {
        backgroundColor: '#eff6ff',
        border: '1px solid #93c5fd',
        padding: '8px 12px',
        borderRadius: '6px',
        marginTop: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '13px',
        color: '#1e3a8a'
    });

    botao.querySelector('button').addEventListener('click', (e) => {
        e.preventDefault();
        const targetButton = e.currentTarget;
        targetButton.textContent = "Trocando...";
        targetButton.disabled = true;
        trocarUnidade(unidadeSugerida);
    });

    // Insere o botão logo após o container do select
    selectProfissional.parentElement.insertAdjacentElement('afterend', botao);
}


// Observador para detectar quando o select de profissionais é adicionado à página
const observer = new MutationObserver((mutations, obs) => {
    const selectProfissional = document.getElementById('calendarProfissional');
    if (selectProfissional) {
        console.log("Select 'calendarProfissional' encontrado.");
        
        // Adiciona o listener para o evento 'change'
        selectProfissional.addEventListener('change', () => {
            injetarBotao(selectProfissional);
        });

        // Verifica se já há um médico selecionado no carregamento
        if (selectProfissional.value) {
            injetarBotao(selectProfissional);
        }

        obs.disconnect(); // Para de observar uma vez que o elemento foi encontrado e o listener adicionado
    }
});

// Inicia a observação no corpo do documento
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Carrega os dados iniciais
carregarMapeamento();
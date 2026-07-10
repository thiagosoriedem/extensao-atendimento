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

function trocarUnidade(unidadeNome) {
    console.log(`Iniciando troca para unidade: ${unidadeNome}`);
    const idClinica = mapaUnidadeParaIdClinica[unidadeNome.toUpperCase()];
    if (!idClinica) {
        console.error(`ID da clínica para a unidade "${unidadeNome}" não encontrado.`);
        return;
    }

    // Envia uma mensagem para o background script para executar a troca de unidade
    // no contexto da página (MAIN world), contornando o CSP.
    chrome.runtime.sendMessage({
        acao: "trocarUnidadeAgenda",
        idClinica: idClinica
    });
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

    // Pega o nome da unidade atualmente selecionada na interface
    const elementoUnidadeAtual = document.querySelector('.selecao-unidades button.btn-success span.nome_clinica_selecionada');
    const unidadeAtual = elementoUnidadeAtual ? elementoUnidadeAtual.textContent.trim().toUpperCase() : null;

    console.log(`Unidade Sugerida: ${unidadeSugerida.toUpperCase()}`);
    console.log(`Unidade Atual na Tela: ${unidadeAtual}`);

    // Só exibe o botão se a sugestão for diferente da unidade já selecionada
    if (unidadeAtual && unidadeAtual === unidadeSugerida.toUpperCase()) {
        return;
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
        // Não desconectamos mais o observer.
        // Isso garante que, se o select for recriado dinamicamente na página
        // (sem um reload completo), o listener seja adicionado novamente.
        // obs.disconnect(); 
    }
});

// Inicia a observação no corpo do documento
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Carrega os dados iniciais
carregarMapeamento();
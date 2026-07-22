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
    // Garante a remoção de qualquer botão ou mensagem anterior antes de processar.
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
        const mensagemSucesso = document.createElement('div');
        mensagemSucesso.id = 'ts-troca-automatica'; // Usa o mesmo ID para ser substituído
        mensagemSucesso.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="#166534" style="margin-right: 8px; flex-shrink: 0;">
                <path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4 8-8z"/>
            </svg>
            <span style="font-weight: 500;">Você já está na unidade correta:</span>
            <strong style="margin-left: 5px;">${unidadeSugerida}</strong>
        `;
        Object.assign(mensagemSucesso.style, {
            backgroundColor: '#f0fdf4', // Verde bem claro
            border: '1px solid #86efac', // Borda verde clara
            color: '#15803d', // Texto verde escuro
            padding: '8px 12px',
            borderRadius: '6px',
            marginTop: '10px',
            display: 'flex',
            alignItems: 'center',
            fontSize: '13px'
        });

        selectProfissional.parentElement.insertAdjacentElement('afterend', mensagemSucesso);
        return; // Para a execução aqui
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


// Abordagem mais robusta com MutationObserver para monitorar continuamente a página.
// Isso garante que a funcionalidade seja re-aplicada mesmo se o elemento for recriado dinamicamente.
const observer = new MutationObserver(() => {
    const selectProfissional = document.getElementById('calendarProfissional');

    // Garante que o elemento exista e que ainda não adicionamos nosso listener a ele.
    if (selectProfissional && !selectProfissional.dataset.tsListenerAttached) {
        console.log("TextSync: Select 'calendarProfissional' encontrado. Adicionando listener.");
        selectProfissional.dataset.tsListenerAttached = 'true'; // Marca o elemento para evitar duplicidade de listeners

        // Adiciona o listener para o evento 'change'
        selectProfissional.addEventListener('change', () => {
            console.log("TextSync: Médico alterado, verificando unidade...");
            injetarBotao(selectProfissional);
        });

        // Verifica se já há um médico selecionado no carregamento da página
        if (selectProfissional.value) {
            injetarBotao(selectProfissional);
        }
    }
});

// Inicia a observação no corpo do documento, monitorando adições/remoções de elementos na árvore.
observer.observe(document.body, { childList: true, subtree: true });

// Carrega os dados iniciais
carregarMapeamento();

// ================== LÓGICA DE REMARCAÇÃO EM LOTE ==================

let isRescheduleCancelled = false; // Flag para controlar o cancelamento

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.acao === 'iniciarRemarcacaoLote') {
        const { sourceAgendaId, destinationAgendaId, newDate, observation } = request;
        
        const selectProfissional = document.getElementById('calendarProfissional');
        if (!selectProfissional || selectProfissional.value !== sourceAgendaId) {
            // Tenta obter o nome da agenda a partir do select no popup, se possível.
            // Como não temos acesso direto, usamos uma string genérica.
            alert(`Ação cancelada. A agenda de origem selecionada na extensão não é a mesma que está selecionada na página do MedicalSys. Por favor, selecione a agenda de origem correta na página e tente novamente.`);
            return;
        }

        startMassReschedule(destinationAgendaId, newDate, observation);
        sendResponse({ status: "iniciado" });
    }
    return true; // Manter canal aberto para respostas assíncronas
});

async function startMassReschedule(destinationAgendaId, newDate, observation) {
    isRescheduleCancelled = false; // Reseta a flag no início de cada processo

    const appointmentSelector = 'div.fc-event-container > a.fc-time-grid-event';
    const initialAppointmentElements = document.querySelectorAll(appointmentSelector);
    if (initialAppointmentElements.length === 0) {
        alert('Nenhum agendamento encontrado na agenda de origem para remarcar.');
        return;
    }

    const totalAppointments = initialAppointmentElements.length;
    const progressOverlay = createProgressOverlay(totalAppointments);
    document.body.appendChild(progressOverlay);

    // Adiciona o listener para o botão de cancelar
    const cancelButton = document.getElementById('ts-cancel-reschedule');
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            isRescheduleCancelled = true;
            cancelButton.textContent = 'Cancelando...';
            cancelButton.disabled = true;
        });
    }

    let processedCount = 0;
    // A lógica foi revertida para um loop 'while', que é mais robusto para lidar com
    // uma lista de elementos que se modifica a cada iteração.
    while (processedCount < totalAppointments) {
        if (isRescheduleCancelled) {
            console.log("TextSync PRO: Remarcação em lote cancelada pelo usuário.");
            break;
        }
        const currentAppointments = document.querySelectorAll(appointmentSelector);
        if (currentAppointments.length === 0) {
            console.warn("TextSync PRO: Não há mais agendamentos para processar. Encerrando.");
            break;
        }

        // Sempre processa o primeiro agendamento da lista atual.
        const appointmentToProcess = currentAppointments[0];
        
        await processAppointment(appointmentToProcess, destinationAgendaId, newDate, observation);
        
        processedCount++;
        updateProgress(processedCount, totalAppointments);

        // Pausa crucial: Após processar um agendamento, a página se atualiza.
        // Damos um tempo para a interface se atualizar antes de buscar o próximo agendamento.
        await new Promise(r => setTimeout(r, 1500));
    }

    progressOverlay.remove();
    if (isRescheduleCancelled) {
        alert('A remarcação em lote foi cancelada.');
    } else {
        alert('Remarcação em lote concluída!');
    }
    location.reload(); // Recarrega a página para refletir as mudanças
}

async function processAppointment(element, destinationAgendaId, newDate, observation) {
    return new Promise(async (resolve) => {
        // Com base na nova indicação do usuário, o clique será direcionado para a div 'fc-bg'.
        // Este elemento é uma camada de fundo que cobre toda a área do agendamento,
        // tornando-se um alvo de clique mais confiável. O seletor foi confirmado pelo usuário no console.
        const clickTarget = element.querySelector('div.fc-content > div > div > div');
        if (clickTarget) {
            // O usuário confirmou que executar .click() duas vezes no console funciona.
            // Isso simula dois cliques rápidos para garantir que o pop-up seja acionado.
            clickTarget.click(); // Primeiro clique
            await new Promise(r => setTimeout(r, 50)); // Pequena pausa entre os cliques
            clickTarget.click(); // Segundo clique
        } else {
            console.warn('TextSync PRO: Alvo de clique específico ("div.fc-content > div > div > div") não encontrado. Usando o elemento principal.');
            element.click();
            await new Promise(r => setTimeout(r, 50));
            element.click();
        }
 
        // A versão anterior parou de funcionar por uma "race condition": a automação era mais rápida que a página para carregar o botão.
        // Esta versão corrigida espera diretamente pelo botão usando seu seletor mais estável ('data-original-title'), o que é mais confiável.
        // Mudança de estratégia: O atributo 'data-original-title' é carregado por um script de tooltip e pode demorar.
        // Vamos mirar no atributo 'onclick', que é mais estável e parte do HTML inicial do popover.
        const rescheduleButton = await waitForElement('.popover.in span[onclick^="reagendar"]', 5000);

        // Captura a data original do popover antes que ele seja fechado
        let originalDateText = '';
        const popoverForDate = document.querySelector('.popover.in');
        if (popoverForDate) {
            const popoverDateElement = popoverForDate.querySelector('.c-popover-header_date');
            if (popoverDateElement) {
                // Tenta formatar para DD/MM/YYYY
                const dateMatch = popoverDateElement.textContent.trim().match(/(\d{1,2})\s+de\s+([a-zA-Zç]+)\s+de\s+(\d{4})/);
                if (dateMatch) {
                    const day = dateMatch[1].padStart(2, '0');
                    const year = dateMatch[3];
                    const monthMap = { 'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04', 'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08', 'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12' };
                    const month = monthMap[dateMatch[2].toLowerCase()];
                    if (month) {
                        originalDateText = `${day}/${month}/${year}`;
                    } else {
                        originalDateText = popoverDateElement.textContent.trim(); // Fallback
                    }
                } else {
                    originalDateText = popoverDateElement.textContent.trim(); // Fallback
                }
            }
        }

        if (!rescheduleButton) {
            console.warn('TextSync PRO: Botão de reagendar não foi encontrado no popover. Pulando.');
            // Try to close any open popover to avoid getting stuck
            const popover = document.querySelector('.popover.in');
            if (popover) {
                const closeBtn = popover.querySelector('.c-popover-click-icon--close');
                if (closeBtn) {
                    closeBtn.click();
                } else {
                    // Fallback to just remove the element if no close button is found
                    popover.remove();
                }
            }
            await new Promise(r => setTimeout(r, 200)); // Wait for popover to close
            resolve();
            return;
        }

        rescheduleButton.click();

        const modal = await waitForElement('#modalAgenda.in', 4000);
        if (!modal) {
            console.error('TextSync PRO: Modal de agendamento não abriu. Pulando agendamento.');
            resolve();
            return;
        }

        // Espera especificamente pelo container do select2 ser renderizado dentro do modal.
        // Isso é mais confiável do que uma pausa fixa, pois garante que o componente está pronto.
        const select2Container = await waitForElement('#modalAgenda.in span[aria-labelledby="select2-id_medico-container"]', 4000);
        if (!select2Container) {
            console.error('TextSync PRO: O componente Select2 para médicos não foi encontrado no modal. Pulando.');
            // Tenta fechar o modal para não travar o fluxo
            const closeButton = modal.querySelector('button.close[data-dismiss="modal"]');
            if (closeButton) {
                closeButton.click();
            }
            await waitForElementToDisappear('#modalAgenda.in');
            resolve();
            return;
        }
        // Adiciona uma pequena pausa extra por segurança, após o elemento ser encontrado.
        await new Promise(r => setTimeout(r, 250));

        // IDs baseados na análise do sistema MedicalSys
        const professionalSelectInModal = modal.querySelector('#id_medico');
        const dateInputInModal = modal.querySelector('#id_momento');
        const saveButtonInModal = modal.querySelector('#salvar-agendamento');
        const observationTextarea = modal.querySelector('#id_observacoes');

        if (!professionalSelectInModal || !dateInputInModal || !saveButtonInModal) {
             console.error('TextSync PRO: Elementos essenciais (médico, data, salvar) não encontrados no modal. Pulando.');
             const closeButton = modal.querySelector('button.close[data-dismiss="modal"]');
             if (closeButton) {
                closeButton.click();
             }
             await waitForElementToDisappear('#modalAgenda.in');
             resolve();
             return;
        }

        // Define a nova data. O input[type=date] espera o formato YYYY-MM-DD, que já é o formato vindo da extensão.
        // A conversão para DD/MM/YYYY será feita apenas para o texto da observação.
        dateInputInModal.value = newDate;
        dateInputInModal.dispatchEvent(new Event('change', { bubbles: true }));

        await new Promise(r => setTimeout(r, 200)); // Pequena pausa entre as ações
        
        // Define o novo profissional (agenda de destino)
        professionalSelectInModal.value = destinationAgendaId;
        professionalSelectInModal.dispatchEvent(new Event('change', { bubbles: true }));

        // Preenche a observação, se houver
        if (observationTextarea && observation) {
            const formattedDate = newDate.split('-').reverse().join('/');
            let finalObservation = observation
                .replace('{data_original}', originalDateText)
                .replace('{data_nova}', formattedDate);
            observationTextarea.value = finalObservation;
        }

        // Pausa para observar os campos preenchidos
        await new Promise(r => setTimeout(r, 1500));

        // Clica em salvar
        saveButtonInModal.click();

        // Espera o modal fechar
        await waitForElementToDisappear('#modalAgenda.in', 10000);
        
        // Pequeno atraso antes de processar o próximo agendamento
        await new Promise(r => setTimeout(r, 500));

        resolve();
    });
}

function waitForElement(selector, timeout = 5000) {
    return new Promise(resolve => {
        const interval = 100;
        const endTime = Date.now() + timeout;
        const timer = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
                clearInterval(timer);
                resolve(element);
            } else if (Date.now() > endTime) {
                clearInterval(timer);
                resolve(null);
            }
        }, interval);
    });
}

function waitForElementWithText(selector, text, timeout = 5000) {
    return new Promise(resolve => {
        const interval = 100;
        const endTime = Date.now() + timeout;
        const timer = setInterval(() => {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                if (element.textContent.trim() === text) {
                    clearInterval(timer);
                    resolve(element);
                    return;
                }
            }
            if (Date.now() > endTime) {
                clearInterval(timer);
                resolve(null);
            }
        }, interval);
    });
}

function waitForElementToDisappear(selector, timeout = 10000) {
    return new Promise(resolve => {
        const interval = 100;
        const endTime = Date.now() + timeout;
        const timer = setInterval(() => {
            if (!document.querySelector(selector)) {
                clearInterval(timer);
                resolve(true);
            } else if (Date.now() > endTime) {
                clearInterval(timer);
                resolve(false);
            }
        }, interval);
    });
}

function createProgressOverlay(total) {
    const overlay = document.createElement('div');
    overlay.id = 'ts-progress-overlay';
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: '99999999',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        color: 'white', flexDirection: 'column', fontFamily: 'sans-serif', textAlign: 'center'
    });

    overlay.innerHTML = `
        <h2 style="margin: 0; font-size: 24px;">Remarcando Agendamentos...</h2>
        <p id="ts-progress-text" style="font-size: 18px; margin: 10px 0;">Processando 0 de ${total}</p>
        <div style="width: 80%; max-width: 500px; background: #555; border-radius: 5px; overflow: hidden; border: 1px solid #777;">
            <div id="ts-progress-bar" style="width: 0%; height: 20px; background: #16a34a; transition: width 0.3s ease;"></div>
        </div>
        <p style="margin-top: 20px; font-size: 14px; color: #ffc107;">Por favor, não interaja com a página durante o processo.</p>
        <button id="ts-cancel-reschedule" style="margin-top: 20px; padding: 8px 16px; font-size: 14px; background-color: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">Cancelar Processo</button>
    `;
    return overlay;
}

function updateProgress(current, total) {
    const progressText = document.getElementById('ts-progress-text');
    const progressBar = document.getElementById('ts-progress-bar');
    if (progressText && progressBar) {
        progressText.textContent = `Processando ${current} de ${total}`;
        progressBar.style.width = `${(current / total) * 100}%`;
    }
}
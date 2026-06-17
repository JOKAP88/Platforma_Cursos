// ==========================================================================
// CONTROLADOR DO PLAYER DE VÍDEO E PROGRESSO
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    const listaAulasSidebar      = document.getElementById("lista-aulas-sidebar");
    const videoPlayerContainer   = document.getElementById("video-player-container");
    const aulaTituloAtual        = document.getElementById("aula-titulo-atual");
    const btnConcluirAula        = document.getElementById("btn-concluir-aula");

    const parametros = new URLSearchParams(window.location.search);
    const cursoId    = parametros.get("curso");

    const utilizadorLogado = JSON.parse(sessionStorage.getItem("utilizadorLogado"));
    if (!utilizadorLogado || !utilizadorLogado.id) {
        window.location.href = "Login.html";
        return;
    }

    const alunoId = utilizadorLogado.id;
    let aulaAtivaId = null;

    // Mostra ecrã de acesso negado (403)
    function mostrarAcessoNegado(mensagem) {
        listaAulasSidebar.innerHTML = `
            <li style="padding:20px; color:#f59e0b; text-align:center; list-style:none;">
                <i class="fa-solid fa-lock" style="font-size:1.8rem; display:block; margin-bottom:10px;"></i>
                Acesso Pendente
            </li>`;

        videoPlayerContainer.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center;
                        justify-content:center; height:100%; color:#f8fafc;
                        padding:30px; text-align:center; background:#1e293b; border-radius:12px;">
                <i class="fa-solid fa-lock" style="font-size:3.5rem; color:#f59e0b; margin-bottom:18px;"></i>
                <h3 style="margin:0 0 12px 0; color:#fbbf24; font-size:1.4rem;">Acesso Pendente</h3>
                <p style="color:#94a3b8; max-width:380px; line-height:1.7; margin:0 0 8px 0;">
                    ${mensagem}
                </p>
                <p style="color:#64748b; font-size:0.85rem; margin:0 0 24px 0;">
                    Após confirmação do pagamento, o administrador ativa o teu acesso.
                </p>
                <a href="perfil.html" style="padding:11px 28px; background:#00bcd4;
                    color:white; text-decoration:none; border-radius:6px;
                    font-weight:bold; font-size:0.95rem;">
                    <i class="fa fa-arrow-left"></i> Voltar ao Perfil
                </a>
            </div>`;

        aulaTituloAtual.textContent = "Acesso Pendente";
        btnConcluirAula.disabled = true;
        btnConcluirAula.style.background = "#475569";
    }

    // 1. CARREGAR AULAS — com verificação de acesso no servidor
    async function carregarAulasDoPlayer() {
        try {
            const resposta = await fetch(
                `http://localhost:3000/api/cursos/${cursoId}/aulas?utilizadorId=${alunoId}`
            );

            // 403 = sem acesso (inativo ou sem inscrição)
            if (resposta.status === 403) {
                const erro = await resposta.json();
                mostrarAcessoNegado(erro.error || "O teu acesso ainda não foi ativado.");
                return;
            }

            const aulas = await resposta.json();
            listaAulasSidebar.innerHTML = "";

            if (aulas.length === 0) {
                listaAulasSidebar.innerHTML = "<li style='padding:20px; color:#aaa; list-style:none;'>Sem aulas neste curso.</li>";
                videoPlayerContainer.innerHTML = `
                    <div style="display:flex; align-items:center; justify-content:center;
                                height:100%; color:#94a3b8; flex-direction:column; gap:12px;">
                        <i class="fa-solid fa-circle-info" style="font-size:2rem; color:#00bcd4;"></i>
                        <p>Este curso ainda não tem aulas adicionadas.</p>
                    </div>`;
                return;
            }

            aulas.forEach((aula, index) => {
                const li = document.createElement("li");
                li.className = "aula-item";
                li.setAttribute("data-id", aula.id);

                const icone = aula.concluida === 1
                    ? `<i class="fa-solid fa-circle-check" style="color:#2ecc71;"></i>`
                    : `<i class="fa-regular fa-circle"></i>`;

                li.innerHTML = `
                    <div class="aula-item-conteudo">
                        ${icone}
                        <span>${aula.titulo}</span>
                    </div>`;

                li.addEventListener("click", () => mudarAulaAtiva(aula, li));
                listaAulasSidebar.appendChild(li);

                if (aulaAtivaId === null && index === 0) {
                    mudarAulaAtiva(aula, li);
                } else if (aulaAtivaId === aula.id) {
                    li.classList.add("ativa");
                }
            });

        } catch (erro) {
            console.error("Erro no player:", erro);
            videoPlayerContainer.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center;
                            justify-content:center; height:100%; color:#94a3b8;
                            padding:20px; text-align:center;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size:2.5rem; color:#f59e0b; margin-bottom:10px;"></i>
                    <p>Não foi possível ligar ao servidor. Verifica se o servidor está a correr.</p>
                </div>`;
        }
    }

    // 2. MUDAR AULA ATIVA
    function mudarAulaAtiva(aula, elementoLi) {
        aulaAtivaId = aula.id;
        aulaTituloAtual.textContent = aula.titulo;

        document.querySelectorAll(".aula-item").forEach(item => item.classList.remove("ativa"));
        elementoLi.classList.add("ativa");

        btnConcluirAula.disabled = false;
        if (aula.concluida === 1) {
            btnConcluirAula.innerHTML = `<i class="fa-solid fa-check-double"></i> Aula Concluída!`;
            btnConcluirAula.style.background = "#2ecc71";
        } else {
            btnConcluirAula.innerHTML = `<i class="fa-regular fa-circle-check"></i> Marcar como Concluída`;
            btnConcluirAula.style.background = "#00bcd4";
        }

        // Carregar vídeo YouTube
        const fonteSegura = (aula.video_fonte || "").toLowerCase().trim();

        if (fonteSegura === "youtube") {
            videoPlayerContainer.innerHTML = `
                <iframe
                    width="100%" height="100%"
                    src="https://www.youtube.com/embed/${aula.video_id}?rel=0&autoplay=0"
                    title="${aula.titulo}"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen>
                </iframe>`;
        } else {
            videoPlayerContainer.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center;
                            justify-content:center; height:100%; color:#94a3b8;
                            padding:20px; text-align:center;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size:2.5rem; color:#f59e0b; margin-bottom:10px;"></i>
                    <p>Não foi possível carregar o vídeo desta aula.</p>
                    <small style="color:#64748b;">Fonte configurada: "${aula.video_fonte}"</small>
                </div>`;
        }
    }

    // 3. BOTÃO MARCAR AULA COMO CONCLUÍDA
    btnConcluirAula.addEventListener("click", async () => {
        if (!aulaAtivaId || !alunoId) return;
        btnConcluirAula.disabled = true;

        try {
            const resposta = await fetch('http://localhost:3000/api/progresso/concluir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ utilizador_id: alunoId, aula_id: aulaAtivaId })
            });

            if (resposta.ok) {
                await carregarAulasDoPlayer();
                // Reclica na aula ativa para atualizar o botão
                document.querySelectorAll(".aula-item").forEach(item => {
                    if (item.getAttribute("data-id") == aulaAtivaId) item.click();
                });
            }
        } catch (erro) {
            console.error(erro);
        } finally {
            btnConcluirAula.disabled = false;
        }
    });

    carregarAulasDoPlayer();
});

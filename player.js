// ==========================================================================
// CONTROLADOR DO PLAYER DE VÍDEO E PROGRESSO
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    const listaAulasSidebar = document.getElementById("lista-aulas-sidebar");
    const videoPlayerContainer = document.getElementById("video-player-container");
    const aulaTituloAtual = document.getElementById("aula-titulo-atual");
    const btnConcluirAula = document.getElementById("btn-concluir-aula");

    const parametros = new URLSearchParams(window.location.search);
    const cursoId = parametros.get("curso");

    const utilizadorLogado = JSON.parse(sessionStorage.getItem("utilizadorLogado"));
    if (!utilizadorLogado || !utilizadorLogado.id) {
        window.location.href = "login.html";
        return;
    }

    const alunoId = utilizadorLogado.id;
    let aulaAtivaId = null;

    // 1. CARREGAR AULAS DA API (Agora com o progresso incluído)
    async function carregarAulasDoPlayer() {
        try {
            // Enviamos o alunoId para o servidor saber o que está concluído
            const resposta = await fetch(`http://localhost:3000/api/cursos/${cursoId}/aulas?utilizadorId=${alunoId}`);
            const aulas = await resposta.json();

            listaAulasSidebar.innerHTML = "";

            if (aulas.length === 0) {
                listaAulasSidebar.innerHTML = "<p class='vazio'>Sem aulas neste curso.</p>";
                return;
            }

            aulas.forEach((aula, index) => {
                const li = document.createElement("li");
                li.className = "aula-item";
                li.setAttribute("data-id", aula.id);
                
                // Se a aula estiver concluída na BD, mete o ícone preenchido, se não, mete o círculo vazio
                const icone = aula.concluida === 1 
                    ? `<i class="fa-solid fa-circle-check" style="color: #2ecc71;"></i>` 
                    : `<i class="fa-regular fa-circle"></i>`;

                li.innerHTML = `
                    <div class="aula-item-conteudo">
                        ${icone}
                        <span>${aula.titulo}</span>
                    </div>
                `;

                li.addEventListener("click", () => {
                    mudarAulaAtiva(aula, li);
                });

                listaAulasSidebar.appendChild(li);

                // Inicia o player com a primeira aula do curso ou mantém a que estava selecionada
                if (aulaAtivaId === null && index === 0) {
                    mudarAulaAtiva(aula, li);
                } else if (aulaAtivaId === aula.id) {
                    // Mantém o destaque visual se houver um recarregamento por clique
                    li.classList.add("ativa");
                }
            });

        } catch (erro) {
            console.error("Erro no player:", erro);
        }
    }

    // 2. FUNÇÃO PARA MUDAR A AULA (Garante o Reset e a Cor do Botão)
    function mudarAulaAtiva(aula, elementoLi) {

        console.log("📦 DADOS REAIS QUE CHEGARAM DA AULA:", aula);

        aulaAtivaId = aula.id;
        aulaTituloAtual.textContent = aula.titulo;

        document.querySelectorAll(".aula-item").forEach(item => item.classList.remove("ativa"));
        elementoLi.classList.add("ativa");

        // CONFIGURAÇÃO DINÂMICA DO BOTÃO DEPENDENDO DO ESTADO DA AULA
        btnConcluirAula.disabled = false;
        if (aula.concluida === 1) {
            btnConcluirAula.innerHTML = `<i class="fa-solid fa-check-double"></i> Aula Concluída!`;
            btnConcluirAula.style.background = "#2ecc71"; // Verde
        } else {
            btnConcluirAula.innerHTML = `<i class="fa-regular fa-circle-check"></i> Marcar como Concluída`;
            btnConcluirAula.style.background = "#00bcd4"; // Azul original
        }

        // Carrega o vídeo do YouTube
        const fonteSegura = (aula.video_fonte || "").toLowerCase().trim();

if (fonteSegura === "youtube") {
    // Injeta o player diretamente na página dentro do nosso wrapper-video CSS
    videoPlayerContainer.innerHTML = `
        <iframe 
            width="100%" 
            height="100%" 
            src="https://www.youtube.com/embed/${aula.video_id}&rel=0&autoplay=0" 
            title="${aula.titulo}" 
            frameborder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen>
        </iframe>
    `;
} else {
    // Se a fonte não for youtube (ou houver erro de escrita na BD) avisa-nos na consola:
    console.warn(`⚠️ Fonte de vídeo desconhecida ou não suportada: "${aula.video_fonte}" para a aula ID: ${aula.id}`);
    videoPlayerContainer.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#94a3b8; padding:20px; text-align:center;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; color: #f59e0b; margin-bottom: 10px;"></i>
            <p>Não foi possível carregar o player integrado para esta aula.</p>
            <small style="color: #64748b;">Fonte configurada na BD: "${aula.video_fonte}"</small>
        </div>
    `;
}
    }

    // 3. EVENTO DE CLIQUE NO BOTÃO DE PROGRESSO
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
                // Atualiza a lista lateral e o estado das aulas sem perder o ritmo
                await carregarAulasDoPlayer();
                
                // Encontra a aula atualizada na lista para reajustar o botão imediatamente
                const itens = document.querySelectorAll(".aula-item");
                itens.forEach(item => {
                    if(item.getAttribute("data-id") == aulaAtivaId) {
                        item.click(); // Simula o clique para forçar o botão a mudar de cor
                    }
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
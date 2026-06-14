// ==========================================
// 1. CONEXÃO COM O SERVIDOR (BACK-END)
// ==========================================
let listaCursos = [];

// Executa tudo assim que o navegador carregar o HTML
document.addEventListener("DOMContentLoaded", () => {
    
    // Elementos Globais do HTML
    const gridCursos = document.getElementById("dinamico-cursos-grid");
    const gridDestaques = document.getElementById("destaque-cursos-grid");
    const filtroCategoria = document.getElementById("categoria-filtro");
    const mobileToggle = document.querySelector(".mobile-toggle");
    const navMenu = document.querySelector(".nav-menu");

    // --- FUNÇÃO CENTRAL: Carregar Cursos do Servidor Node.js ---
    async function carregarCursosDoServidor() {
        try {
            const resposta = await fetch('http://localhost:3000/api/cursos');
            listaCursos = await resposta.json();
            
            // Renderiza nas páginas correspondentes se os elementos existirem
            if (gridCursos) renderizarCursos(listaCursos, gridCursos);
            if (gridDestaques) renderizarCursos(listaCursos, gridDestaques);
        } catch (erro) {
            console.error("Erro ao procurar cursos no servidor:", erro);
        }
    }

    // ==========================================
    // 2. MENU MOBILE
    // ==========================================
    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener("click", () => {
            navMenu.classList.toggle("active");
            mobileToggle.classList.toggle("open");
        });
    }

    // ==========================================
    // 3. FUNÇÃO PARA GERAR OS CARTÕES DINAMICAMENTE
    // ==========================================
    function renderizarCursos(cursos, elementoDestino) {
        if (!elementoDestino) return;
        elementoDestino.innerHTML = "";

        if (cursos.length === 0) {
            elementoDestino.innerHTML = "<p style='color: white;'>Nenhum curso encontrado.</p>";
            return;
        }

        cursos.forEach(curso => {
            const urlImagem = curso.imagem.startsWith('http') || curso.imagem.startsWith('uploads') 
                ? `http://localhost:3000/${curso.imagem}` 
                : curso.imagem;

            const cardHTML = `
                <div class="flip-card" data-categoria="${curso.categoria}" data-id="${curso.id}">
                    <div class="flip-card-inner">
                        <div class="card-front">
                            <div class="card-front-info">
                                <span class="categoria">${curso.categoria}</span>
                                <span class="nivel">${curso.nivel}</span>
                                <span class="horas">${curso.duracao}</span>
                            </div>
                            <img src="${urlImagem}" alt="${curso.titulo}">
                            <h3>${curso.titulo}</h3>
                            <span class="btn-fake">Ver Curso</span>
                        </div>
                        <div class="card-back">
                            <div class="back-content">
                                <img src="${urlImagem}" alt="${curso.titulo}" class="back-img">
                                <h4>${curso.titulo}</h4>
                                <p>${curso.descricao}</p>
                                <hr>
                                <div class="back-footer">
                                    <span class="formador">${curso.formador}</span>
                                    <span class="valor">${curso.preco}</span>
                                </div>
                                <a href="descricao.html?id=${curso.id}" class="btn-ver-curso">Aceder ao Curso</a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            elementoDestino.insertAdjacentHTML("beforeend", cardHTML);
        });

        configurarCliquesDosCartoes(elementoDestino);
    }

    function configurarCliquesDosCartoes(elementoDestino) {
        const cartoes = elementoDestino.querySelectorAll(".flip-card");
        cartoes.forEach(card => {
            card.addEventListener("click", (e) => {
                if (e.target.classList.contains("btn-ver-curso")) return;
                
                const cursoId = card.getAttribute("data-id");
                if (cursoId) {
                    window.location.href = `descricao.html?id=${cursoId}`;
                }
            });
        });
    }

    // ==========================================
    // 4. FILTRO DE CATEGORIAS
    // ==========================================
    if (filtroCategoria && gridCursos) {
        filtroCategoria.addEventListener("change", (evento) => {
            const categoriaSelecionada = evento.target.value.trim().toLowerCase();
            
            if (categoriaSelecionada === "todos") {
                renderizarCursos(listaCursos, gridCursos);
            } else {
                const cursosFiltrados = listaCursos.filter(curso => curso.categoria.toLowerCase() === categoriaSelecionada);
                renderizarCursos(cursosFiltrados, gridCursos);
            }
        });
    }

    // ==========================================
    // 6. CARREGAMENTO DA PÁGINA DE DESCRIÇÃO
    // ==========================================
    if (document.getElementById("curso-titulo")) {
        const parametros = new URLSearchParams(window.location.search);
        const cursoId = parseInt(parametros.get("id"));

        async function inicializarDescricao() {
            await carregarCursosDoServidor();
            const cursoEncontrado = listaCursos.find(c => c.id === cursoId);

            if (cursoEncontrado) {
                const urlImagem = cursoEncontrado.imagem.startsWith('uploads') 
                    ? `http://localhost:3000/${cursoEncontrado.imagem}` 
                    : cursoEncontrado.imagem;

                document.getElementById("pagina-titulo").textContent = `Curso - ${cursoEncontrado.titulo}`;
                document.getElementById("curso-titulo").textContent = cursoEncontrado.titulo;
                document.getElementById("curso-formador").textContent = cursoEncontrado.formador;
                document.getElementById("curso-duracao").textContent = cursoEncontrado.duracao;
                document.getElementById("curso-imagem").src = urlImagem;
                document.getElementById("curso-imagem").alt = cursoEncontrado.titulo;
                document.getElementById("curso-descricao").textContent = cursoEncontrado.descricao;
                document.getElementById("curso-preco").textContent = cursoEncontrado.preco;

                const btnInscrever = document.getElementById("btn-inscrever"); 
                if (btnInscrever) {
                    btnInscrever.addEventListener("click", async (e) => {
                        e.preventDefault();

                        const utilizadorLogado = JSON.parse(sessionStorage.getItem("utilizadorLogado"));

                        if (!utilizadorLogado) {
                            alert("Precisas de fazer login para te inscreveres num curso!");
                            window.location.href = "login.html";
                            return;
                        }

                        const dadosInscricao = {
                            utilizador_id: utilizadorLogado.id, 
                            curso_id: cursoId 
                        };

                        try {
                            const resposta = await fetch('http://localhost:3000/api/inscricoes', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(dadosInscricao)
                            });

                            const resultado = await resposta.json();
                            alert(resultado.message);

                        } catch (erro) {
                            console.error("Erro ao efetuar inscrição:", erro);
                            alert("Erro ao ligar ao servidor.");
                        }
                    });
                }
            }
        }
        inicializarDescricao();
    }

    // ==========================================
    // 9. CONTROLO DINÂMICO DO MENU
    // ==========================================
    function ajustarMenuNavegacao() {
        const ulMenu = document.querySelector(".nav-menu ul");
        if (!ulMenu) return;

        const utilizadorLogado = JSON.parse(sessionStorage.getItem("utilizadorLogado"));

        if (utilizadorLogado) {
            const btnLogin = ulMenu.querySelector(".btn-login")?.parentElement;
            const btnRegistar = ulMenu.querySelector(".btn-registar")?.parentElement;
            if (btnLogin) btnLogin.remove();
            if (btnRegistar) btnRegistar.remove();

            if (utilizadorLogado.cargo === "admin") {
                const liAdmin = document.createElement("li");
                liAdmin.innerHTML = `<a href="admin.html" style="color: #ffc107; font-weight: bold;"><i class="fa fa-dashboard"></i> Painel Admin</a>`;
                ulMenu.appendChild(liAdmin);
            } 
            else if (utilizadorLogado.cargo === "aluno") {
                const liPerfil = document.createElement("li");
                liPerfil.innerHTML = `<a href="perfil.html" style="color: #00bcd4; font-weight: bold;"><i class="fa fa-user"></i> O Meu Perfil</a>`;
                ulMenu.appendChild(liPerfil);
            }

            const liUser = document.createElement("li");
            liUser.innerHTML = `<span style="color: #aaa; font-size: 15px;">Olá, <strong>${utilizadorLogado.nome}</strong></span>`;
            ulMenu.appendChild(liUser);

            const liLogout = document.createElement("li");
            liLogout.innerHTML = `<a href="#" id="btn-logout" class="btn-login" style="background-color: #e22b2b;">Sair</a>`;
            ulMenu.appendChild(liLogout);

            document.getElementById("btn-logout").addEventListener("click", (e) => {
                e.preventDefault();
                sessionStorage.removeItem("utilizadorLogado");
                alert("Sessão terminada.");
                window.location.href = "index.html";
            });
        }
    }
    ajustarMenuNavegacao();

    // ==========================================
    // 9.1 REGISTO DE NOVOS UTILIZADORES (MYSQL)
    // ==========================================
    const formRegisto = document.getElementById("registo-form"); 
    if (formRegisto) {
        formRegisto.addEventListener("submit", async (e) => {
            e.preventDefault();

            const dados = {
                nome: document.getElementById("registo-nome").value.trim(),
                apelido: document.getElementById("registo-apelido").value.trim(),
                email: document.getElementById("registo-email").value.trim(),
                password: document.getElementById("registo-password").value
            };

            try {
                const resposta = await fetch('http://localhost:3000/api/registar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dados)
                });

                const resultado = await resposta.json();

                if (resposta.ok) {
                    alert("Conta criada com sucesso! Já podes fazer login.");
                    window.location.href = "login.html";
                } else {
                    alert(resultado.message);
                }
            } catch (erro) {
                console.error("Erro ao registar:", erro);
                alert("Erro ao ligar ao servidor.");
            }
        });
    }

    // ==========================================
    // 9.2 LOGIN E RECUPERAÇÃO DE UTILIZADORES (MYSQL)
    // ==========================================
    const formLogin = document.getElementById("Login-form"); 
    if (formLogin) {
        
        const recuperarForm = document.getElementById("Recuperar-form");
        const linkEsqueci = document.getElementById("link-esqueci");
        const linkVoltarLogin = document.getElementById("link-voltar-login");

        if (linkEsqueci && recuperarForm && linkVoltarLogin) {
            linkEsqueci.addEventListener("click", (e) => {
                e.preventDefault();
                formLogin.style.display = "none";
                recuperarForm.style.display = "block";
            });

            linkVoltarLogin.addEventListener("click", (e) => {
                e.preventDefault();
                recuperarForm.style.display = "none";
                formLogin.style.display = "block";
            });

            recuperarForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const email = document.getElementById("recuperar-email").value.trim();
                const novaPassword = document.getElementById("recuperar-nova-password").value;

                try {
                    const resposta = await fetch("http://localhost:3000/api/recuperar-password", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email, novaPassword })
                    });
                    const dados = await resposta.json();

                    if (!resposta.ok) {
                        alert("❌ " + (dados.error || "Erro ao redefinir a password."));
                    } else {
                        alert("✅ " + dados.message);
                        recuperarForm.reset();
                        recuperarForm.style.display = "none";
                        formLogin.style.display = "block";
                    }
                } catch (erro) {
                    console.error("Erro na recuperação:", erro);
                    alert("❌ Não foi possível ligar ao servidor.");
                }
            });
        }

        formLogin.addEventListener("submit", async (e) => {
            e.preventDefault();

            const dados = {
                email: document.getElementById("login-email").value.trim(),
                password: document.getElementById("login-password").value
            };

            try {
                const resposta = await fetch('http://localhost:3000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dados)
                });

                const resultado = await resposta.json();

                if (resposta.ok && resultado.success) {
                    sessionStorage.setItem("utilizadorLogado", JSON.stringify(resultado.utilizador));
                    alert("Bem-vindo, " + resultado.utilizador.nome + "!");
                    
                    if (resultado.utilizador.cargo === 'admin') {
                        window.location.href = "admin.html";
                    } else {
                        window.location.href = "index.html";
                    }
                } else {
                    alert(resultado.message || "Credenciais inválidas.");
                }
            } catch (erro) {
                console.error("Erro ao fazer login:", erro);
                alert("Erro ao ligar ao servidor.");
            }
        });
    }

    // ==========================================
    // 10. GESTÃO DE CURSOS (PAINEL ADMIN)
    // ==========================================
    const formAdminCurso = document.getElementById("admin-curso-form");
    const tabelaCursosCorpo = document.getElementById("admin-tabela-cursos");

    if (formAdminCurso) {
        async function renderizarTabelaAdmin() {
            if (!tabelaCursosCorpo) return;
            await carregarCursosDoServidor(); 
            
            tabelaCursosCorpo.innerHTML = "";

            listaCursos.forEach(curso => {
                const urlImagem = curso.imagem.startsWith('uploads') ? `http://localhost:3000/${curso.imagem}` : curso.imagem;
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><img src="${urlImagem}" alt="Thumbnail" style="width:50px;"></td>
                    <td><strong>${curso.titulo}</strong></td>
                    <td style="text-transform: capitalize;">${curso.categoria}</td>
                    <td>${curso.preco}</td>
                    <td>
                        <button class="btn-acao-remover" data-id="${curso.id}"><i class="fa fa-trash"></i></button>
                    </td>
                `;
                tabelaCursosCorpo.appendChild(tr);
            });

            configurarCliquesRemover();
        }

        function configurarCliquesRemover() {
            const botoesRemover = tabelaCursosCorpo.querySelectorAll(".btn-acao-remover");
            botoesRemover.forEach(btn => {
                btn.addEventListener("click", async () => {
                    const idCurso = btn.getAttribute("data-id");
                    if (confirm("Deseja mesmo eliminar este curso da Base de Dados?")) {
                        try {
                            const resposta = await fetch(`http://localhost:3000/api/cursos/${idCurso}`, {
                                method: 'DELETE'
                            });
                            const resultado = await resposta.json();
                            alert(resultado.message);
                            renderizarTabelaAdmin(); 
                        } catch (erro) {
                            console.error("Erro ao apagar curso:", erro);
                        }
                    }
                });
            });
        }

        formAdminCurso.addEventListener("submit", async (e) => {
            e.preventDefault();

            const formData = new FormData();
            formData.append("titulo", document.getElementById("curso-novo-titulo").value.trim());
            formData.append("categoria", document.getElementById("curso-novo-categoria").value);
            formData.append("nivel", document.getElementById("curso-novo-nivel").value);
            formData.append("duracao", document.getElementById("curso-novo-duracao").value.trim());
            formData.append("formador", document.getElementById("curso-novo-formador").value.trim());
            formData.append("preco", document.getElementById("curso-novo-preco").value.trim());
            formData.append("descricao", document.getElementById("curso-novo-descricao").value.trim());
            
            const campoImagem = document.getElementById("curso-novo-imagem");
            if (campoImagem.files.length > 0) {
                formData.append("imagem", campoImagem.files[0]);
            }

            try {
                const resposta = await fetch('http://localhost:3000/api/cursos', {
                    method: 'POST',
                    body: formData 
                });

                if (resposta.ok) {
                    alert("Curso e imagem publicados com sucesso no MySQL!");
                    formAdminCurso.reset();
                    renderizarTabelaAdmin();
                } else {
                    alert("Erro ao publicar o curso no servidor.");
                }
            } catch (erro) {
                console.error("Erro no envio do formulário:", erro);
            }
        });

        renderizarTabelaAdmin();
    }

    // Só chama a listagem geral se NÃO for o painel admin E NÃO for o perfil do aluno
    const gridMeusCursos = document.getElementById("meus-cursos-grid");
    if (!formAdminCurso && !gridMeusCursos) {
        carregarCursosDoServidor();
    }

    // ==========================================
    // 11. DASHBOARD DO ALUNO (PERFIL.HTML)
    // ==========================================
    if (gridMeusCursos) {
        async function carregarDashboardAluno() {
            let utilizadorLogado = null;
            
            try {
                utilizadorLogado = JSON.parse(sessionStorage.getItem("utilizadorLogado"));
                console.log("👤 Utilizador detetado no Perfil:", utilizadorLogado);
            } catch (e) {
                console.error("Erro de permissão ao aceder ao sessionStorage:", e);
            }

            if (!utilizadorLogado || !utilizadorLogado.id) {
                gridMeusCursos.innerHTML = "<p style='color: #ffc107; padding: 20px;'>Inicia sessão novamente para veres os teus cursos.</p>";
                return;
            }

            try {
                gridMeusCursos.innerHTML = "<p style='color: white; padding: 20px;'>A procurar as tuas inscrições...</p>";

                const resposta = await fetch(`http://localhost:3000/api/meus-cursos/${utilizadorLogado.id}`);
                const meusCursos = await resposta.json();

                gridMeusCursos.innerHTML = "";

                if (!meusCursos || meusCursos.length === 0) {
                    gridMeusCursos.innerHTML = "<p style='color: white; padding: 20px;'>Ainda não te inscreveste em nenhum curso.</p>";
                    return;
                }

                meusCursos.forEach(curso => {
                    console.log("🔍 O QUE VEM DENTRO DE CURSO?", curso);

                    const urlImagem = curso.imagem && curso.imagem.startsWith('uploads') 
                        ? `http://localhost:3000/${curso.imagem}` 
                        : (curso.imagem || 'uploads/default.png');
                    
                    const tituloCurso = curso.titulo || "Curso Inscrito";
                    const categoriaCurso = curso.categoria || "Geral";
                    const idDoCursoValido = curso.id || curso.curso_id;
                    
                    // --- CÁLCULO DINÂMICO BASEADO NO TEU SERVER.JS ---
                    const totalAulas = parseInt(curso.total_aulas) || 0;
                    const aulasConcluidas = parseInt(curso.aulas_concluidas) || 0;
                    
                    let percentagemProgresso = 0;
                    if (totalAulas > 0) {
                        percentagemProgresso = Math.round((aulasConcluidas / totalAulas) * 100);
                    }
                    
                    const cartaoHTML = `
                        <div class="curso-inscrito-card">
                            <img src="${urlImagem}" alt="${tituloCurso}">
                            <div class="curso-inscrito-info">
                                <span class="categoria">${categoriaCurso}</span>
                                <h3>${tituloCurso}</h3>
                                <p class="data-inscricao">Inscrição realizada com sucesso!</p>
                                
                                <div class="progresso-container" style="margin: 15px 0 10px 0;">
                                    <div style="display: flex; justify-content: space-between; font-size: 13px; color: #aaa; margin-bottom: 5px;">
                                        <span>Progresso (${aulasConcluidas}/${totalAulas} aulas)</span>
                                        <strong>${percentagemProgresso}%</strong>
                                    </div>
                                    <div class="progresso-bar-bg" style="background: #333; width: 100%; height: 8px; border-radius: 4px; overflow: hidden;">
                                        <div class="progresso-bar-fill" style="background: #00bcd4; width: ${percentagemProgresso}%; height: 100%; transition: width 0.3s ease;"></div>
                                    </div>
                                </div>

                                <span class="badge-status" style="margin-top: 5px; display: inline-block;">A frequentar</span>
                                
                                <a href="player.html?curso=${idDoCursoValido}" class="btn-continuar" style="display: block; text-align: center; margin-top: 15px; padding: 10px; background: #00bcd4; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                                    <i class="fa fa-play-circle"></i> Continuar Aprendizagem
                                </a>
                            </div>
                        </div>
                    `;
                    gridMeusCursos.insertAdjacentHTML("beforeend", cartaoHTML);
                });

            } catch (erro) {
                console.error("Erro ao carregar a dashboard do aluno:", erro);
                gridMeusCursos.innerHTML = "<p style='color: red; padding: 20px;'>Erro ao ligar ao servidor Node.js.</p>";
            }
        }

        carregarDashboardAluno();
    }

});
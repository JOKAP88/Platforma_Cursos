// ==========================================
// 1. CONEXÃO COM O SERVIDOR (BACK-END)
// ==========================================
let listaCursos = [];

document.addEventListener("DOMContentLoaded", () => {
    
    const gridCursos = document.getElementById("dinamico-cursos-grid");
    const gridDestaques = document.getElementById("destaque-cursos-grid");
    const filtroCategoria = document.getElementById("categoria-filtro");
    const mobileToggle = document.querySelector(".mobile-toggle");
    const navMenu = document.querySelector(".nav-menu");

    async function carregarCursosDoServidor() {
        try {
            const resposta = await fetch('http://localhost:3000/api/cursos');
            listaCursos = await resposta.json();
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
    // 3. RENDERIZAR CARTÕES DE CURSOS
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
                if (cursoId) window.location.href = `descricao.html?id=${cursoId}`;
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
                const cursosFiltrados = listaCursos.filter(c => c.categoria.toLowerCase() === categoriaSelecionada);
                renderizarCursos(cursosFiltrados, gridCursos);
            }
        });
    }

    // ==========================================
    // 6. PÁGINA DE DESCRIÇÃO DO CURSO
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
                        try {
                            const resposta = await fetch('http://localhost:3000/api/inscricoes', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ utilizador_id: utilizadorLogado.id, curso_id: cursoId })
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
    // 9. MENU DINÂMICO (LOGIN/LOGOUT)
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
            } else if (utilizadorLogado.cargo === "aluno") {
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
    // 9.1 REGISTO
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
                alert("Erro ao ligar ao servidor.");
            }
        });
    }

    // ==========================================
    // 9.2 LOGIN E RECUPERAÇÃO DE PASSWORD
    // ==========================================
    const formLogin = document.getElementById("Login-form"); 
    if (formLogin) {
        const recuperarForm = document.getElementById("Recuperar-form");
        // CORREÇÃO: ID correto do link no Login.html
        const linkEsqueci = document.getElementById("link-esqueci-password");
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
                alert("Erro ao ligar ao servidor.");
            }
        });
    }

    // ==========================================
    // 10. PAINEL ADMIN — CURSOS + EDITAR + FORMANDOS
    // ==========================================
    const formAdminCurso = document.getElementById("admin-curso-form");
    const tabelaCursosCorpo = document.getElementById("admin-tabela-cursos");

    if (formAdminCurso) {

        // --- MODAL DE EDIÇÃO (injetado dinamicamente) ---
        const modalHTML = `
        <div id="modal-editar" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999; justify-content:center; align-items:center;">
            <div style="background:#1e293b; padding:30px; border-radius:12px; width:90%; max-width:550px; color:white; position:relative;">
                <h3 style="margin-bottom:20px; color:#00bcd4;"><i class="fa fa-edit"></i> Editar Curso</h3>
                <input type="hidden" id="edit-id">
                <label style="display:block;margin-bottom:5px;">Título</label>
                <input type="text" id="edit-titulo" style="width:100%;padding:8px;margin-bottom:12px;border-radius:6px;border:1px solid #334155;background:#0f172a;color:white;">
                <label style="display:block;margin-bottom:5px;">Categoria</label>
                <input type="text" id="edit-categoria" style="width:100%;padding:8px;margin-bottom:12px;border-radius:6px;border:1px solid #334155;background:#0f172a;color:white;">
                <label style="display:block;margin-bottom:5px;">Nível</label>
                <select id="edit-nivel" style="width:100%;padding:8px;margin-bottom:12px;border-radius:6px;border:1px solid #334155;background:#0f172a;color:white;">
                    <option value="Iniciante">Iniciante</option>
                    <option value="Intermédio">Intermédio</option>
                    <option value="Avançado">Avançado</option>
                </select>
                <label style="display:block;margin-bottom:5px;">Duração</label>
                <input type="text" id="edit-duracao" style="width:100%;padding:8px;margin-bottom:12px;border-radius:6px;border:1px solid #334155;background:#0f172a;color:white;">
                <label style="display:block;margin-bottom:5px;">Formador</label>
                <input type="text" id="edit-formador" style="width:100%;padding:8px;margin-bottom:12px;border-radius:6px;border:1px solid #334155;background:#0f172a;color:white;">
                <label style="display:block;margin-bottom:5px;">Preço (€)</label>
                <input type="text" id="edit-preco" style="width:100%;padding:8px;margin-bottom:12px;border-radius:6px;border:1px solid #334155;background:#0f172a;color:white;">
                <label style="display:block;margin-bottom:5px;">Descrição</label>
                <textarea id="edit-descricao" rows="3" style="width:100%;padding:8px;margin-bottom:20px;border-radius:6px;border:1px solid #334155;background:#0f172a;color:white;"></textarea>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button id="btn-cancelar-edicao" style="padding:10px 20px;border-radius:6px;border:none;background:#475569;color:white;cursor:pointer;">Cancelar</button>
                    <button id="btn-guardar-edicao" style="padding:10px 20px;border-radius:6px;border:none;background:#00bcd4;color:white;cursor:pointer;font-weight:bold;"><i class="fa fa-save"></i> Guardar</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML("beforeend", modalHTML);

        const modal = document.getElementById("modal-editar");

        document.getElementById("btn-cancelar-edicao").addEventListener("click", () => {
            modal.style.display = "none";
        });

        document.getElementById("btn-guardar-edicao").addEventListener("click", async () => {
            const id = document.getElementById("edit-id").value;
            const dados = {
                titulo: document.getElementById("edit-titulo").value.trim(),
                categoria: document.getElementById("edit-categoria").value.trim(),
                nivel: document.getElementById("edit-nivel").value,
                duracao: document.getElementById("edit-duracao").value.trim(),
                formador: document.getElementById("edit-formador").value.trim(),
                preco: document.getElementById("edit-preco").value.trim(),
                descricao: document.getElementById("edit-descricao").value.trim()
            };

            try {
                const resposta = await fetch(`http://localhost:3000/api/cursos/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dados)
                });
                const resultado = await resposta.json();
                if (resposta.ok) {
                    alert("✅ Curso atualizado com sucesso!");
                    modal.style.display = "none";
                    renderizarTabelaAdmin();
                } else {
                    alert("❌ Erro ao atualizar o curso.");
                }
            } catch (erro) {
                console.error("Erro ao editar curso:", erro);
                alert("❌ Erro ao ligar ao servidor.");
            }
        });

        // --- TABELA DE CURSOS ---
        async function renderizarTabelaAdmin() {
            if (!tabelaCursosCorpo) return;
            await carregarCursosDoServidor(); 
            tabelaCursosCorpo.innerHTML = "";

            listaCursos.forEach(curso => {
                const urlImagem = curso.imagem.startsWith('uploads') ? `http://localhost:3000/${curso.imagem}` : curso.imagem;
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td><img src="${urlImagem}" alt="Thumbnail" style="width:50px; border-radius:4px;"></td>
                    <td><strong>${curso.titulo}</strong></td>
                    <td style="text-transform: capitalize;">${curso.categoria}</td>
                    <td>${curso.preco}</td>
                    <td style="display:flex; gap:8px; align-items:center;">
                        <button class="btn-acao-editar" data-id="${curso.id}" 
                            style="background:#00bcd4;color:white;border:none;padding:6px 10px;border-radius:5px;cursor:pointer;">
                            <i class="fa fa-edit"></i>
                        </button>
                        <button class="btn-acao-remover" data-id="${curso.id}"
                            style="background:#e22b2b;color:white;border:none;padding:6px 10px;border-radius:5px;cursor:pointer;">
                            <i class="fa fa-trash"></i>
                        </button>
                    </td>
                `;
                tabelaCursosCorpo.appendChild(tr);
            });

            configurarBotoesTabela();
        }

        function configurarBotoesTabela() {
            // Botões REMOVER
            tabelaCursosCorpo.querySelectorAll(".btn-acao-remover").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const idCurso = btn.getAttribute("data-id");
                    if (confirm("Deseja mesmo eliminar este curso da Base de Dados?")) {
                        try {
                            const resposta = await fetch(`http://localhost:3000/api/cursos/${idCurso}`, { method: 'DELETE' });
                            const resultado = await resposta.json();
                            alert(resultado.message);
                            renderizarTabelaAdmin(); 
                        } catch (erro) {
                            console.error("Erro ao apagar curso:", erro);
                        }
                    }
                });
            });

            // Botões EDITAR — abre o modal preenchido
            tabelaCursosCorpo.querySelectorAll(".btn-acao-editar").forEach(btn => {
                btn.addEventListener("click", () => {
                    const idCurso = btn.getAttribute("data-id");
                    const curso = listaCursos.find(c => c.id == idCurso);
                    if (!curso) return;

                    document.getElementById("edit-id").value = curso.id;
                    document.getElementById("edit-titulo").value = curso.titulo;
                    document.getElementById("edit-categoria").value = curso.categoria;
                    document.getElementById("edit-nivel").value = curso.nivel;
                    document.getElementById("edit-duracao").value = curso.duracao;
                    document.getElementById("edit-formador").value = curso.formador;
                    document.getElementById("edit-preco").value = curso.preco;
                    document.getElementById("edit-descricao").value = curso.descricao;

                    modal.style.display = "flex";
                });
            });
        }

        // --- FORMULÁRIO CRIAR CURSO ---
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
            if (campoImagem.files.length > 0) formData.append("imagem", campoImagem.files[0]);

            try {
                const resposta = await fetch('http://localhost:3000/api/cursos', { method: 'POST', body: formData });
                if (resposta.ok) {
                    alert("Curso publicado com sucesso!");
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

    // ==========================================
    // 10.2 SEPARADOR DE FORMANDOS (PAINEL ADMIN)
    // ==========================================
    const tabelaFormandosCorpo = document.getElementById("admin-tabela-formandos");
    if (tabelaFormandosCorpo) {
        async function carregarFormandos() {
            try {
                const resposta = await fetch('http://localhost:3000/api/formandos');
                const formandos = await resposta.json();
                tabelaFormandosCorpo.innerHTML = "";

                if (formandos.length === 0) {
                    tabelaFormandosCorpo.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#aaa;">Nenhum formando registado.</td></tr>`;
                    return;
                }

                formandos.forEach(f => {
                    const tr = document.createElement("tr");
                    const estadoBadge = f.ativo == 1
                        ? `<span style="background:#2ecc71;color:white;padding:3px 10px;border-radius:12px;font-size:12px;">Ativo</span>`
                        : `<span style="background:#e22b2b;color:white;padding:3px 10px;border-radius:12px;font-size:12px;">Inativo</span>`;

                    const btnAtivar = f.ativo == 1
                        ? `<button class="btn-toggle-ativo" data-id="${f.id}" data-estado="1" style="background:#e22b2b;color:white;border:none;padding:6px 12px;border-radius:5px;cursor:pointer;">Desativar</button>`
                        : `<button class="btn-toggle-ativo" data-id="${f.id}" data-estado="0" style="background:#2ecc71;color:white;border:none;padding:6px 12px;border-radius:5px;cursor:pointer;">Ativar</button>`;

                    tr.innerHTML = `
                        <td>${f.nome} ${f.apelido}</td>
                        <td>${f.email}</td>
                        <td>${f.cargo}</td>
                        <td>${estadoBadge}</td>
                        <td>${btnAtivar}</td>
                    `;
                    tabelaFormandosCorpo.appendChild(tr);
                });

                // Eventos dos botões ativar/desativar
                tabelaFormandosCorpo.querySelectorAll(".btn-toggle-ativo").forEach(btn => {
                    btn.addEventListener("click", async () => {
                        const idUser = btn.getAttribute("data-id");
                        const estadoAtual = btn.getAttribute("data-estado");
                        const novoEstado = estadoAtual == 1 ? 0 : 1;

                        try {
                            const resposta = await fetch(`http://localhost:3000/api/formandos/${idUser}/ativar`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ ativo: novoEstado })
                            });
                            if (resposta.ok) {
                                carregarFormandos(); // Recarrega a tabela
                            } else {
                                alert("Erro ao atualizar o estado do formando.");
                            }
                        } catch (erro) {
                            console.error("Erro ao atualizar formando:", erro);
                        }
                    });
                });

            } catch (erro) {
                console.error("Erro ao carregar formandos:", erro);
                tabelaFormandosCorpo.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red; padding:20px;">Erro ao ligar ao servidor.</td></tr>`;
            }
        }

        carregarFormandos();
    }

    // ==========================================
    // 11. DASHBOARD DO ALUNO (PERFIL.HTML)
    // ==========================================
    const gridMeusCursos = document.getElementById("meus-cursos-grid");
    if (!formAdminCurso && !gridMeusCursos) {
        carregarCursosDoServidor();
    }

    if (gridMeusCursos) {
        async function carregarDashboardAluno() {
            let utilizadorLogado = null;
            try {
                utilizadorLogado = JSON.parse(sessionStorage.getItem("utilizadorLogado"));
            } catch (e) {
                console.error("Erro ao aceder ao sessionStorage:", e);
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
                    const urlImagem = curso.imagem && curso.imagem.startsWith('uploads') 
                        ? `http://localhost:3000/${curso.imagem}` 
                        : (curso.imagem || 'uploads/default.png');
                    const tituloCurso = curso.titulo || "Curso Inscrito";
                    const categoriaCurso = curso.categoria || "Geral";
                    const idDoCursoValido = curso.id || curso.curso_id;
                    const totalAulas = parseInt(curso.total_aulas) || 0;
                    const aulasConcluidas = parseInt(curso.aulas_concluidas) || 0;
                    let percentagemProgresso = 0;
                    if (totalAulas > 0) percentagemProgresso = Math.round((aulasConcluidas / totalAulas) * 100);
                    
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

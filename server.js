const express = require('express');
const mysql   = require('mysql2');
const cors    = require('cors');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const bcrypt  = require('bcrypt');

const app = express();


// 1. UPLOADS
// ==========================================
const dir = './uploads';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// 2. CONECTOR BASE DE DADOS
// ==========================================
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Admin',
    database: 'tdias_formacoes'
});

db.connect((err) => {
    if (err) { console.error('❌ Erro BD:', err); return; }
    console.log('✅ Conexão bem-sucedida ao banco de dados MySQL!');
});


// 3. MÓDULO MULTER
// ==========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './uploads'),
    filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// 4. CURSOS
// ==========================================
app.get('/api/cursos', (req, res) => {
    db.query("SELECT * FROM cursos", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

app.post('/api/cursos', upload.single('imagem'), (req, res) => {
    const { titulo, categoria, nivel, duracao, formador, preco, descricao } = req.body;
    const imagemCaminho = req.file ? `uploads/${req.file.filename}` : 'uploads/default.png';
    const sql = "INSERT INTO cursos (titulo, categoria, nivel, duracao, imagem, formador, preco, descricao) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    db.query(sql, [titulo, categoria, nivel, duracao, imagemCaminho, formador, preco, descricao], (err, result) => {
        if (err) { console.error("❌ Erro criar curso:", err.sqlMessage); return res.status(500).json(err); }
        res.json({ message: "Curso inserido com sucesso!", id: result.insertId });
    });
});

app.put('/api/cursos/:id', (req, res) => {
    const { id } = req.params;
    const { titulo, categoria, nivel, duracao, formador, preco, descricao } = req.body;
    db.query(
        "UPDATE cursos SET titulo=?, categoria=?, nivel=?, duracao=?, formador=?, preco=?, descricao=? WHERE id=?",
        [titulo, categoria, nivel, duracao, formador, preco, descricao, id],
        (err) => {
            if (err) { console.error("❌ Erro editar curso:", err.sqlMessage); return res.status(500).json({ error: "Erro ao atualizar." }); }
            res.json({ message: "Curso atualizado com sucesso!" });
        }
    );
});

app.delete('/api/cursos/:id', (req, res) => {
    db.query("SELECT imagem FROM cursos WHERE id = ?", [req.params.id], (err, results) => {
        if (!results || results.length === 0) return res.status(404).json({ message: "Curso não encontrado" });
        const imagemRelativa = results[0].imagem;
        db.query("DELETE FROM cursos WHERE id = ?", [req.params.id], (err) => {
            if (err) return res.status(500).json(err);
            if (imagemRelativa && imagemRelativa !== 'uploads/default.png') {
                const p = path.join(__dirname, imagemRelativa);
                if (fs.existsSync(p)) fs.unlinkSync(p);
            }
            res.json({ message: "Curso eliminado com sucesso!" });
        });
    });
});

// 5. AUTENTICAÇÃO
// ==========================================

// Registar — password encriptada com bcrypt, ativo=0 por defeito
app.post('/api/registar', async (req, res) => {
    const { nome, apelido, email, password } = req.body;

    if (!nome || !apelido || !email || !password) {
        return res.status(400).json({ message: "Preencha todos os campos." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = "INSERT INTO utilizadores (nome, apelido, email, password, cargo, ativo) VALUES (?, ?, ?, ?, 'aluno', 0)";
        db.query(sql, [nome, apelido, email, hashedPassword], (err, result) => {
            if (err) {
                console.error("❌ Erro registar:", err.sqlMessage);
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: "Este email já está registado!" });
                return res.status(500).json({ message: "Erro interno ao registar utilizador." });
            }
            res.json({ message: "Conta criada com sucesso!", id: result.insertId });
        });
    } catch (err) {
        console.error("❌ Erro bcrypt no registo:", err);
        res.status(500).json({ message: "Erro ao processar a password." });
    }
});

// Login — devolve campo 'ativo' sempre  que estiver atualizado da Base de Dados
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    db.query(
        "SELECT id, nome, apelido, email, cargo, ativo, password FROM utilizadores WHERE email = ?",
        [email],
        async (err, results) => {
            if (err) return res.status(500).json({ message: "Erro interno." });
            if (results.length === 0) return res.status(401).json({ success: false, message: "Email ou password incorretos." });

            const u = results[0];
            let ok = false;
            if (u.password.startsWith('$2b$')) {
                ok = await bcrypt.compare(password, u.password);
            } else {
                ok = (password === u.password);
            }
            if (!ok) return res.status(401).json({ success: false, message: "Email ou password incorretos." });

            const { password: _, ...semPassword } = u;
            res.json({ success: true, message: "Login efetuado com sucesso!", utilizador: semPassword });
        }
    );
});


app.post('/api/recuperar-password', async (req, res) => {
    const { email, novaPassword } = req.body;
    if (!email || !novaPassword) return res.status(400).json({ error: "Preencha todos os campos." });
    try {
        db.query("SELECT * FROM utilizadores WHERE email = ?", [email], async (err, results) => {
            if (err) return res.status(500).json({ error: "Erro na base de dados." });
            if (results.length === 0) return res.status(404).json({ error: "Não encontrámos nenhuma conta com este e-mail." });
            const hash = await bcrypt.hash(novaPassword, 10);
            db.query("UPDATE utilizadores SET password = ? WHERE email = ?", [hash, email], (e) => {
                if (e) return res.status(500).json({ error: "Erro ao atualizar password." });
                res.json({ message: "Password redefinida com sucesso! Já pode fazer login." });
            });
        });
    } catch (e) {
        res.status(500).json({ error: "Erro interno." });
    }
});


// 6. INSCRIÇÕES
// ==========================================
app.post('/api/inscricoes', (req, res) => {
    const { utilizador_id, curso_id } = req.body;

    console.log(`📥 Inscrição recebida — utilizador_id: ${utilizador_id}, curso_id: ${curso_id}`);

    if (!utilizador_id || !curso_id) {
        return res.status(400).json({ message: "Dados incompletos." });
    }

    // já existe inscrição?
    db.query(
        "SELECT id FROM inscricoes WHERE utilizador_id = ? AND curso_id = ?",
        [utilizador_id, curso_id],
        (err, results) => {
            if (err) {
                console.error("❌ Erro ao verificar inscrição:", err.sqlMessage);
                return res.status(500).json({ message: "Erro ao verificar inscrição." });
            }
            if (results.length > 0) {
                return res.status(400).json({ message: "Já tens uma inscrição neste curso!" });
            }

            // Insere nova inscrição com status pendente
            db.query(
                "INSERT INTO inscricoes (utilizador_id, curso_id) VALUES (?, ?)",
                [utilizador_id, curso_id],
                (err, result) => {
                    if (err) {
                        console.error("❌ Erro ao inserir inscrição:", err.sqlMessage, err.code);
                        return res.status(500).json({ message: "Erro ao processar inscrição." });
                    }
                    console.log(`✅ Inscrição criada com ID: ${result.insertId}`);
                    res.json({ message: "Inscrição registada! O acesso será ativado após confirmação do pagamento." });
                }
            );
        }
    );
});


app.get('/api/meus-cursos/:utilizadorId', (req, res) => {
    const id = req.params.utilizadorId;
    const sql = `
        SELECT 
            c.id, c.titulo, c.imagem, c.categoria, i.data_inscricao,
            i.id     AS inscricao_id,
            i.status AS estado_inscricao,
            IF(i.status = 'ativo', 1, 0) AS acesso_ativo,
            (SELECT COUNT(*) FROM aulas a WHERE a.curso_id = c.id) AS total_aulas,
            (SELECT COUNT(*) FROM progresso_aulas p
             INNER JOIN aulas a ON p.aula_id = a.id
             WHERE p.utilizador_id = ? AND a.curso_id = c.id) AS aulas_concluidas
        FROM inscricoes i
        INNER JOIN cursos c ON i.curso_id = c.id
        WHERE i.utilizador_id = ?
    `;
    db.query(sql, [id, id], (err, results) => {
        if (err) { console.error("❌ Erro meus-cursos:", err.sqlMessage); return res.status(500).send("Erro no servidor"); }
        res.json(results);
    });
});


// 7. AULAS E PROGRESSO
// ==========================================
app.get('/api/cursos/:cursoId/aulas', (req, res) => {
    const cursoId      = req.params.cursoId;
    const utilizadorId = req.query.utilizadorId || 0;

    // O acesso é por curso  não é global ao utilizador
    const sqlAcesso = `
        SELECT i.status
        FROM inscricoes i
        WHERE i.utilizador_id = ? AND i.curso_id = ?
        LIMIT 1
    `;
    db.query(sqlAcesso, [utilizadorId, cursoId], (err, results) => {
        if (err) return res.status(500).json({ error: "Erro interno." });

        if (results.length === 0) {
            return res.status(403).json({ acesso: false, error: "Não tens inscrição neste curso." });
        }
        if (results[0].status !== 'ativo') {
            return res.status(403).json({ acesso: false, error: "O teu acesso a este curso ainda não foi ativado. Aguarda a confirmação do pagamento." });
        }

        const sqlAulas = `
            SELECT a.id, a.titulo, a.ordem, a.video_fonte, a.video_id,
                   IF(p.id IS NOT NULL, 1, 0) AS concluida
            FROM aulas a
            LEFT JOIN progresso_aulas p ON a.id = p.aula_id AND p.utilizador_id = ?
            WHERE a.curso_id = ?
            ORDER BY a.ordem ASC
        `;
        db.query(sqlAulas, [utilizadorId, cursoId], (err, results) => {
            if (err) return res.status(500).json({ error: "Erro ao buscar aulas." });
            res.json(results);
        });
    });
});

app.post('/api/progresso/concluir', (req, res) => {
    const { utilizador_id, aula_id } = req.body;
    if (!utilizador_id || !aula_id) return res.status(400).json({ error: "Dados em falta." });

    db.query(
        "SELECT id FROM progresso_aulas WHERE utilizador_id = ? AND aula_id = ?",
        [utilizador_id, aula_id],
        (err, results) => {
            if (err) return res.status(500).json({ error: "Erro interno." });
            if (results.length > 0) {
                db.query("DELETE FROM progresso_aulas WHERE utilizador_id = ? AND aula_id = ?", [utilizador_id, aula_id], (e) => {
                    if (e) return res.status(500).json({ error: "Erro ao remover progresso." });
                    res.json({ status: "desmarcado", message: "Aula desmarcada." });
                });
            } else {
                db.query("INSERT INTO progresso_aulas (utilizador_id, aula_id) VALUES (?, ?)", [utilizador_id, aula_id], (e) => {
                    if (e) return res.status(500).json({ error: "Erro ao salvar progresso." });
                    res.json({ status: "concluido", message: "Aula concluída! 🎉" });
                });
            }
        }
    );
});


// 8. GESTÃO DE FORMANDOS 
// ==========================================
app.get('/api/formandos', (req, res) => {
    db.query(
        "SELECT id, nome, apelido, email, cargo, ativo FROM utilizadores WHERE cargo = 'aluno' ORDER BY nome ASC",
        (err, results) => {
            if (err) { console.error("❌ Erro listar formandos:", err.sqlMessage); return res.status(500).json({ error: "Erro ao listar." }); }
            res.json(results);
        }
    );
});


app.put('/api/formandos/:inscricaoId/ativar', (req, res) => {
    const inscricaoId = req.params.inscricaoId;
    const ativo       = req.body.ativo;
    const novoStatus  = ativo == 1 ? 'ativo' : 'pendente';

    console.log(`🔄 Inscrição ID ${inscricaoId} → status = ${novoStatus}`);

    if (ativo === undefined || ativo === null) {
        return res.status(400).json({ error: "Campo 'ativo' em falta no pedido." });
    }

    db.query(
        "UPDATE inscricoes SET status = ? WHERE id = ?",
        [novoStatus, inscricaoId],
        (err, result) => {
            if (err) {
                console.error("❌ Erro UPDATE inscricoes:", err.sqlMessage);
                return res.status(500).json({ error: "Erro ao atualizar inscrição: " + err.sqlMessage });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Inscrição não encontrada." });
            }
            console.log(`✅ Inscrição ${inscricaoId} → ${novoStatus}`);
            res.json({ message: `Acesso ${ativo == 1 ? 'ativado ✅' : 'desativado ❌'} com sucesso!` });
        }
    );
});


app.get('/api/formandos/:utilizadorId/inscricoes', (req, res) => {
    const utilizadorId = req.params.utilizadorId;
    const sql = `
        SELECT i.id AS inscricao_id, i.status, i.data_inscricao,
               c.titulo AS curso_titulo, c.id AS curso_id
        FROM inscricoes i
        INNER JOIN cursos c ON i.curso_id = c.id
        WHERE i.utilizador_id = ?
        ORDER BY i.data_inscricao DESC
    `;
    db.query(sql, [utilizadorId], (err, results) => {
        if (err) {
            console.error("❌ Erro ao buscar inscrições:", err.sqlMessage);
            return res.status(500).json({ error: "Erro ao buscar inscrições." });
        }
        res.json(results);
    });
});

const nodemailer = require('nodemailer');
 
//  transporte Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'EMAIL_GMAIL',      // alterar para o email do remetente 
        pass: 'APP_PASSWORD'      // alterar para a password de aplicação do Gmail
    }
});
 
// Rota do contacto
app.post('/api/contacto', async (req, res) => {
    const { nome, apelido, email, assunto, mensagem } = req.body;
 
    if (!nome || !email || !assunto || !mensagem) {
        return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
    }
 
    // Assuntos para o email
    const assuntosTraducao = {
        'informacoes': 'Informações sobre cursos',
        'pagamento':   'Questões de pagamento',
        'acesso':      'Problemas de acesso',
        'parceria':    'Proposta de parceria',
        'outro':       'Outro'
    };
 
    const assuntoTexto = assuntosTraducao[assunto] || assunto;
 
    const opcoes = {
        from:    `"TDias Formações" <EMAIL_GMAIL>`,
        to:      'EMAIL_DESTINO',             // alterar para o email do destinatário (ex: suporte ou contacto geral)
        replyTo: email,                       // responder vai direto para o utilizador
        subject: `[TDias Contacto] ${assuntoTexto} — ${nome} ${apelido}`,
        html: `
            <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 12px; overflow: hidden;">
                
                <!-- Header -->
                <div style="background: linear-gradient(-20deg, #b721ff 0%, #21d4fd 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 1.6rem;">TDias Formações</h1>
                    <p style="color: rgba(255,255,255,0.85); margin: 5px 0 0 0; font-size: 0.95rem;">Nova mensagem de contacto</p>
                </div>
 
                <!-- Corpo -->
                <div style="padding: 30px; background: #1e293b;">
                    
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                        <tr>
                            <td style="padding: 10px 0; color: #94a3b8; font-size: 0.88rem; width: 110px;">Nome</td>
                            <td style="padding: 10px 0; color: #f1f5f9; font-weight: bold;">${nome} ${apelido}</td>
                        </tr>
                        <tr style="border-top: 1px solid #334155;">
                            <td style="padding: 10px 0; color: #94a3b8; font-size: 0.88rem;">Email</td>
                            <td style="padding: 10px 0;"><a href="mailto:${email}" style="color: #00bcd4;">${email}</a></td>
                        </tr>
                        <tr style="border-top: 1px solid #334155;">
                            <td style="padding: 10px 0; color: #94a3b8; font-size: 0.88rem;">Assunto</td>
                            <td style="padding: 10px 0; color: #f1f5f9;">${assuntoTexto}</td>
                        </tr>
                    </table>
 
                    <div style="background: #0f172a; border-left: 3px solid #00bcd4; border-radius: 6px; padding: 20px;">
                        <p style="color: #94a3b8; font-size: 0.82rem; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">Mensagem</p>
                        <p style="color: #e2e8f0; line-height: 1.7; margin: 0; white-space: pre-wrap;">${mensagem}</p>
                    </div>
 
                    <div style="margin-top: 25px; text-align: center;">
                        <a href="mailto:${email}" 
                           style="background: linear-gradient(-20deg, #b721ff 0%, #21d4fd 100%); 
                                  color: white; padding: 12px 28px; border-radius: 6px; 
                                  text-decoration: none; font-weight: bold; font-size: 0.95rem;">
                            Responder a ${nome}
                        </a>
                    </div>
                </div>
 
                <!-- Footer -->
                <div style="padding: 20px; text-align: center; background: #0f172a;">
                    <p style="color: #475569; font-size: 0.8rem; margin: 0;">
                        © 2026 TDias Formações · Mensagem enviada através do formulário de contacto
                    </p>
                </div>
            </div>
        `
    };
 
    try {
        await transporter.sendMail(opcoes);
        console.log(`✅ Email de contacto enviado — De: ${email}, Assunto: ${assuntoTexto}`);
        res.json({ message: "Mensagem enviada com sucesso!" });
    } catch (erro) {
        console.error("❌ Erro ao enviar email:", erro.message);
        res.status(500).json({ error: "Erro ao enviar a mensagem. Tenta novamente." });
    }
});

// ==========================================
// 9. SERVIDOR
// ==========================================
const port = 3000;
app.listen(port, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});
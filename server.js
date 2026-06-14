const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// ==========================================
// 1. GARANTIR QUE A PASTA EXISTE (Caminho Direto)
// ==========================================
const dir = './uploads';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// 2. LIGAÇÃO À BASE DE DADOS (MYSQL)
// ==========================================
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Admin', 
    database: 'tdias_formacoes'
});

db.connect((err) => {
    if (err) {
        console.error('❌ Erro ao conectar ao banco de dados:', err);
        return;
    }
    console.log('✅ Conexão bem-sucedida ao banco de dados MySQL!');
});

// ==========================================
// 3. CONFIGURAÇÃO DO MULTER (Versão Corrigida)
// ==========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads');
    },
    filename: (req, file, cb) => {
        const extensao = path.extname(file.originalname);
        cb(null, Date.now() + extensao);
    }
});

const upload = multer({ storage: storage });

// ==========================================
// 4. ROTAS DA API
// ==========================================

// Rota A: Listar todos os cursos
app.get('/api/cursos', (req, res) => {
    const sql = "SELECT * FROM cursos";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// Rota B: Criar com Upload
app.post('/api/cursos', upload.single('imagem'), (req, res) => {
    const { titulo, categoria, nivel, duracao, formador, preco, descricao } = req.body;
    
    let imagemCaminho = req.file ? `uploads/${req.file.filename}` : 'uploads/default.png';

    const sql = "INSERT INTO cursos (titulo, categoria, nivel, duracao, imagem, formador, preco, descricao) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    const valores = [titulo, categoria, nivel, duracao, imagemCaminho, formador, preco, descricao];

    db.query(sql, valores, (err, result) => {
        if (err) {
            console.error("❌ Erro no MySQL:", err);
            return res.status(500).json(err);
        }
        res.json({ message: "Curso inserido com sucesso!", id: result.insertId });
    });
});

// Rota C: Eliminar
app.delete('/api/cursos/:id', (req, res) => {
    const { id } = req.params;
    db.query("SELECT imagem FROM cursos WHERE id = ?", [id], (err, results) => {
        if (results && results.length > 0) {
            const imagemRelativa = results[0].imagem;
            db.query("DELETE FROM cursos WHERE id = ?", [id], (err, result) => {
                if (err) return res.status(500).json(err);
                if (imagemRelativa && imagemRelativa !== 'uploads/default.png') {
                    const caminhoFisico = path.join(__dirname, imagemRelativa);
                    if (fs.existsSync(caminhoFisico)) {
                        fs.unlinkSync(caminhoFisico);
                    }
                }
                res.json({ message: "Curso e imagem eliminados com sucesso!" });
            });
        } else {
            res.status(404).json({ message: "Curso não encontrado" });
        }
    });
});

// ==========================================
// ROTAS DE AUTENTICAÇÃO (UTILIZADORES)
// ==========================================

// Rota 1: Registar Novo Utilizador
app.post('/api/registar', (req, res) => {
    const { nome, apelido, email, password } = req.body;

    const sql = "INSERT INTO utilizadores (nome, apelido, email, password, cargo) VALUES (?, ?, ?, ?, 'aluno')";
    const valores = [nome, apelido, email, password];

    db.query(sql, valores, (err, result) => {
        if (err) {
            console.error("Erro ao registar utilizador:", err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: "Este email já está registado!" });
            }
            return res.status(500).json({ message: "Erro interno ao registar utilizador." });
        }
        res.json({ message: "Conta criada com sucesso!", id: result.insertId });
    });
});

// Rota 2: Fazer Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    const sql = "SELECT id, nome, apelido, email, cargo FROM utilizadores WHERE email = ? AND password = ?";
    
    db.query(sql, [email, password], (err, results) => {
        if (err) {
            console.error("Erro no login:", err);
            return res.status(500).json({ message: "Erro interno no servidor." });
        }

        if (results.length > 0) {
            res.json({ 
                success: true, 
                message: "Login efetuado com sucesso!", 
                utilizador: results[0] 
            });
        } else {
            res.status(401).json({ success: false, message: "Email ou password incorretos." });
        }
    });
});

const bcrypt = require('bcrypt'); // Garante que tens o bcrypt no topo do ficheiro

// ROTA PARA RECUPERAR/ALTERAR A PASSWORD
app.post('/api/recuperar-password', async (req, res) => {
    const { email, novaPassword } = req.body;

    if (!email || !novaPassword) {
        return res.status(400).json({ error: "Por favor, preencha todos os campos." });
    }

    try {
        // 1. Verificar se o utilizador existe com esse email
        const checkSql = "SELECT * FROM utilizadores WHERE email = ?";
        db.query(checkSql, [email], async (err, results) => {
            if (err) return res.status(500).json({ error: "Erro na base de dados." });
            
            if (results.length === 0) {
                return res.status(404).json({ error: "Não encontrámos nenhuma conta com este e-mail." });
            }

            // 2. Encriptar a nova password
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(novaPassword, saltRounds);

            // 3. Atualizar a password no MySQL
            const updateSql = "UPDATE utilizadores SET password = ? WHERE email = ?";
            db.query(updateSql, [hashedPassword, email], (updateErr, updateResults) => {
                if (updateErr) return res.status(500).json({ error: "Erro ao atualizar a password." });
                
                res.json({ message: "Password redefinida com sucesso! Já pode fazer login." });
            });
        });
    } catch (error) {
        res.status(500).json({ error: "Erro interno no servidor." });
    }
});

// ==========================================
// ROTAS DE INSCRIÇÕES
// ==========================================

app.post('/api/inscricoes', (req, res) => {
    const { utilizador_id, curso_id } = req.body;

    if (!utilizador_id || !curso_id) {
        return res.status(400).json({ message: "Dados incompletos para inscrição." });
    }

    const verificarSql = "SELECT * FROM inscricoes WHERE utilizador_id = ? AND curso_id = ?";
    db.query(verificarSql, [utilizador_id, curso_id], (err, results) => {
        if (err) return res.status(500).json(err);

        if (results.length > 0) {
            return res.status(400).json({ message: "Já estás inscrito neste curso!" });
        }

        const inserirSql = "INSERT INTO inscricoes (utilizador_id, curso_id) VALUES (?, ?)";
        db.query(inserirSql, [utilizador_id, curso_id], (err, result) => {
            if (err) {
                console.error("Erro ao gravar inscrição:", err);
                return res.status(500).json({ message: "Erro ao processar inscrição." });
            }
            res.json({ message: "Inscrição realizada com sucesso!" });
        });
    });
});

// Rota para ver os cursos de um aluno específico
app.get('/api/meus-cursos/:utilizadorId', (req, res) => {
    const idDoAluno = req.params.utilizadorId;

    const sql = `
        SELECT 
            c.id,
            c.titulo, 
            c.imagem, 
            c.categoria, 
            i.data_inscricao,
            (select COUNT(*) from aulas a where a.curso_id = c.id) AS total_aulas,
            (select COUNT(*) from progresso_aulas p inner join aulas a on p.aula_id = a.id where p.utilizador_id = ? and a.curso_id = c.id) AS aulas_concluidas
        FROM inscricoes i
        INNER JOIN cursos c ON i.curso_id = c.id 
        WHERE i.utilizador_id = ?
    `;

    db.query(sql, [idDoAluno, idDoAluno], (err, results) => {
        if (err) {
            console.error("❌ Erro no SQL:", err);
            return res.status(500).send("Erro no servidor");
        }
        
        console.log(`🍏 Consulta para o ID ${idDoAluno} retornou:`, results);
        res.json(results); 
    });
});


// Rota para listar todas as aulas de um curso específico, ordenadas sequencialmente
app.get('/api/cursos/:cursoId/aulas', (req, res) => {
    const idDoCurso = req.params.cursoId;
    // Captura o utilizadorID que passaremos como parâmetro na URL (Query String)
    const idDoUtilizador = req.query.utilizadorId || 0; 

    const sql = `
        SELECT 
            a.id, 
            a.titulo, 
            a.ordem, 
            a.video_fonte, 
            a.video_id,
            IF(p.id IS NOT NULL, 1, 0) AS concluida
        FROM aulas a
        LEFT JOIN progresso_aulas p ON a.id = p.aula_id AND p.utilizador_id = ?
        WHERE a.curso_id = ? 
        ORDER BY a.ordem ASC
    `;

    db.query(sql, [idDoUtilizador, idDoCurso], (err, results) => {
        if (err) {
            console.error("❌ Erro ao buscar aulas com progresso no MySQL:", err);
            return res.status(500).json({ error: "Erro interno ao buscar as aulas." });
        }
        res.json(results);
    });
});



// Rota para marcar uma aula como concluída (ou desmarcar, se já existir)
app.post('/api/progresso/concluir', (req, res) => {
    const { utilizador_id, aula_id } = req.body;

    if (!utilizador_id || !aula_id) {
        return res.status(400).json({ error: "Dados em falta (utilizador_id ou aula_id)." });
    }

    // 1. Verificar se o aluno já tinha marcado esta aula como concluída antes
    const sqlVerificar = "SELECT id FROM progresso_aulas WHERE utilizador_id = ? AND aula_id = ?";
    
    db.query(sqlVerificar, [utilizador_id, aula_id], (err, results) => {
        if (err) {
            console.error("❌ Erro ao verificar progresso:", err);
            return res.status(500).json({ error: "Erro interno no servidor." });
        }

        if (results.length > 0) {
            // Se já existe, o aluno quer desmarcar (Toggle). Vamos remover a linha.
            const sqlRemover = "DELETE FROM progresso_aulas WHERE utilizador_id = ? AND aula_id = ?";
            db.query(sqlRemover, [utilizador_id, aula_id], (errDelete) => {
                if (errDelete) return res.status(500).json({ error: "Erro ao remover progresso." });
                return res.json({ status: "desmarcado", message: "Aula marcada como não concluída." });
            });
        } else {
            // Se não existe, vamos inserir o registo de conclusão
            const sqlInserir = "INSERT INTO progresso_aulas (utilizador_id, aula_id) VALUES (?, ?)";
            db.query(sqlInserir, [utilizador_id, aula_id], (errInsert) => {
                if (errInsert) return res.status(500).json({ error: "Erro ao salvar progresso." });
                return res.json({ status: "concluido", message: "Aula concluída com sucesso! 🎉" });
            });
        }
    });
});

// ==========================================
// 5. INICIALIZAÇÃO DO SERVIDOR (A parte que faltava!)
// ==========================================
const port = 3000;
app.listen(port, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});
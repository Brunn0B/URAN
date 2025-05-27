require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Configuração do MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Conectado ao MongoDB com sucesso!'))
.catch(err => {
    console.error('Erro ao conectar ao MongoDB:', err.message);
    process.exit(1);
});

// Modelo para as builds (mantido igual)
const BuildSchema = new mongoose.Schema({
    buildName: { type: String, required: true },
    shipName: { type: String, required: true },
    shipTier: { 
        type: String, 
        required: true,
        enum: ['Tier I', 'Tier II', 'Tier III', 'Tier IV', 'Tier V', 'Tier VI', 'Tier VII', 'Tier VIII', 'Tier Lendário']
    },
    nation: { 
        type: String, 
        required: true,
        enum: ['EUA', 'Japão', 'Britânicos', 'Holanda', 'China', 'URSS', 'Alemanha', 'França', 'Pan America', 'Paises Baixos']
    },
    buildType: {
        type: String,
        required: true,
        enum: ['Rush', 'Sniper', 'Tank', 'Suporte', 'Híbrido', 'Outro']
    },
    shipImage: { type: String, required: true },
    commanderName: { type: String, required: true },
    commanderBuild: { type: String, required: true },
    upgrades: [{
        slot: { type: Number, required: true },
        choice: { type: String, required: true }
    }],
    description: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const Build = mongoose.model('Build', BuildSchema);


// Modelo para os membros (simplificado como nas builds)
const MemberSchema = new mongoose.Schema({
    nickname: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true
    },
    rank: { 
        type: String, 
        required: true,
        enum: ['commander', 'vice', 'officer', 'member'],
        default: 'member'
    },
    image: { type: String }, // Sem validações de tamanho
    joinDate: { type: Date, default: Date.now }
});

const Member = mongoose.model('Member', MemberSchema);

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API para Builds (mantido igual)
app.get('/api/builds', async (req, res) => {
    try {
        const builds = await Build.find().sort({ createdAt: -1 });
        res.json(builds);
    } catch (err) {
        console.error('Erro ao buscar builds:', err);
        res.status(500).json({ error: 'Erro ao carregar builds' });
    }
});

app.post('/api/builds', async (req, res) => {
    try {
        if (!req.body.buildName || !req.body.shipName || !req.body.shipTier || 
            !req.body.nation || !req.body.buildType || !req.body.shipImage || 
            !req.body.commanderName || !req.body.commanderBuild) {
            return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos' });
        }

        const newBuild = new Build(req.body);
        await newBuild.save();
        res.status(201).json(newBuild);
    } catch (err) {
        console.error('Erro ao criar build:', err);
        res.status(400).json({ error: 'Erro ao criar build' });
    }
});

// Rotas da API para Membros (reestruturado como builds)
app.get('/api/members', async (req, res) => {
    try {
        const members = await Member.find().sort({ rank: 1, joinDate: 1 });
        res.json(members); // Retorno direto igual às builds
    } catch (err) {
        console.error('Erro ao buscar membros:', err);
        res.status(500).json({ error: 'Erro ao carregar membros' });
    }
});

app.post('/api/members', async (req, res) => {
    try {
        if (!req.body.nickname || !req.body.rank) {
            return res.status(400).json({ error: 'Nickname e rank são obrigatórios' });
        }

        // Verifica se já existe um membro com o mesmo nickname
        const existingMember = await Member.findOne({ nickname: req.body.nickname });
        if (existingMember) {
            return res.status(400).json({ error: 'Nickname já está em uso' });
        }

        // Verifica se já existe um comandante
        if (req.body.rank === 'commander') {
            const commanderExists = await Member.findOne({ rank: 'commander' });
            if (commanderExists) {
                return res.status(400).json({ error: 'Já existe um comandante no clan' });
            }
        }

        const newMember = new Member({
            nickname: req.body.nickname,
            rank: req.body.rank,
            image: req.body.image || null
        });

        await newMember.save();
        res.status(201).json(newMember); // Retorno direto igual às builds
    } catch (err) {
        console.error('Erro ao criar membro:', err);
        res.status(400).json({ error: 'Erro ao criar membro' });
    }
});

// Rotas para servir os arquivos HTML (mantido igual)
app.get('/builds', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'builds.html'));
});

app.get('/membros', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'membros.html'));
});

app.get('/estatistica', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'estatistica.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Adicione esta rota no seu server.js
app.put('/api/members/:id', async (req, res) => {
    try {
        const memberId = req.params.id;
        const updates = req.body;

        // Verificar se o membro existe
        const existingMember = await Member.findById(memberId);
        if (!existingMember) {
            return res.status(404).json({ error: 'Membro não encontrado' });
        }

        // Verificar se está tentando mudar para comandante e já existe um
        if (updates.rank === 'commander' && existingMember.rank !== 'commander') {
            const commanderExists = await Member.findOne({ rank: 'commander', _id: { $ne: memberId } });
            if (commanderExists) {
                return res.status(400).json({ error: 'Já existe um comandante no clan' });
            }
        }

        // Verificar se o nickname já está em uso por outro membro
        if (updates.nickname && updates.nickname !== existingMember.nickname) {
            const nicknameExists = await Member.findOne({ nickname: updates.nickname, _id: { $ne: memberId } });
            if (nicknameExists) {
                return res.status(400).json({ error: 'Nickname já está em uso' });
            }
        }

        // Atualizar o membro
        const updatedMember = await Member.findByIdAndUpdate(memberId, updates, { new: true });
        res.json(updatedMember);
    } catch (err) {
        console.error('Erro ao atualizar membro:', err);
        res.status(400).json({ error: 'Erro ao atualizar membro' });
    }
});

// Middleware para tratamento de erros (mantido igual)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Ocorreu um erro no servidor' });
});

// Iniciar servidor (mantido igual)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
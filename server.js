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
.then(() => console.log('Conectado ao MongoDB'))
.catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Modelo para as builds
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

// Modelo para os membros
const MemberSchema = new mongoose.Schema({
    nickname: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        maxlength: 20
    },
    rank: { 
        type: String, 
        required: true,
        enum: ['commander', 'vice', 'officer', 'member'],
        default: 'member'
    },
    image: { 
        type: String,
        validate: {
            validator: function(v) {
                return v === null || v.length < 700000;
            },
            message: 'A imagem deve ter no máximo 500KB'
        }
    },
    joinDate: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['active', 'inactive', 'on_leave'],
        default: 'active'
    },
    contributions: { type: Number, default: 0 }
}, {
    timestamps: true
});

const Member = mongoose.model('Member', MemberSchema);

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API para Builds
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

        if (req.body.shipImage.length > 700000) {
            return res.status(400).json({ error: 'A imagem é muito grande (máximo 500KB)' });
        }

        const newBuild = new Build(req.body);
        await newBuild.save();
        res.status(201).json(newBuild);
    } catch (err) {
        console.error('Erro ao criar build:', err);
        res.status(400).json({ error: 'Erro ao criar build' });
    }
});

// Rotas da API para Membros
// Rotas da API para Membros
app.get('/api/members', async (req, res) => {
    try {
        const members = await Member.find().sort({ rank: 1, createdAt: 1 });
        res.json({
            success: true,
            data: members
        });
    } catch (err) {
        console.error('Erro ao buscar membros:', err);
        res.status(500).json({
            success: false,
            error: 'Erro ao carregar membros'
        });
    }
});

app.post('/api/members', async (req, res) => {
    try {
        const { nickname, rank, image } = req.body;
        
        if (!nickname || !rank) {
            return res.status(400).json({
                success: false,
                error: 'Nickname e posição são obrigatórios'
            });
        }

        if (image && image.length > 700000) {
            return res.status(400).json({
                success: false,
                error: 'A imagem deve ter no máximo 500KB'
            });
        }

        const existingMember = await Member.findOne({ nickname });
        if (existingMember) {
            return res.status(400).json({
                success: false,
                error: 'Este nickname já está em uso'
            });
        }

        if (rank === 'commander') {
            const commanderExists = await Member.findOne({ rank: 'commander' });
            if (commanderExists) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Já existe um comandante. Apenas um comandante é permitido.' 
                });
            }
        }

        const newMember = new Member({
            nickname,
            rank,
            image: image || null
        });

        await newMember.save();
        res.status(201).json({
            success: true,
            data: newMember
        });
    } catch (err) {
        console.error('Erro ao criar membro:', err);
        res.status(400).json({
            success: false,
            error: 'Erro ao criar membro'
        });
    }
});

app.put('/api/members/:id', async (req, res) => {
    try {
        const { nickname, rank, image, status } = req.body;
        
        if (!nickname || !rank) {
            return res.status(400).json({ error: 'Nickname e posição são obrigatórios' });
        }

        if (image && image.length > 700000) {
            return res.status(400).json({ error: 'A imagem deve ter no máximo 500KB' });
        }

        const member = await Member.findById(req.params.id);
        if (!member) {
            return res.status(404).json({ error: 'Membro não encontrado' });
        }

        if (nickname !== member.nickname) {
            const nicknameExists = await Member.findOne({ nickname });
            if (nicknameExists) {
                return res.status(400).json({ error: 'Este nickname já está em uso' });
            }
        }

        if (rank === 'commander' && member.rank !== 'commander') {
            const commanderExists = await Member.findOne({ rank: 'commander' });
            if (commanderExists && commanderExists._id.toString() !== req.params.id) {
                return res.status(400).json({ 
                    error: 'Já existe um comandante. Apenas um comandante é permitido.' 
                });
            }
        }

        member.nickname = nickname;
        member.rank = rank;
        member.image = image || member.image;
        member.status = status || member.status;
        member.updatedAt = new Date();

        await member.save();
        res.json(member);
    } catch (err) {
        console.error('Erro ao atualizar membro:', err);
        res.status(400).json({ error: 'Erro ao atualizar membro' });
    }
});

app.delete('/api/members/:id', async (req, res) => {
    try {
        const member = await Member.findByIdAndDelete(req.params.id);
        
        if (!member) {
            return res.status(404).json({ error: 'Membro não encontrado' });
        }

        res.json({ message: 'Membro removido com sucesso' });
    } catch (err) {
        console.error('Erro ao remover membro:', err);
        res.status(500).json({ error: 'Erro ao remover membro' });
    }
});

// Rotas para servir os arquivos HTML
app.get('/builds', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'builds.html'));
});

app.get('/membros', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'membros.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Ocorreu um erro no servidor' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
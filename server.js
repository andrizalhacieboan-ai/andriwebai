import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import glm5 from './lib/glm5.js';
import gemini from './lib/gemini.js';
import dolphinai from './lib/dolphinai.js';
import gptFree from './lib/chatgpt.js';
import aibanana from './lib/aibanana.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Baca & Tulis JSON
const readJsonFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return {};
    } catch { return {}; }
};
const writeJsonFile = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

const visitorsFile = path.join(__dirname, 'lib', 'visitors.json');
const userDataFile = path.join(__dirname, 'lib', 'user_data.json');

// ========================================
// CHAT API ROUTES
// ========================================

app.post('/api/chat/glm5', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ success: false, error: 'Message is required' });
        const responseText = await glm5(message);
        res.json({ success: true, text: responseText });
    } catch (error) {
        console.error('GLM-5 Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/chat/gemini', async (req, res) => {
    try {
        const { message, instruction, sessionId } = req.body;
        if (!message) return res.status(400).json({ success: false, error: 'Message is required' });
        const response = await gemini({ message, instruction, sessionId });
        res.json({ success: true, text: response.text, sessionId: response.sessionId });
    } catch (error) {
        console.error('Gemini Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/chat/dolphin', async (req, res) => {
    try {
        const { message, messages, template } = req.body;
        let chatMessages = messages;
        if (!chatMessages && message) chatMessages = [{ role: 'user', content: String(message) }];
        if (!chatMessages || !Array.isArray(chatMessages) || chatMessages.length === 0) {
            return res.status(400).json({ success: false, error: 'Messages array or message string is required' });
        }
        const responseText = await dolphinai({ messages: chatMessages, template });
        res.json({ success: true, text: responseText });
    } catch (error) {
        console.error('DolphinAI Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/chat/chatgpt', async (req, res) => {
    try {
        const { message, prompt, temperature } = req.body;
        if (!message) return res.status(400).json({ success: false, error: 'Message is required' });
        const responseText = await gptFree({ message, prompt, temperature });
        res.json({ success: true, text: responseText });
    } catch (error) {
        console.error('GPT Free Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/image/banana', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ success: false, error: 'Prompt is required' });
        const result = await aibanana(message);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('AI Banana Error:', error.message);
        if (error.message.includes('free quota has been used up') || error.message.includes('429')) {
            return res.status(429).json({ success: false, error: '🚫 Kuota gratis AI Banana hari ini sudah habis.' });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========================================
// SMART ANALYTICS & LEARNING API
// ========================================

app.post('/api/stats/visit', (req, res) => {
    const { visitorId } = req.body;
    if (!visitorId) return res.status(400).json({ error: 'Visitor ID required' });

    try {
        let visitors = [];
        if (fs.existsSync(visitorsFile)) visitors = JSON.parse(fs.readFileSync(visitorsFile, 'utf8'));

        if (!visitors.includes(visitorId)) {
            visitors.push(visitorId);
            fs.writeFileSync(visitorsFile, JSON.stringify(visitors, null, 2));
        }
        res.json({ success: true, totalUsers: visitors.length });
    } catch (err) {
        console.error('Visitor count error:', err);
        res.json({ success: true, totalUsers: 0 });
    }
});

// Mencatat interaksi untuk Pembelajaran Otomatis (Model & Topik sering dipakai)
app.post('/api/stats/interaction', (req, res) => {
    const { visitorId, model, category } = req.body;
    if (!visitorId) return res.status(400).json({ error: 'Visitor ID required' });

    try {
        const userData = readJsonFile(userDataFile);
        if (!userData[visitorId]) {
            userData[visitorId] = { models: {}, categories: {}, preferences: {} };
        }

        const user = userData[visitorId];
        if (model) user.models[model] = (user.models[model] || 0) + 1;
        if (category) user.categories[category] = (user.categories[category] || 0) + 1;

        writeJsonFile(userDataFile, userData);
        res.json({ success: true });
    } catch (err) {
        console.error('Interaction log error:', err);
        res.status(500).json({ success: false });
    }
});

// Memberikan rekomendasi berdasarkan Analisis Data & Pembelajaran Otomatis
app.get('/api/recommendations', (req, res) => {
    const { visitorId } = req.query;
    if (!visitorId) return res.json({ success: true, recommendedModel: null });

    try {
        const userData = readJsonFile(userDataFile);
        const user = userData[visitorId];

        if (!user || Object.keys(user.models).length === 0) {
            return res.json({ success: true, recommendedModel: null });
        }

        // Cari model paling sering dipakai
        const sortedModels = Object.entries(user.models).sort((a, b) => b[1] - a[1]);
        const recommendedModel = sortedModels[0][0];

        // Cari topik paling sering dibahas
        const sortedCategories = Object.entries(user.categories).sort((a, b) => b[1] - a[1]);
        const recommendedCategory = sortedCategories.length > 0 ? sortedCategories[0][0] : null;

        res.json({ success: true, recommendedModel, recommendedCategory });
    } catch (err) {
        console.error('Recommendation error:', err);
        res.status(500).json({ success: false });
    }
});

// Menyimpan Personalisasi Pengguna
app.post('/api/stats/preferences', (req, res) => {
    const { visitorId, preferences } = req.body;
    if (!visitorId) return res.status(400).json({ error: 'Visitor ID required' });

    try {
        const userData = readJsonFile(userDataFile);
        if (!userData[visitorId]) {
            userData[visitorId] = { models: {}, categories: {}, preferences: {} };
        }

        userData[visitorId].preferences = { ...userData[visitorId].preferences, ...preferences };
        writeJsonFile(userDataFile, userData);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Preferences save error:', err);
        res.status(500).json({ success: false });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 ASM AI Server running on http://localhost:${PORT}`);
    });
}

export default app;

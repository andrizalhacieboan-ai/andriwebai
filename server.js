import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import glm5 from './lib/glm5.js';
import gemini from './lib/gemini.js';
import dolphinai from './lib/dolphinai.js';
import gptFree from './lib/chatgpt.js';
import aibanana from './lib/aibanana.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ========================================
// SECURITY MIDDLEWARE
// ========================================
// Helm melindungi dari kerentanan web dengan mengatur HTTP header dengan aman
app.use(helmet({
    contentSecurityPolicy: false, // Nonaktifkan jika mengganggu script external (Prism/Fonts)
    crossOriginEmbedderPolicy: false
}));

// Rate Limiter: Mencegah Spam & DDoS (Max 30 request per 1 menit per IP)
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 menit
    max: 15,
    message: { success: false, error: 'Terlalu banyak permintaan. Coba lagi dalam beberapa saat.' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(cors());
app.use(express.json());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Terapkan Rate Limiter khusus pada rute API
app.use('/api/', apiLimiter);

// ========================================
// SUPABASE INITIALIZATION
// ========================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ PERINGATAN: SUPABASE_URL atau SUPABASE_ANON_KEY belum diset!');
}

const supabase = createClient(supabaseUrl, supabaseKey);

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
            return res.status(429).json({ success: false, error: '🚫 Kuota gratis AI Banana habis.' });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========================================
// SUPABASE ANALYTICS & LEARNING API
// ========================================

app.post('/api/stats/visit', async (req, res) => {
    const { visitorId } = req.body;
    if (!visitorId) return res.status(400).json({ error: 'Visitor ID required' });
    try {
        await supabase.from('visitors').upsert({ visitor_id: visitorId }, { onConflict: 'visitor_id' });
        const { count, error: countError } = await supabase.from('visitors').select('*', { count: 'exact', head: true });
        if (countError) throw countError;
        res.json({ success: true, totalUsers: count || 0 });
    } catch (err) {
        console.error('Visitor count error:', err);
        res.json({ success: true, totalUsers: 0 });
    }
});

app.post('/api/stats/interaction', async (req, res) => {
    const { visitorId, model, category } = req.body;
    if (!visitorId) return res.status(400).json({ error: 'Visitor ID required' });
    try {
        await supabase.from('visitors').upsert({ visitor_id: visitorId }, { onConflict: 'visitor_id' });
        const { data: currentData } = await supabase.from('user_data').select('models, categories').eq('visitor_id', visitorId).single();
        const currentModels = currentData?.models || {};
        const currentCategories = currentData?.categories || {};
        if (model) currentModels[model] = (currentModels[model] || 0) + 1;
        if (category) currentCategories[category] = (currentCategories[category] || 0) + 1;
        await supabase.from('user_data').upsert({ visitor_id: visitorId, models: currentModels, categories: currentCategories, updated_at: new Date().toISOString() }, { onConflict: 'visitor_id' });
        res.json({ success: true });
    } catch (err) {
        console.error('Interaction log error:', err);
        res.status(500).json({ success: false });
    }
});

app.get('/api/recommendations', async (req, res) => {
    const { visitorId } = req.query;
    if (!visitorId) return res.json({ success: true, recommendedModel: null });
    try {
        const { data: userData, error } = await supabase.from('user_data').select('models, categories').eq('visitor_id', visitorId).single();
        if (error || !userData || Object.keys(userData.models || {}).length === 0) return res.json({ success: true, recommendedModel: null });
        const sortedModels = Object.entries(userData.models).sort((a, b) => b[1] - a[1]);
        res.json({ success: true, recommendedModel: sortedModels[0][0] });
    } catch (err) {
        console.error('Recommendation error:', err);
        res.status(500).json({ success: false });
    }
});

app.post('/api/stats/preferences', async (req, res) => {
    const { visitorId, preferences } = req.body;
    if (!visitorId) return res.status(400).json({ error: 'Visitor ID required' });
    try {
        await supabase.from('visitors').upsert({ visitor_id: visitorId }, { onConflict: 'visitor_id' });
        const { data: currentData } = await supabase.from('user_data').select('preferences').eq('visitor_id', visitorId).single();
        const mergedPreferences = { ...(currentData?.preferences || {}), ...preferences };
        await supabase.from('user_data').upsert({ visitor_id: visitorId, preferences: mergedPreferences, updated_at: new Date().toISOString() }, { onConflict: 'visitor_id' });
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
    app.listen(PORT, () => console.log(`🚀 ASM AI Server running on http://localhost:${PORT}`));
}

export default app;

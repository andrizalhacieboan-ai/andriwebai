import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import glm5 from './lib/glm5.js';
import gemini from './lib/gemini.js';
import dolphinai from './lib/dolphinai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

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

        // Fallback: Jika Frontend mengirim format string "message" (seperti API lain), 
        // otomatis ubah menjadi format "messages" array yang diminta DolphinAI
        if (!chatMessages && message) {
            chatMessages = [{ role: 'user', content: String(message) }];
        }

        if (!chatMessages  !Array.isArray(chatMessages)  chatMessages.length === 0) {
            return res.status(400).json({ success: false, error: 'Messages array or message string is required' });
        }

        const responseText = await dolphinai({ messages: chatMessages, template });
        res.json({ success: true, text: responseText });
    } catch (error) {
        console.error('DolphinAI Error:', error);
        res.status(500).json({ success: false, error: error.message });
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

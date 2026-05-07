import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Import AI Modules
import gpt52 from './lib/gpt52.js';
import gemini from './lib/gemini.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint for GPT-5.2 Model
app.post('/api/chat/gpt', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ success: false, error: 'Message is required' });
        
        const responseText = await gpt52(message);
        res.json({ success: true, text: responseText });
    } catch (error) {
        console.error('GPT Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint for Gemini Model
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

// Fallback route for SPA - send all other requests to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Listen on local port if not running in Vercel production
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 ASM AI Server running on http://localhost:${PORT}`);
    });
}

// Export app for Vercel Serverless Functions
export default app;
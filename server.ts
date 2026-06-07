// @ts-nocheck
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Credentials fallback configuration
  const groqApiKey = process.env.GROQ_API_KEY || '';
  const geminiApiKey = process.env.GEMINI_API_KEY || '';
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

  // Helper: Query Groq API (mock if no key)
  async function queryGroq(messages: { role: string; content: string }[], systemInstruction: string) {
    if (!groqApiKey) {
      return "⚠️ Groq API key not configured. Using mock response. All systems nominal.";
    }
    
    try {
      const payload = {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemInstruction },
          ...messages
        ],
        temperature: 0.7
      };

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Groq query failed: ${response.status}`);
      }

      const data: any = await response.json();
      return data.choices?.[0]?.message?.content || "No response from AI";
    } catch (err) {
      console.warn("Groq error:", err);
      return "⚠️ AI service temporarily unavailable. Using safe mode response.";
    }
  }

  // API endpoint for AI assistant diagnostics chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      const systemInstruction = `You are "SHIELD_AI", the tactical AI of "Gesture Shield". Provide industrial safety advice. Be concise and professional.`;

      const formattedMessages = history && Array.isArray(history) 
        ? history.map((h: any) => ({
            role: h.role === 'assistant' ? 'assistant' : 'user',
            content: h.content
          }))
        : [];
      
      formattedMessages.push({ role: 'user', content: message });

      const aiText = await queryGroq(formattedMessages, systemInstruction);
      return res.json({ text: aiText });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Failed to process query." });
    }
  });

  // API endpoint for decoding hand gestures
  app.post("/api/analyze-gesture", async (req, res) => {
    try {
      const { gestureName, severity, location } = req.body;
      const prompt = `Decode the "${gestureName}" hand gesture (Severity: ${severity || "MEDIUM"}) at ${location || "Sector 7"}. Provide safety instructions.`;

      const aiText = await queryGroq([{ role: "user", content: prompt }], "You are a gesture decoder.");
      
      return res.json({ text: aiText || `⚠️ ${gestureName} gesture detected! Safety protocol activated.` });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer();
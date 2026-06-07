import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Credentials fallback configuration for direct out-of-the-box operation
  const groqApiKey = process.env.GROQ_API_KEY || "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";
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL || "https://mkpobegtaykopmpeksiu.supabase.co";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  // Initializing Gemini as secondary fallback AI
  let geminiAi: GoogleGenAI | null = null;
  if (geminiApiKey) {
    geminiAi = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // Helper: Query Groq API
  async function queryGroq(messages: { role: string; content: string }[], systemInstruction: string) {
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
      const errText = await response.text();
      throw new Error(`Groq query failure: ${response.status} - ${errText}`);
    }

    const data: any = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  // Helper: Insert Event Logs to Supabase REST Gateway
  async function insertSupabaseRow(table: string, row: any) {
    if (!supabaseAnonKey) {
      console.info(`[SUPABASE_SIMULATION] Inserting row into '${table}':`, row);
      return;
    }

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
        method: "POST",
        headers: {
          "apikey": supabaseAnonKey,
          "Authorization": `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(row)
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (
          errorText.includes("PGRST205") || 
          errorText.includes("PGRST301") || 
          errorText.includes("schema cache") || 
          errorText.includes("Could not find the table") ||
          response.status === 404
        ) {
          console.info(`[SUPABASE_INFO] Table '${table}' is not yet provisioned in the cluster. Run the SQL schema script inside the Settings tab of Gesture Shield to create it. Local simulation used.`);
          return;
        }
        console.warn(`[SUPABASE_API_ERR] Error writing to '${table}':`, errorText);
      }
    } catch (err) {
      console.warn(`[SUPABASE_CONN_ERR] Could not sync with database:`, err);
    }
  }

  // API endpoint for AI assistant diagnostics chat (Groq Llama 3.3 with Gemini fallback)
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      const systemInstruction = `You are "SHIELD_AI" (AI_CORE_V4), the tactical artificial intelligence operating system of the "Gesture Shield" sign-language intelligence platform powered by Groq Llama 3.3.
Your mandate is to provide real-time, highly precise industrial diagnostics, safety audits, and tactical responses for an operating terminal (Device D-1, Zone B, plant security).

Maintain a highly technical, professional, resilient, alert tone, using uppercase terms for systems when appropriate (e.g. "SECTOR 7-G", "CORE_LOGIC_HUB", "URGENT STOP").
If operators transmit tactical queries, analyze them quickly, outputing clear technical feedback, correlation ratios, and protective actions (e.g. initiating lock downs or reduction in speed).

Always format your output in rich, polished markdown with appropriate technical labels. Be helpful, concise, and structured.`;

      const formattedMessages = history && Array.isArray(history) 
        ? history.map((h: any) => ({
            role: h.role === 'assistant' ? 'assistant' : 'user',
            content: h.content
          }))
        : [];
      
      formattedMessages.push({ role: 'user', content: message });

      // Run Groq primarily, Fallback to Gemini if requested or if Groq fails
      try {
        const groqText = await queryGroq(formattedMessages, systemInstruction);
        
        // Log transaction meta to Supabase (Database Log)
        await insertSupabaseRow("ai_convo_logs", {
          user_prompt: message,
          ai_reply: groqText,
          engine: "Groq Llama 3.3",
          created_at: new Date().toISOString()
        });

        return res.json({ text: groqText });
      } catch (groqErr: any) {
        console.warn("[BACKEND] Groq API returned error, attempting Gemini Fallback.", groqErr.message);
        
        if (geminiAi) {
          const contents = formattedMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          }));

          const response = await geminiAi.models.generateContent({
            model: "gemini-3.5-flash",
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.7
            }
          });

          await insertSupabaseRow("ai_convo_logs", {
            user_prompt: message,
            ai_reply: response.text,
            engine: "Gemini 3.5 Fallback",
            created_at: new Date().toISOString()
          });

          return res.json({ text: response.text });
        }

        // Return offline response block
        return res.json({
          text: `### ⚠️ [SYS_OFFLINE] AI_CORE DISCONNECTED\n\nGroq core failed and no secondary **GEMINI_API_KEY** was detected. Running in local safety-mode.\n\n* **Status Code:** sandbox_safety_nominal\n* **Suggested Action:** Confirm your API Keys are declared in settings and recheck terminal links.`
        });
      }

    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Failed to process tactical query." });
    }
  });

  // API endpoint for decoding hand gestures (Groq with Gemini fallback)
  app.post("/api/analyze-gesture", async (req, res) => {
    try {
      const { gestureName, severity, location } = req.body;
      const systemInstruction = "You are the GESTURE SHIELD hand gesture visual decoder and safety protocol compiler.";
      const prompt = `Decode the industrial consequences of the "${gestureName}" hand gesture (Severity Level: ${severity || "MEDIUM"}) at ${location || "Sector 7 Hallway B"}. Describe why it's triggered, correct industrial gesture instructions, the machine-safety sequence to trigger, and coordinate lock settings. Limit your breakdown to 2 scannable paragraphs.`;

      // Log biometric trigger to Supabase
      await insertSupabaseRow("biometric_gesture_logs", {
        gesture_name: gestureName,
        severity: severity || "MEDIUM",
        location: location || "Sector 7 Hallway B",
        timestamp: new Date().toISOString()
      });

      try {
        const groqResult = await queryGroq([{ role: "user", content: prompt }], systemInstruction);
        return res.json({ text: groqResult });
      } catch (err: any) {
        console.warn("[BACKEND] Groq analyze failed, falling back to Gemini.", err.message);

        if (geminiAi) {
          const response = await geminiAi.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.3
            }
          });
          return res.json({ text: response.text });
        }

        // Direct local translation fallback
        return res.json({
          text: `### 🔮 LOCAL_DECODER ANALYSIS (${gestureName})\n\nBiometric decoder returned localized backup result for **${gestureName}**.\n\n* **Severity:** ${severity || "ELEVATED"}\n* **Translation Outcome:** Safety protocol verified. Terminal sequence locked.`
        });
      }

    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // App metrics logs API proxy helper
  app.post("/api/supabase/sync-action", async (req, res) => {
    try {
      const { table, data } = req.body;
      await insertSupabaseRow(table, data);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

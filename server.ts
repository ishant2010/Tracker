import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = report_errors_wrapper(express());
const PORT = 3000;

function report_errors_wrapper(expressApp: express.Express) {
  return expressApp;
}

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Initialize Gemini SDK with User-Agent header for telemetry
// It will look for process.env.GEMINI_API_KEY
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Server-side API endpoint for the Data-Aware Contextual Health Assistant
app.post("/api/chat", async (req, res) => {
  try {
    const { message, context, history, model, searchGrounding, thinkingMode, image } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Default to gemini-3.5-flash if no model specified
    const selectedModel = model || "gemini-3.5-flash";

    // System instruction for the smart, direct, and unrestricted companion
    const systemInstruction = "You are a smart, direct, and friendly AI companion. Answer queries concisely and normally, like a helpful human. Do NOT write long, dramatic, or overly emotional essays. You have background access to the user's cycle data to provide context for health-related queries, but you are strictly unrestricted and can answer ANY question on ANY topic (including coding, mathematics, science, general knowledge, cinema, etc.) using your full capabilities. Be snappy and straight to the point.";

    // Bundle context dynamically with the prompt invisibly
    const promptWithContext = `[BACKGROUND DATA ON USER CURRENT STATE]\n${context || "No context available."}\n\n[USER MESSAGE]\n${message}`;

    // Reconstruct the chat history list for Gemini.
    const contents: any[] = [];
    
    // Add past history if provided
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        const role = msg.sender === 'user' ? 'user' : 'model';
        contents.push({
          role: role,
          parts: [{ text: msg.text }]
        });
      });
    }

    // Prepare parts for the final user prompt
    const userParts: any[] = [{ text: promptWithContext }];

    // If an image was uploaded, attach it as inlineData
    if (image && image.base64 && image.mimeType) {
      userParts.push({
        inlineData: {
          data: image.base64,
          mimeType: image.mimeType
        }
      });
    }

    // Append the final user prompt with context (and optional image) bundled in
    contents.push({
      role: 'user',
      parts: userParts
    });

    // We will attempt up to 4 fallback paths to recover from quota/rate limits on higher-tier models or tools
    const attempts = [
      { m: selectedModel, g: !!searchGrounding, t: !!thinkingMode },
      { m: selectedModel, g: false, t: !!thinkingMode }, // try without search grounding first
      { m: "gemini-3.5-flash", g: false, t: false }, // fallback to 3.5 flash balanced
      { m: "gemini-3.1-flash-lite", g: false, t: false } // fallback to ultra low-latency / high-quota lite
    ];

    // Deduplicate attempts to avoid redundant calls
    const uniqueAttempts: typeof attempts = [];
    const seen = new Set<string>();
    for (const att of attempts) {
      const key = `${att.m}-${att.g}-${att.t}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueAttempts.push(att);
      }
    }

    let lastError: any = null;
    let finalResponse: any = null;
    let usedModel = selectedModel;
    let usedSearchGrounding = !!searchGrounding;
    let usedThinkingMode = !!thinkingMode;

    for (let i = 0; i < uniqueAttempts.length; i++) {
      const att = uniqueAttempts[i];
      try {
        const configAttempt: any = {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        };

        if (att.g) {
          configAttempt.tools = [{ googleSearch: {} }];
        }

        if (att.t || att.m === "gemini-3.1-pro-preview") {
          configAttempt.thinkingConfig = {
            thinkingLevel: ThinkingLevel.HIGH
          };
        } else {
          configAttempt.maxOutputTokens = 2048;
        }

        finalResponse = await ai.models.generateContent({
          model: att.m,
          contents: contents,
          config: configAttempt,
        });

        usedModel = att.m;
        usedSearchGrounding = att.g;
        usedThinkingMode = att.t;
        lastError = null;
        break; // Success! Break out of the fallback loop
      } catch (err: any) {
        console.log(`[Gemini API Fallback Note] Attempt ${i + 1}/${uniqueAttempts.length} with model ${att.m} reached limit:`, err.message || err);
        lastError = err;
      }
    }

    if (lastError) {
      throw lastError;
    }

    let reply = finalResponse.text || "I'm sorry, I couldn't generate a response.";

    // If we adapted the options automatically, let the user know gently
    if (usedModel !== selectedModel || usedSearchGrounding !== !!searchGrounding) {
      const adaptations = [];
      if (usedModel !== selectedModel) {
        adaptations.push(`switched model from ${selectedModel} to ${usedModel}`);
      }
      if (!!searchGrounding && !usedSearchGrounding) {
        adaptations.push(`disabled Live Web Search`);
      }
      reply += `\n\n*(Note: Your assistant adjusted settings automatically to provide a response despite active API rate limits: ${adaptations.join(" and ")})*`;
    }

    // Extract search grounding chunks for references if available
    let sources: any[] = [];
    try {
      const candidates = finalResponse.candidates;
      if (candidates && candidates[0] && candidates[0].groundingMetadata) {
        const metadata = candidates[0].groundingMetadata;
        if (metadata.groundingChunks) {
          sources = metadata.groundingChunks
            .map((chunk: any) => ({
              title: chunk.web?.title || "Web Resource",
              uri: chunk.web?.uri || ""
            }))
            .filter((chunk: any) => chunk.uri !== "");
        }
      }
    } catch (err) {
      console.log("Failed to parse grounding metadata", err);
    }

    res.json({ reply, sources });
  } catch (error: any) {
    const isQuotaError = error.message && (
      error.message.includes("quota") || 
      error.message.includes("limit") || 
      error.message.includes("429") || 
      error.message.includes("RESOURCE_EXHAUSTED")
    );

    console.log("Gemini API Handled Exception:", error.message || error);
    
    // Return a graceful 200 message detailing exactly how the user can proceed
    res.json({ 
      error: error.message || "An error occurred with the AI assistant",
      reply: isQuotaError 
        ? "⚠️ **Gemini API Quota/Rate Limit Reached:** The current Gemini key has reached its free-tier limits or the model is overloaded. \n\n🌸 *Tip: Try changing the **Intelligence Base** option in the settings above to **⚡ Lite (Fast)** and make sure **Live Web Search** is turned off. These settings use lighter-weight endpoints with much higher quota limits!*"
        : `I encountered an issue connecting to my intelligence base: ${error.message || "Unknown communication issue"}. Please try again shortly or check your connection! 🌸`
    });
  }
});

// Vite dev server or static file serving
async function setupVite() {
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
    console.log(`Server running on port ${PORT}`);
  });
}

setupVite();

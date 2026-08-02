import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Healthcheck endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "Easy Agenda - Cooperativas de Crédito", timestamp: new Date().toISOString() });
  });

  // AI Visit Report Summarizer using Gemini API
  app.post("/api/gemini/summarize-report", async (req, res) => {
    try {
      const { rawNotes, clientName, visitType, locationName } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ 
          error: "GEMINI_API_KEY não configurada no ambiente." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `Você é um assistente sênior especialista em análise de visitas e relatórios corporativos para Cooperativas de Crédito (Sicoob, Sicredi, Cresol, Unicred, etc.).
Dada as anotações brutas de uma visita realizada por um colaborador/gerente de negócios:

Cliente/Cooperado: ${clientName || 'Não informado'}
Tipo de Visita: ${visitType || 'Reunião Externa'}
Agência/Localidade: ${locationName || 'Agência Principal'}
Anotações brutas: "${rawNotes}"

Elabore um relatório profissional estruturado em português do Brasil com o seguinte formato em Markdown:
### 1. Resumo Executivo
[Resumo conciso dos principais pontos abordados]

### 2. Oportunidades de Negócio & Produtos
[Produtos financeiros/cooperativos identificados, ex: Crédito Rural, Capital de Giro, Consórcio, Investimentos, Seguros]

### 3. Parecer e Perfil do Cooperado
[Impressões sobre a saúde financeira, estabilidade ou necessidades operacionais do cliente]

### 4. Próximos Passos & Prazos
[Ações recomendadas, responsáveis e datas sugeridas]

Mantenha um tom executivo, claro e objetivo voltado para apresentação a Gerentes de Agência e Diretores.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
      });

      res.json({ summary: response.text });
    } catch (err: any) {
      console.error("Erro ao gerar relatório com Gemini:", err);
      res.status(500).json({ error: "Falha ao processar relatório com IA", details: err?.message || String(err) });
    }
  });

  // Outlook Sync Mock Endpoint
  app.post("/api/outlook/sync", (req, res) => {
    const { title, date, startTime, endTime, location, attendees, organizer } = req.body;
    
    // Simulate Outlook Calendar Event Creation
    const outlookEventId = "OUTLOOK-" + Math.random().toString(36).substring(2, 9).toUpperCase();
    
    res.json({
      success: true,
      outlookEventId,
      status: "Sincronizado com Microsoft Outlook",
      syncedAt: new Date().toISOString(),
      invitesSentTo: attendees || [],
      organizer: organizer || "usuario@cooperativa.com.br",
      message: `Evento "${title}" agendado com sucesso no calendário do Outlook de todos os ${attendees?.length || 0} convidados.`,
    });
  });

  // Notify Manager Endpoint Mock
  app.post("/api/reports/notify-manager", (req, res) => {
    const { reportId, managers, reportTitle, authorName, locationName } = req.body;
    
    res.json({
      success: true,
      notifiedManagers: managers || ["gestor.agencia@cooperativa.com.br"],
      sentAt: new Date().toISOString(),
      message: `Relatório de Visita "${reportTitle}" enviado com sucesso via e-mail e notificação push para os gestores selecionados.`,
    });
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Easy Agenda Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

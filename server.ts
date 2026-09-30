import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createNotificationRouter, startNotificationScheduler } from "./notificationServer";
import { activityChatHandler } from "./activityTutorServer";
import { getReaderOnlineVoices, getReaderTtsConfig, synthesizeReaderTts } from "./readerTtsServer";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '2mb' }));
app.use('/api/notifications', createNotificationRouter());
app.post('/api/activity/chat', activityChatHandler);
app.get('/api/reader/tts', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ voices: getReaderOnlineVoices(), config: getReaderTtsConfig() });
});
app.post('/api/reader/tts', async (req, res) => {
  try {
    const result = await synthesizeReaderTts(req.body || {});
    res.setHeader('Content-Type', result.contentType);
    res.send(result.audio);
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : 'TTS failed' });
  }
});

async function startServer() {
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
    console.log(`Lịch Sống server is running on http://localhost:${PORT}`);
    startNotificationScheduler();
  });
}

startServer();

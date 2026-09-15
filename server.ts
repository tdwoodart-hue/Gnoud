import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createNotificationRouter, startNotificationScheduler } from "./notificationServer";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/api/notifications', createNotificationRouter());

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

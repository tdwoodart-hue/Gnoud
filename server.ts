import "dotenv/config";
import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { createNotificationRouter, startNotificationScheduler } from "./notificationServer";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use('/api/notifications', createNotificationRouter());

// Lazy-initialize Gemini client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIClient;
}

// Fallback heuristic parser for Vietnamese natural language input
function fallbackParseInput(prompt: string, baseDateStr?: string) {
  const now = baseDateStr ? new Date(baseDateStr) : new Date();
  const lower = prompt.toLowerCase();

  let type: "task" | "event" | "habit" = "task";
  let title = prompt.trim();
  let date = new Date(now);
  let startTime = "";
  let estimatedMinutes = 60;
  let priority: "urgent" | "high" | "medium" | "low" = "medium";
  let relatedProject = "";
  let reminder = "";

  if (lower.includes("mỗi ngày") || lower.includes("mỗi tối") || lower.includes("mỗi sáng") || lower.includes("hằng ngày")) {
    type = "habit";
  } else if (lower.includes("họp") || lower.includes("gặp") || lower.includes("sự kiện") || lower.includes("chụp") || lower.includes("lúc")) {
    type = "event";
  }

  // Date parsing
  if (lower.includes("hôm nay")) {
    // keep today
  } else if (lower.includes("ngày mai") || lower.includes("mai ")) {
    date.setDate(date.getDate() + 1);
  } else if (lower.includes("ngày kia") || lower.includes("mốt")) {
    date.setDate(date.getDate() + 2);
  } else if (lower.includes("thứ hai")) {
    const day = date.getDay();
    const diff = (1 + 7 - day) % 7 || 7;
    date.setDate(date.getDate() + diff);
  } else if (lower.includes("thứ ba")) {
    const day = date.getDay();
    const diff = (2 + 7 - day) % 7 || 7;
    date.setDate(date.getDate() + diff);
  } else if (lower.includes("thứ tư")) {
    const day = date.getDay();
    const diff = (3 + 7 - day) % 7 || 7;
    date.setDate(date.getDate() + diff);
  } else if (lower.includes("thứ năm")) {
    const day = date.getDay();
    const diff = (4 + 7 - day) % 7 || 7;
    date.setDate(date.getDate() + diff);
  } else if (lower.includes("thứ sáu")) {
    const day = date.getDay();
    const diff = (5 + 7 - day) % 7 || 7;
    date.setDate(date.getDate() + diff);
  } else if (lower.includes("thứ bảy")) {
    const day = date.getDay();
    const diff = (6 + 7 - day) % 7 || 7;
    date.setDate(date.getDate() + diff);
  } else if (lower.includes("chủ nhật")) {
    const day = date.getDay();
    const diff = (0 + 7 - day) % 7 || 7;
    date.setDate(date.getDate() + diff);
  }

  // Time parsing
  const timeMatch = lower.match(/(?:lúc\s*)?(\d{1,2})(?::(\d{2}))?\s*(?:giờ|h)?\s*(sáng|chiều|tối)?/);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const period = timeMatch[3];
    if (period === "chiều" && hour < 12) hour += 12;
    if (period === "tối" && hour < 12) hour += 12;
    if (hour >= 0 && hour <= 23) {
      startTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }
  }

  // Duration parsing
  const durationMatch = lower.match(/(\d+)\s*(?:tiếng|giờ)/);
  if (durationMatch) {
    estimatedMinutes = parseInt(durationMatch[1], 10) * 60;
  } else {
    const minMatch = lower.match(/(\d+)\s*(?:phút|p)/);
    if (minMatch) estimatedMinutes = parseInt(minMatch[1], 10);
  }

  // Project detection
  if (lower.includes("senko")) relatedProject = "Ra mắt Senko";
  else if (lower.includes("luvin") || lower.includes("the luvin")) relatedProject = "The Luvin";
  else if (lower.includes("lego") || lower.includes("hộp nhẫn")) relatedProject = "Concept hộp nhẫn LEGO";
  else if (lower.includes("bảng từ") || lower.includes("content")) relatedProject = "Kế hoạch nội dung bảng từ tính";
  else if (lower.includes("cá nhân") || lower.includes("gia đình") || lower.includes("khám") || lower.includes("mua")) relatedProject = "Việc cá nhân";

  // Priority detection
  if (lower.includes("gấp") || lower.includes("khẩn cấp") || lower.includes("ngay lập tức")) priority = "urgent";
  else if (lower.includes("quan trọng") || lower.includes("ưu tiên")) priority = "high";

  // Reminder
  if (lower.includes("nhắc tôi") || lower.includes("nhắc")) {
    reminder = startTime ? `Trước ${startTime} 15 phút` : "Trước giờ bắt đầu 15 phút";
  }

  // Refine clean title
  let cleanedTitle = prompt
    .replace(/(?:mai|hôm nay|ngày kia|thứ [hai|ba|tư|năm|sáu|bảy]|chủ nhật)\s*/gi, "")
    .replace(/(?:lúc\s*)?\d{1,2}(?::\d{2})?\s*(?:giờ|h)?\s*(?:sáng|chiều|tối)?\s*/gi, "")
    .replace(/(?:trong\s*)?\d+\s*(?:tiếng|giờ|phút|p)\s*/gi, "")
    .replace(/nhắc tôi\s*/gi, "")
    .replace(/mỗi (?:ngày|tối|sáng)\s*/gi, "")
    .trim();

  if (cleanedTitle.length < 3) cleanedTitle = prompt;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const formattedDate = `${yyyy}-${mm}-${dd}`;

  return {
    title: cleanedTitle.charAt(0).toUpperCase() + cleanedTitle.slice(1),
    type,
    date: formattedDate,
    startTime: startTime || "09:00",
    estimatedMinutes,
    priority,
    relatedProject: relatedProject || "Công việc chung",
    reminder: reminder || "15 phút trước",
    rawInput: prompt,
  };
}

// 1. Natural Language Input Parser endpoint
app.post("/api/gemini/parse-input", async (req, res) => {
  const { prompt, baseDate } = req.body;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing prompt" });
  }

  const ai = getGenAI();
  if (!ai) {
    return res.json(fallbackParseInput(prompt, baseDate));
  }

  try {
    const systemInstruction = `Bạn là bộ phân tích ngôn ngữ tự nhiên thông minh cho ứng dụng Lịch Sống của người Việt.
Hôm nay là: ${baseDate || new Date().toISOString().slice(0, 10)}.
Nhiệm vụ: Phân tích câu nhập vào của người dùng và trả về đối tượng JSON theo cấu trúc:
{
  "title": "Tên ngắn gọn, rõ ràng của nhiệm vụ/sự kiện",
  "type": "task" | "event" | "habit",
  "date": "YYYY-MM-DD",
  "startTime": "HH:mm" (ví dụ 09:00, 15:00, nếu không rõ hãy gán hợp lý theo ngữ cảnh),
  "estimatedMinutes": số nguyên phút (ví dụ 30, 60, 120),
  "priority": "urgent" | "high" | "medium" | "low",
  "relatedProject": "Tên dự án liên quan nhất (ví dụ: 'Ra mắt Senko', 'The Luvin', 'Concept hộp nhẫn LEGO', 'Kế hoạch nội dung bảng từ tính', 'Việc cá nhân', hoặc 'Công việc chung')",
  "reminder": "Chuông nhắc nhở (ví dụ: '15 phút trước', 'Không')",
  "actionType": "create" | "reschedule" | "delete"
}
Lưu ý:
- "Mai 9 giờ chụp sản phẩm Senko trong 2 tiếng" -> title: "Chụp sản phẩm Senko", type: "event", startTime: "09:00", estimatedMinutes: 120, relatedProject: "Ra mắt Senko"
- "Nhắc tôi gọi nhà cung cấp lúc 3 giờ chiều" -> title: "Gọi nhà cung cấp", startTime: "15:00", estimatedMinutes: 15
- "Hoàn thiện concept hộp nhẫn đỏ đô trước thứ Sáu" -> title: "Hoàn thiện concept hộp nhẫn đỏ đô", relatedProject: "Concept hộp nhẫn LEGO"
- "Mỗi tối đi bộ 30 phút" -> type: "habit", estimatedMinutes: 30, startTime: "20:00"
- "Dời việc viết content sang sáng mai" -> actionType: "reschedule", title: "Viết content"
Chỉ trả về JSON thuần túy, không có markdown codeblock.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    return res.json({
      ...fallbackParseInput(prompt, baseDate),
      ...parsed,
      rawInput: prompt,
    });
  } catch (err) {
    console.error("Gemini parse-input error, using fallback:", err);
    return res.json(fallbackParseInput(prompt, baseDate));
  }
});

// 2. Interactive AI Assistant endpoint
app.post("/api/gemini/chat", async (req, res) => {
  const { messages, context } = req.body;
  const ai = getGenAI();

  if (!ai) {
    return res.json({
      reply: "Chào bạn! Tôi là trợ lý Lịch Sống. Tôi có thể giúp bạn sắp xếp thứ tự ưu tiên, phân tích thời gian biểu và đề xuất giải pháp tối ưu cho ngày hôm nay.",
      proposedAction: null,
    });
  }

  try {
    const systemInstruction = `Bạn là Trợ lý AI cá nhân cao cấp của ứng dụng 'Lịch Sống' tại Việt Nam.
Giọng điệu: Thân thiện, điềm tĩnh, thông minh, ngắn gọn, thấu hiểu và hỗ trợ.
Không bao giờ tự ý thay đổi lịch trình của người dùng mà KHÔNG hỏi ý kiến và đề xuất hành động rõ ràng.
Người dùng có các dự án: 'The Luvin', 'Ra mắt Senko', 'Concept hộp nhẫn LEGO', 'Kế hoạch nội dung bảng từ tính', 'Việc cá nhân'.

Ngữ cảnh hiện tại của người dùng:
${JSON.stringify(context || {}, null, 2)}

Hãy trả lời bằng tiếng Việt tự nhiên và nếu phù hợp, kèm theo một đề xuất hành động (proposedAction) cụ thể để người dùng có thể bấm nút "Áp dụng" hoặc "Từ chối".
Định dạng JSON trả về:
{
  "reply": "Nội dung phản hồi súc tích bằng tiếng Việt",
  "proposedAction": {
    "type": "reschedule_task" | "create_task" | "breakdown_task" | "block_focus_time",
    "description": "Mô tả ngắn gọn hành động được đề xuất",
    "data": { ...thông tin chi tiết của hành động... }
  } hoặc null nếu chỉ là giải đáp trò chuyện
}`;

    const lastMessage = messages[messages.length - 1]?.text || "Xin chào";

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: lastMessage,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    return res.json(parsed);
  } catch (err) {
    console.error("Gemini chat error:", err);
    return res.json({
      reply: "Tôi đã nhận được thông tin. Bạn có muốn tôi giúp rà soát 3 việc quan trọng nhất cho hôm nay không?",
      proposedAction: null,
    });
  }
});

// 3. Task breakdown endpoint
app.post("/api/gemini/breakdown-task", async (req, res) => {
  const { taskTitle, taskDescription, estimatedMinutes } = req.body;
  const ai = getGenAI();

  const fallbackSubtasks = [
    { id: "sub-1", title: `Nghiên cứu & chuẩn bị tài liệu cho ${taskTitle}`, completed: false, estimatedMinutes: 20 },
    { id: "sub-2", title: `Thực hiện phần cốt lõi của ${taskTitle}`, completed: false, estimatedMinutes: 45 },
    { id: "sub-3", title: `Rà soát, kiểm tra và hoàn thiện chất lượng`, completed: false, estimatedMinutes: 25 },
  ];

  if (!ai) {
    return res.json({ subtasks: fallbackSubtasks });
  }

  try {
    const prompt = `Hãy chia nhỏ nhiệm vụ lớn sau đây thành 3-5 bước thực hiện cụ thể, dễ hành động:
Tên nhiệm vụ: "${taskTitle}"
Mô tả: "${taskDescription || "Không có"}"
Tổng thời gian dự kiến: ${estimatedMinutes || 90} phút.

Trả về mảng JSON các bước:
{
  "subtasks": [
    { "title": "...", "estimatedMinutes": 30 }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const result = JSON.parse(response.text?.trim() || "{}");
    const subtasks = (result.subtasks || []).map((st: any, idx: number) => ({
      id: `sub-${Date.now()}-${idx}`,
      title: st.title,
      completed: false,
      estimatedMinutes: st.estimatedMinutes || 20,
    }));

    return res.json({ subtasks: subtasks.length ? subtasks : fallbackSubtasks });
  } catch (err) {
    console.error("Breakdown error:", err);
    return res.json({ subtasks: fallbackSubtasks });
  }
});

// 4. Smart AI Scheduling endpoint
app.post("/api/gemini/smart-schedule", async (req, res) => {
  const { date, unscheduledTasks, existingEvents } = req.body;
  const ai = getGenAI();

  // Basic fallback scheduling
  let nextHour = 9;
  const proposedBlocks = (unscheduledTasks || []).slice(0, 5).map((task: any, idx: number) => {
    const startH = nextHour;
    const duration = Math.min(task.estimatedMinutes || 60, 90);
    const endH = startH + Math.floor(duration / 60);
    const endM = duration % 60;
    nextHour = endH + 1; // 1 hr buffer/break
    return {
      taskId: task.id,
      taskTitle: task.title,
      date: date || new Date().toISOString().slice(0, 10),
      startTime: `${String(startH).padStart(2, "0")}:00`,
      endTime: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
      reason: `Ưu tiên ${task.priority === "urgent" ? "khẩn cấp" : "quan trọng"}, xếp vào khung giờ tập trung cao sáng/chiều`,
    };
  });

  if (!ai) {
    return res.json({
      proposedSchedule: proposedBlocks,
      summary: `Đã xếp lịch cho ${proposedBlocks.length} công việc, chèn khoảng nghỉ 15-30 phút giữa các phiên.`,
    });
  }

  try {
    const prompt = `Bạn là hệ thống xếp lịch AI thông minh (Sunsama style) cho ngày ${date}.
Nhiệm vụ: Sắp xếp các công việc chưa lên lịch vào các khung thời gian trống hợp lý trong ngày (từ 08:30 đến 18:00).
Yêu cầu bắt buộc:
1. Tôn trọng deadline và công việc khẩn cấp xếp trước.
2. Tránh xếp liên tục (back-to-back), luôn chèn 15 phút nghỉ ngơi sau mỗi phiên làm việc > 45 phút.
3. Không trùng với các sự kiện đã có: ${JSON.stringify(existingEvents || [])}.
4. Các công việc cần xếp: ${JSON.stringify(unscheduledTasks || [])}.

Trả về định dạng JSON:
{
  "summary": "Tóm tắt ngắn gọn lý do phân bổ thời gian",
  "proposedSchedule": [
    {
      "taskId": "id công việc",
      "taskTitle": "tên công việc",
      "date": "${date}",
      "startTime": "HH:mm",
      "endTime": "HH:mm",
      "reason": "Lý do chọn khung giờ này"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    return res.json({
      summary: parsed.summary || "Đã phân bổ thời gian tối ưu cho bạn.",
      proposedSchedule: parsed.proposedSchedule || proposedBlocks,
    });
  } catch (err) {
    console.error("Smart schedule error:", err);
    return res.json({
      proposedSchedule: proposedBlocks,
      summary: "Đã phân bổ các công việc quan trọng vào khung giờ phù hợp nhất.",
    });
  }
});

// 5. Project Health Summary endpoint
app.post("/api/gemini/project-health", async (req, res) => {
  const { project, tasks, milestones } = req.body;
  const ai = getGenAI();

  if (!ai) {
    const total = tasks?.length || 0;
    const completed = tasks?.filter((t: any) => t.status === "done").length || 0;
    const overdue = tasks?.filter((t: any) => t.deadline && new Date(t.deadline) < new Date() && t.status !== "done").length || 0;

    let status: "healthy" | "at_risk" | "needs_attention" = "healthy";
    let summary = "Dự án đang tiến triển đúng tiến độ kế hoạch.";
    if (overdue > 0) {
      status = "at_risk";
      summary = `Có ${overdue} việc quá hạn cần xử lý ngay để kịp mốc bàn giao.`;
    } else if (completed / (total || 1) < 0.3) {
      status = "needs_attention";
      summary = "Tốc độ hoàn thành các mốc quan trọng cần được đẩy mạnh.";
    }

    return res.json({
      status,
      score: Math.round((completed / (total || 1)) * 100),
      summary,
      recommendations: [
        "Ưu tiên hoàn thành các đầu việc gắn với cột mốc tiếp theo.",
        "Rà soát lại thời gian dự kiến cho từng bước thực hiện.",
      ],
    });
  }

  try {
    const prompt = `Đánh giá sức khỏe dự án '${project.name}':
Mục tiêu dự án: ${project.description}
Hạn chót: ${project.targetDate || "Chưa đặt"}
Các cột mốc: ${JSON.stringify(milestones || [])}
Danh sách việc: ${JSON.stringify(tasks || [])}

Hãy đánh giá tình trạng dự án theo JSON:
{
  "status": "healthy" | "at_risk" | "needs_attention",
  "score": số điểm từ 0 đến 100,
  "summary": "1-2 câu nhận định ngắn gọn",
  "recommendations": ["Lời khuyên 1", "Lời khuyên 2"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    return res.json(parsed);
  } catch (err) {
    console.error("Project health error:", err);
    return res.json({
      status: "healthy",
      score: 85,
      summary: "Dự án đang tiến triển ổn định với các mốc công việc rõ ràng.",
      recommendations: ["Tiếp tục bám sát cột mốc chính trong tuần này."],
    });
  }
});

// Vite middleware setup
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

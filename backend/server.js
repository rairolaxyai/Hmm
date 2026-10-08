const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 10000;

// ================================
// MIDDLEWARE
// ================================

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

// ================================
// TEMPORARY IN-MEMORY STORAGE
// ================================

const conversations = new Map();

// ================================
// ROOT
// ================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    name: "Rairolaxy AI",
    message: "Rairolaxy AI backend is running.",
    version: "1.0.0",
  });
});

// ================================
// HEALTH CHECK
// ================================

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    service: "rairolaxy-ai-backend",
    time: new Date().toISOString(),
  });
});

// ================================
// API STATUS
// ================================

app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    backend: true,
    aiProviderConfigured: Boolean(process.env.AI_API_KEY),
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    message: "Rairolaxy AI backend is connected.",
  });
});

// ================================
// CREATE CONVERSATION
// ================================

app.post("/api/conversations", (req, res) => {
  const title =
    typeof req.body?.title === "string" && req.body.title.trim()
      ? req.body.title.trim()
      : "New Chat";

  const id = `conv_${Date.now()}`;

  const conversation = {
    id,
    title,
    pinned: false,
    archived: false,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  conversations.set(id, conversation);

  res.status(201).json({
    success: true,
    conversation,
  });
});

// ================================
// GET ALL CONVERSATIONS
// ================================

app.get("/api/conversations", (req, res) => {
  res.json({
    success: true,
    conversations: Array.from(conversations.values()).map(
      ({ messages, ...conversation }) => conversation
    ),
  });
});

// ================================
// GET ONE CONVERSATION
// ================================

app.get("/api/conversations/:id", (req, res) => {
  const conversation = conversations.get(req.params.id);

  if (!conversation) {
    return res.status(404).json({
      success: false,
      error: "Conversation not found",
    });
  }

  res.json({
    success: true,
    conversation,
  });
});

// ================================
// SEND MESSAGE
// ================================

app.post("/api/conversations/:id/messages", async (req, res) => {
  try {
    const message = req.body?.message;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    const conversation = conversations.get(req.params.id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    // ================================
    // USER MESSAGE
    // ================================

    const userMessage = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: message.trim(),
      createdAt: new Date().toISOString(),
    };

    conversation.messages.push(userMessage);

    // ================================
    // AI PROVIDER CONNECTION
    // ================================
    // Actual AI API can be connected here
    // using AI_API_KEY and AI_API_URL.
    // ================================

    const assistantMessage = {
      id: `msg_${Date.now()}_ai`,
      role: "assistant",
      content:
        "Rairolaxy AI backend connected hai. AI provider connection abhi configure nahi hai.",
      createdAt: new Date().toISOString(),
    };

    conversation.messages.push(assistantMessage);

    conversation.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      userMessage,
      assistantMessage,
      conversation,
    });
  } catch (error) {
    console.error("Message error:", error);

    res.status(500).json({
      success: false,
      error: "Failed to process message",
    });
  }
});

// ================================
// DELETE CONVERSATION
// ================================

app.delete("/api/conversations/:id", (req, res) => {
  const exists = conversations.has(req.params.id);

  if (!exists) {
    return res.status(404).json({
      success: false,
      error: "Conversation not found",
    });
  }

  conversations.delete(req.params.id);

  res.json({
    success: true,
    message: "Conversation deleted",
  });
});

// ================================
// 404 HANDLER
// ================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "API route not found",
    path: req.originalUrl,
  });
});

// ================================
// ERROR HANDLER
// ================================

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// ================================
// START SERVER
// ================================

app.listen(PORT, () => {
  console.log("====================================");
  console.log("Rairolaxy AI Backend Started");
  console.log(`Port: ${PORT}`);
  console.log(`AI API configured: ${Boolean(process.env.AI_API_KEY)}`);
  console.log(`Database configured: ${Boolean(process.env.DATABASE_URL)}`);
  console.log("====================================");
});

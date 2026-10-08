const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 10000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));

// ─────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────

app.get("/", (req, res) => {
  res.json({
    success: true,
    app: "Rairolaxy AI",
    status: "online",
    message: "Rairolaxy AI backend is running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    service: "rairolaxy-ai-backend",
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────
// TEMPORARY IN-MEMORY DATA
// Database baad mein connect karenge
// ─────────────────────────────────────

const conversations = new Map();

// ─────────────────────────────────────
// CREATE CONVERSATION
// ─────────────────────────────────────

app.post("/api/conversations", (req, res) => {
  const { title = "New Chat" } = req.body;

  const id = `conv_${Date.now()}`;

  const conversation = {
    id,
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  };

  conversations.set(id, conversation);

  res.status(201).json({
    success: true,
    conversation,
  });
});

// ─────────────────────────────────────
// GET CONVERSATIONS
// ─────────────────────────────────────

app.get("/api/conversations", (req, res) => {
  res.json({
    success: true,
    conversations: Array.from(conversations.values()).map(
      ({ messages, ...conversation }) => conversation
    ),
  });
});

// ─────────────────────────────────────
// GET ONE CONVERSATION
// ─────────────────────────────────────

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

// ─────────────────────────────────────
// SEND MESSAGE
// ─────────────────────────────────────

app.post("/api/conversations/:id/messages", async (req, res) => {
  const { message } = req.body;

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

  const userMessage = {
    id: `msg_${Date.now()}`,
    role: "user",
    content: message,
    createdAt: new Date().toISOString(),
  };

  conversation.messages.push(userMessage);

  /*
   * AI PROVIDER CONNECTION
   *
   * Yahan actual AI API connect hogi.
   * API key .env mein rakhi jayegi.
   */

  const assistantMessage = {
    id: `msg_${Date.now()}_ai`,
    role: "assistant",
    content:
      "Rairolaxy AI backend connected hai. AI provider connection

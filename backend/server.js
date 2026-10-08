require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 10000;
const AI_API_KEY = process.env.NVIDIA_API_KEY || process.env.AI_API_KEY;
const AI_API_URL =
  process.env.NVIDIA_API_URL ||
  process.env.AI_API_URL ||
  "https://integrate.api.nvidia.com/v1/chat/completions";

const AI_MODEL =
  process.env.NVIDIA_MODEL ||
  process.env.AI_MODEL ||
  "nvidia/nemotron-3-super-120b-a12b";

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

// In-memory conversations
const conversations = new Map();

app.get("/", (req, res) => {
  res.json({
    success: true,
    name: "Rairolaxy AI Backend",
    status: "running",
    provider: "NVIDIA",
    model: AI_MODEL,
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    aiConfigured: Boolean(AI_API_KEY),
  });
});

app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    backend: "connected",
    aiProvider: "NVIDIA",
    aiConfigured: Boolean(AI_API_KEY),
    model: AI_MODEL,
  });
});

// Create conversation
app.post("/api/conversations", (req, res) => {
  const id =
    req.body?.id ||
    `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const conversation = {
    id,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  conversations.set(id, conversation);

  res.json({
    success: true,
    conversation,
  });
});

// Get conversation
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

// Send message + NVIDIA AI response
app.post("/api/conversations/:id/messages", async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userMessage = String(req.body?.message || "").trim();

    if (!userMessage) {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    if (!AI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "NVIDIA_API_KEY is not configured on the server.",
      });
    }

    let conversation = conversations.get(conversationId);

    if (!conversation) {
      conversation = {
        id: conversationId,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      conversations.set(conversationId, conversation);
    }

    // Save user message
    conversation.messages.push({
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    });

    // Send recent conversation history to NVIDIA
    const history = conversation.messages
      .slice(-20)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    const response = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are Rairolaxy AI, a helpful, intelligent and conversational AI assistant. Give accurate, clear and useful answers. Respond in the language used by the user.",
          },
          ...history,
        ],
        temperature: 0.7,
        max_tokens: 2048,
        stream: false,
      }),
    });

    const rawText = await response.text();

    let data;

    try {
      data = JSON.parse(rawText);
    } catch {
      data = null;
    }

    if (!response.ok) {
      console.error("NVIDIA API error:", response.status, rawText);

      return res.status(502).json({
        success: false,
        error: "NVIDIA AI request failed.",
        providerStatus: response.status,
        details: data?.error?.message || rawText.slice(0, 500),
      });
    }

    const assistantMessage =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      "";

    if (!assistantMessage) {
      console.error("Unexpected NVIDIA response:", data);

      return res.status(502).json({
        success: false,
        error: "NVIDIA returned an empty AI response.",
      });
    }

    // Save AI response
    conversation.messages.push({
      role: "assistant",
      content: assistantMessage,
      createdAt: new Date().toISOString(),
    });

    conversation.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      conversationId,
      message: {
        role: "assistant",
        content: assistantMessage,
        createdAt: new Date().toISOString(),
      },
      usage: data?.usage || null,
      model: data?.model || AI_MODEL,
    });
  } catch (error) {
    console.error("Chat error:", error);

    res.status(500).json({
      success: false,
      error: "AI request failed.",
      details: error.message,
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Rairolaxy AI backend running on port ${PORT}`);
  console.log(`🤖 AI provider: NVIDIA`);
  console.log(`🧠 Model: ${AI_MODEL}`);
  console.log(`🔑 NVIDIA API key: ${AI_API_KEY ? "configured" : "missing"}`);
});

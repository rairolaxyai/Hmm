require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 10000;

const NVIDIA_API_KEY =
  process.env.NVIDIA_API_KEY ||
  process.env.NIVIDA_API_KEY ||
  process.env.AI_API_KEY;

const NVIDIA_API_URL =
  process.env.NVIDIA_API_URL ||
  process.env.AI_API_URL ||
  "https://integrate.api.nvidia.com/v1/chat/completions";

const NVIDIA_MODEL =
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

const conversations = new Map();

app.get("/", (req, res) => {
  res.json({
    success: true,
    name: "Rairolaxy AI Backend",
    status: "running",
    provider: "NVIDIA",
    model: NVIDIA_MODEL,
  });
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    aiConfigured: Boolean(NVIDIA_API_KEY),
    provider: "NVIDIA",
    model: NVIDIA_MODEL,
  });
});

app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    backend: "connected",
    aiProvider: "NVIDIA",
    aiConfigured: Boolean(NVIDIA_API_KEY),
    model: NVIDIA_MODEL,
  });
});

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

app.post("/api/conversations/:id/messages", async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userMessage = String(req.body?.message || "").trim();

    if (!userMessage) {
      return res.status(400).json({
        success: false,
        error: "Message is required.",
      });
    }

    if (!NVIDIA_API_KEY) {
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

    conversation.messages.push({
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    });

    const messages = [
      {
        role: "system",
        content:
          "You are Rairolaxy AI, a helpful, intelligent conversational AI assistant. Answer accurately and naturally. Reply in the same language used by the user.",
      },
      ...conversation.messages.slice(-20).map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    console.log("Sending request to NVIDIA...");
    console.log("Model:", NVIDIA_MODEL);
    console.log("URL:", NVIDIA_API_URL);

    const nvidiaResponse = await fetch(NVIDIA_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
        stream: false,
      }),
    });

    const rawResponse = await nvidiaResponse.text();

    console.log("NVIDIA status:", nvidiaResponse.status);
    console.log(
      "NVIDIA response:",
      rawResponse.substring(0, 3000)
    );

    let data = null;

    try {
      data = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error("NVIDIA returned non-JSON response.");
    }

    if (!nvidiaResponse.ok) {
      return res.status(502).json({
        success: false,
        error: "NVIDIA API request failed.",
        status: nvidiaResponse.status,
        details:
          data?.error?.message ||
          data?.message ||
          rawResponse.substring(0, 1000),
      });
    }

    let assistantMessage = "";

    if (typeof data?.choices?.[0]?.message?.content === "string") {
      assistantMessage = data.choices[0].message.content;
    }

    if (!assistantMessage && typeof data?.choices?.[0]?.text === "string") {
      assistantMessage = data.choices[0].text;
    }

    if (!assistantMessage && typeof data?.output_text === "string") {
      assistantMessage = data.output_text;
    }

    if (!assistantMessage && Array.isArray(data?.output)) {
      assistantMessage = data.output
        .map((item) => {
          if (typeof item === "string") return item;

          if (typeof item?.text === "string") {
            return item.text;
          }

          if (Array.isArray(item?.content)) {
            return item.content
              .map((content) => content?.text || "")
              .join("");
          }

          return "";
        })
        .join("");
    }

    assistantMessage = String(assistantMessage || "").trim();

    if (!assistantMessage) {
      console.error(
        "EMPTY NVIDIA RESPONSE:",
        JSON.stringify(data, null, 2)
      );

      return res.status(502).json({
        success: false,
        error: "Rairolaxy AI returned an empty response.",
        provider: "NVIDIA",
        model: NVIDIA_MODEL,
        rawResponse: rawResponse.substring(0, 2000),
      });
    }

    conversation.messages.push({
      role: "assistant",
      content: assistantMessage,
      createdAt: new Date().toISOString(),
    });

    conversation.updatedAt = new Date().toISOString();

    return res.json({
      success: true,
      conversationId,
      message: {
        role: "assistant",
        content: assistantMessage,
        createdAt: new Date().toISOString(),
      },
      model: data?.model || NVIDIA_MODEL,
      usage: data?.usage || null,
    });
  } catch (error) {
    console.error("AI CHAT ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "AI request failed.",
      details: error.message,
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("====================================");
  console.log("🚀 Rairolaxy AI Backend Started");
  console.log("🤖 Provider: NVIDIA");
  console.log("🧠 Model:", NVIDIA_MODEL);
  console.log(
    "🔑 API Key:",
    NVIDIA_API_KEY ? "CONFIGURED" : "MISSING"
  );
  console.log("🌐 Port:", PORT);
  console.log("====================================");
});

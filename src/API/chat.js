import api from "./axios";
import sellerApi from "./sellerAxios";

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const readStorage = (key) => {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem(key) ||
    sessionStorage.getItem(key) ||
    ""
  );
};

const cleanToken = (value) => {
  if (!value) return "";

  let token = String(value || "").trim();

  const parsed = safeJsonParse(token);
  if (typeof parsed === "string") token = parsed.trim();

  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }

  if (token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim();
  }

  return token;
};

const decodeJwtPayload = (token) => {
  try {
    const clean = cleanToken(token);
    if (!clean || !clean.includes(".")) return null;

    const base64 = clean.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);

    return safeJsonParse(json);
  } catch {
    return null;
  }
};

const getTokenForRole = (role) => {
  if (role === "seller") {
    return (
      cleanToken(readStorage("sellerToken")) ||
      cleanToken(readStorage("token")) ||
      cleanToken(readStorage("accessToken")) ||
      cleanToken(readStorage("authToken"))
    );
  }

  return (
    cleanToken(readStorage("userToken")) ||
    cleanToken(readStorage("token")) ||
    cleanToken(readStorage("accessToken")) ||
    cleanToken(readStorage("authToken"))
  );
};

export const getCurrentChatSenderId = (role = "user") => {
  const token = getTokenForRole(role);
  const payload = decodeJwtPayload(token);

  const possiblePayloadKeys = [
    "nameid",
    "nameidentifier",
    "sub",
    "id",
    "Id",
    "userId",
    "UserId",
    "sellerId",
    "SellerId",
    "uid",
    "sid",
    "email",
    "Email",
    "unique_name",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
  ];

  for (const key of possiblePayloadKeys) {
    const value = payload?.[key];
    if (value) return String(value).trim();
  }

  const possibleStorageKeys =
    role === "seller"
      ? [
          "sellerUserId",
          "sellerId",
          "currentUserId",
          "userId",
          "sellerEmail",
          "currentUserEmail",
          "pendingEmail",
          "email",
        ]
      : [
          "userId",
          "buyerId",
          "currentUserId",
          "currentUserEmail",
          "pendingEmail",
          "email",
        ];

  for (const key of possibleStorageKeys) {
    const value = readStorage(key);
    if (value) return String(value).trim();
  }

  return role === "seller" ? "seller" : "user";
};

const getClient = (role) => {
  return role === "seller" ? sellerApi : api;
};

const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data;

  console.error("Chat API error:", {
    status: error?.response?.status,
    data,
    message: error?.message,
  });

  if (!data) return error?.message || fallback;
  if (typeof data === "string") return data;

  if (data?.errors && typeof data.errors === "object") {
    return Object.entries(data.errors)
      .map(([key, value]) => {
        if (Array.isArray(value)) return `${key}: ${value.join(" ")}`;
        return `${key}: ${value}`;
      })
      .join(" | ");
  }

  return (
    data?.error ||
    data?.Error ||
    data?.message ||
    data?.Message ||
    data?.title ||
    data?.Title ||
    fallback
  );
};

const findArray = (data) => {
  if (Array.isArray(data)) return data;

  const root = data?.data || data?.Data || data?.result || data?.Result || data;

  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.messages)) return root.messages;
  if (Array.isArray(root?.Messages)) return root.Messages;
  if (Array.isArray(root?.chatMessages)) return root.chatMessages;
  if (Array.isArray(root?.ChatMessages)) return root.ChatMessages;
  if (Array.isArray(root?.conversationMessages)) return root.conversationMessages;
  if (Array.isArray(root?.ConversationMessages)) return root.ConversationMessages;
  if (Array.isArray(root?.item2)) return root.item2;
  if (Array.isArray(root?.Item2)) return root.Item2;
  if (Array.isArray(data?.messages)) return data.messages;
  if (Array.isArray(data?.Messages)) return data.Messages;

  return [];
};

export const normalizeChatMessage = (message, fallback = {}) => {
  const content =
    message?.content ??
    message?.Content ??
    message?.message ??
    message?.Message ??
    message?.text ??
    message?.Text ??
    fallback.content ??
    "";

  const senderId =
    message?.senderId ??
    message?.SenderId ??
    message?.senderID ??
    message?.SenderID ??
    message?.userId ??
    message?.UserId ??
    message?.createdBy ??
    message?.CreatedBy ??
    fallback.senderId ??
    "";

  const senderName =
    message?.senderName ??
    message?.SenderName ??
    message?.name ??
    message?.Name ??
    "";

  const createdAt =
    message?.createdAt ??
    message?.CreatedAt ??
    message?.date ??
    message?.Date ??
    message?.sentAt ??
    message?.SentAt ??
    message?.time ??
    message?.Time ??
    fallback.createdAt ??
    new Date().toISOString();

  return {
    id:
      message?.id ??
      message?.Id ??
      message?.messageId ??
      message?.MessageId ??
      fallback.id ??
      `${Date.now()}-${Math.random()}`,
    conversationId:
      message?.conversationId ??
      message?.ConversationId ??
      fallback.conversationId ??
      0,
    senderId: String(senderId || "").trim(),
    senderName: String(senderName || "").trim(),
    content: String(content || ""),
    createdAt,
    raw: message,
  };
};

export const normalizeConversation = (data) => {
  const root = data?.data || data?.Data || data?.result || data?.Result || data || {};

  const conversationId =
    root?.conversationId ??
    root?.ConversationId ??
    root?.id ??
    root?.Id ??
    data?.conversationId ??
    data?.ConversationId ??
    data?.id ??
    data?.Id ??
    (typeof data === "number" ? data : 0);

  const disputeId =
    root?.disputeId ??
    root?.DisputeId ??
    data?.disputeId ??
    data?.DisputeId ??
    0;

  const messages = findArray(data).map((item) =>
    normalizeChatMessage(item, {
      conversationId: Number(conversationId || 0),
    })
  );

  return {
    conversationId: Number(conversationId || 0),
    disputeId: Number(disputeId || 0),
    messages,
    raw: data,
  };
};

export const openChatConversation = async ({ disputeId, role = "user" }) => {
  const id = Number(disputeId || 0);

  if (!id || id <= 0) {
    throw new Error("Invalid dispute ID.");
  }

  try {
    const client = getClient(role);
    const res = await client.post(`/Chat/conversation/${id}`);

    console.log("========== CHAT CONVERSATION RESPONSE ==========");
    console.log("Role:", role);
    console.log("Dispute ID:", id);
    console.log("Raw response:", res.data);

    return normalizeConversation(res.data);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to open chat conversation."));
  }
};

export const sendChatMessage = async ({
  conversationId,
  senderId,
  content,
  role = "user",
}) => {
  const body = {
    conversationId: Number(conversationId || 0),
    senderId: String(senderId || "").trim(),
    content: String(content || "").trim(),
  };

  if (!body.conversationId || body.conversationId <= 0) {
    throw new Error("Invalid conversation ID.");
  }

  if (!body.senderId) {
    throw new Error("Sender ID is missing.");
  }

  if (!body.content) {
    throw new Error("Message is required.");
  }

  try {
    const client = getClient(role);
    const res = await client.post("/Chat/send", body, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("========== CHAT SEND RESPONSE ==========");
    console.log("Role:", role);
    console.log("Request body:", body);
    console.log("Raw response:", res.data);

    return {
      data: res.data,
      message: normalizeChatMessage(res.data, {
        id: Date.now(),
        conversationId: body.conversationId,
        senderId: body.senderId,
        content: body.content,
      }),
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to send message."));
  }
};
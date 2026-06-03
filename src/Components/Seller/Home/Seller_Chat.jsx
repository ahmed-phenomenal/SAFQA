import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import icon from "../../../assets/2.png";
import {
  getCurrentChatSenderId,
  normalizeChatMessage,
  openChatConversation,
  sendChatMessage,
} from "../../../API/chat";

export default function Seller_Chat() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const location = useLocation();

  const params = new URLSearchParams(location.search);

  const initialDisputeId = Number(
    location?.state?.disputeId ||
      params.get("disputeId") ||
      params.get("dispute") ||
      params.get("id") ||
      0
  );

  const senderId = useMemo(() => getCurrentChatSenderId("seller"), []);

  const [disputeId, setDisputeId] = useState(initialDisputeId);
  const [disputeInput, setDisputeInput] = useState(
    initialDisputeId ? String(initialDisputeId) : ""
  );
  const [conversationId, setConversationId] = useState(0);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const messagesEndRef = useRef(null);

  const buyerAvatar = "https://i.pravatar.cc/100?img=15";
  const sellerAvatar = "https://i.pravatar.cc/100?img=32";
  const primaryColor = "#023E8A";
  const lightBg = "#f5f7fb";
  const buyerBubble = "#e9eef6";

  useEffect(() => {
    document.title = t("sellerChatDocTitle");
  }, [t]);

  useEffect(() => {
    const link =
      document.querySelector("link[rel~='icon']") ||
      document.createElement("link");

    link.rel = "icon";
    link.href = icon;
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    if (!error && !info) return;

    const timer = setTimeout(() => {
      setError("");
      setInfo("");
    }, 15000);

    return () => clearTimeout(timer);
  }, [error, info]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isMyMessage = useCallback(
    (message) => {
      return (
        String(message?.senderId || "").trim().toLowerCase() ===
        String(senderId || "").trim().toLowerCase()
      );
    },
    [senderId]
  );

  const loadConversation = useCallback(
    async (showLoader = true) => {
      if (!disputeId) return null;

      try {
        if (showLoader) setLoading(true);
        setError("");

        const conversation = await openChatConversation({
          disputeId,
          role: "seller",
        });

        setConversationId(conversation.conversationId);

        if (Array.isArray(conversation.messages)) {
          setMessages(conversation.messages);
        }

        return conversation;
      } catch (err) {
        setError(err?.message || "Failed to load conversation.");
        return null;
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [disputeId]
  );

  useEffect(() => {
    if (!disputeId) return;

    loadConversation(true);

    const interval = setInterval(() => {
      loadConversation(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [disputeId, loadConversation]);

  const handleLoadByDisputeId = () => {
    const id = Number(disputeInput || 0);

    if (!id || id <= 0) {
      setError("Please enter a valid dispute ID.");
      return;
    }

    setDisputeId(id);
  };

  const handleSend = async () => {
    const trimmedMessage = input.trim();
    if (!trimmedMessage || sending) return;

    try {
      setSending(true);
      setError("");
      setInfo("");

      let currentConversationId = conversationId;

      if (!currentConversationId) {
        const conversation = await openChatConversation({
          disputeId,
          role: "seller",
        });

        currentConversationId = conversation.conversationId;
        setConversationId(currentConversationId);

        if (Array.isArray(conversation.messages)) {
          setMessages(conversation.messages);
        }
      }

      const localMessage = normalizeChatMessage(
        {},
        {
          id: Date.now(),
          conversationId: currentConversationId,
          senderId,
          content: trimmedMessage,
          createdAt: new Date().toISOString(),
        }
      );

      setMessages((prev) => [...prev, localMessage]);
      setInput("");

      await sendChatMessage({
        conversationId: currentConversationId,
        senderId,
        content: trimmedMessage,
        role: "seller",
      });

      await loadConversation(false);
    } catch (err) {
      setError(err?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      style={{
        minHeight: "100vh",
        background: "#eef2f7",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          height: "85vh",
          background: "#ffffff",
          borderRadius: "24px",
          boxShadow: "0 14px 40px rgba(2, 62, 138, 0.10)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid #dde6f2",
        }}
      >
        <div
          style={{
            padding: "22px 30px 18px",
            borderBottom: "1px solid #e7edf6",
            background: "#ffffff",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "34px",
              color: primaryColor,
              fontWeight: 800,
              textAlign: "center",
              textTransform: "capitalize",
            }}
          >
            {t("chatWithBuyer")}
          </h1>

          <p
            style={{
              margin: "10px 0 0",
              color: "#5b6b82",
              fontSize: "14px",
              textAlign: isArabic ? "right" : "left",
            }}
          >
            {conversationId
              ? `Conversation ID: ${conversationId} — Dispute ID: ${disputeId}`
              : t("chatSubtitle")}
          </p>

          {!disputeId ? (
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 14,
              }}
            >
              <input
                type="number"
                value={disputeInput}
                onChange={(e) => setDisputeInput(e.target.value)}
                placeholder="Enter dispute ID"
                style={{
                  flex: 1,
                  height: 44,
                  border: "1px solid #c7d3e3",
                  borderRadius: 12,
                  padding: "0 14px",
                  outline: "none",
                }}
              />

              <button
                type="button"
                onClick={handleLoadByDisputeId}
                style={{
                  border: "none",
                  borderRadius: 12,
                  background: primaryColor,
                  color: "#fff",
                  padding: "0 18px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Open
              </button>
            </div>
          ) : null}

          {error ? (
            <div
              style={{
                marginTop: 12,
                background: "#fff1f0",
                color: "#cf1322",
                border: "1px solid #ffa39e",
                borderRadius: 12,
                padding: "10px 12px",
                fontWeight: 700,
              }}
            >
              {error}
            </div>
          ) : null}

          {info ? (
            <div
              style={{
                marginTop: 12,
                background: "#f6ffed",
                color: "#237804",
                border: "1px solid #b7eb8f",
                borderRadius: 12,
                padding: "10px 12px",
                fontWeight: 700,
              }}
            >
              {info}
            </div>
          ) : null}
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "28px 22px",
            background: lightBg,
          }}
        >
          {loading ? (
            <div
              style={{
                textAlign: "center",
                color: "#64748b",
                fontWeight: 800,
                marginTop: 40,
              }}
            >
              Loading conversation...
            </div>
          ) : messages.length ? (
            messages.map((message) => {
              const isMe = isMyMessage(message);

              return (
                <div
                  key={message.id}
                  style={{
                    display: "flex",
                    justifyContent: isMe ? "flex-end" : "flex-start",
                    marginBottom: "18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: isMe ? "row-reverse" : "row",
                      alignItems: "flex-end",
                      gap: "10px",
                      maxWidth: "78%",
                    }}
                  >
                    <img
                      src={isMe ? sellerAvatar : buyerAvatar}
                      alt={isMe ? t("sellerAvatar") : t("buyerAvatar")}
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: `2px solid ${isMe ? "#d7e6fb" : "#d9e1ec"}`,
                        background: "#ffffff",
                        flexShrink: 0,
                      }}
                    />

                    <div>
                      <div
                        style={{
                          background: isMe ? primaryColor : buyerBubble,
                          color: isMe ? "#ffffff" : "#1f2a37",
                          padding: "14px 16px",
                          borderRadius: isMe
                            ? "18px 18px 6px 18px"
                            : "18px 18px 18px 6px",
                          lineHeight: 1.55,
                          fontSize: "15px",
                          wordBreak: "break-word",
                          boxShadow: "0 3px 10px rgba(0,0,0,0.04)",
                        }}
                      >
                        {message.content}
                      </div>

                      <div
                        style={{
                          fontSize: 11,
                          color: "#94a3b8",
                          marginTop: 4,
                          textAlign: isMe ? "right" : "left",
                        }}
                      >
                        {message.createdAt
                          ? new Date(message.createdAt).toLocaleString(
                              isArabic ? "ar-EG" : "en-GB"
                            )
                          : ""}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div
              style={{
                textAlign: "center",
                color: "#64748b",
                fontWeight: 800,
                marginTop: 40,
              }}
            >
              No messages yet.
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div
          style={{
            borderTop: "1px solid #e7edf6",
            padding: "16px 18px 18px",
            background: "#ffffff",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("writeYourReplyHere")}
              rows={2}
              disabled={!disputeId || sending}
              style={{
                flex: 1,
                resize: "none",
                border: "1px solid #c7d3e3",
                borderRadius: "18px",
                padding: "16px 18px",
                fontSize: "15px",
                outline: "none",
                color: "#1f2a37",
                background: "#ffffff",
              }}
            />

            <button
              onClick={handleSend}
              disabled={!disputeId || sending}
              aria-label={t("sendMessage")}
              style={{
                width: "60px",
                height: "60px",
                minWidth: "60px",
                borderRadius: "50%",
                border: "none",
                background: primaryColor,
                color: "#ffffff",
                cursor: !disputeId || sending ? "not-allowed" : "pointer",
                opacity: !disputeId || sending ? 0.65 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 18px rgba(2, 62, 138, 0.24)",
              }}
            >
              {sending ? (
                "..."
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M21.8 2.2a1 1 0 0 0-1.05-.16L2.75 10.04a1 1 0 0 0 .09 1.87l7.15 2.51 2.51 7.15a1 1 0 0 0 .89.67h.06a1 1 0 0 0 .9-.56l8-18A1 1 0 0 0 21.8 2.2Zm-8.67 16.56-1.76-5.02a1 1 0 0 0-.61-.61L5.74 11.37l12.9-5.73Z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
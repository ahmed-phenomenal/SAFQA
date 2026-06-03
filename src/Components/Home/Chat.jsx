import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import icon from "../../assets/2.png";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import {
  getCurrentChatSenderId,
  normalizeChatMessage,
  openChatConversation,
  sendChatMessage,
} from "../../API/chat";

export default function Chat() {
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

  const senderId = useMemo(() => getCurrentChatSenderId("user"), []);

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

  const sellerAvatar = "https://i.pravatar.cc/100?img=32";
  const myAvatar = "https://i.pravatar.cc/100?img=12";

  useEffect(() => {
    document.title = t("chat.docTitle", "Chat");
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
    (message) =>
      String(message?.senderId || "").trim().toLowerCase() ===
      String(senderId || "").trim().toLowerCase(),
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
          role: "user",
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
          role: "user",
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
        role: "user",
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
    <div className="chat-page" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        .chat-page {
          min-height: 100vh;
          background: var(--bg) !important;
          color: var(--text) !important;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 24px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .chat-card {
          width: 100%;
          max-width: 900px;
          height: 85vh;
          background: var(--card) !important;
          border: 1px solid var(--border) !important;
          border-radius: 24px;
          box-shadow: 0 14px 40px var(--shadow);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chat-header {
          padding: 22px 30px 18px;
          border-bottom: 1px solid var(--border);
          background: var(--card) !important;
        }

        .chat-title {
          margin: 0;
          font-size: 34px;
          color: var(--main) !important;
          font-weight: 900;
          text-align: center;
          text-transform: capitalize;
        }

        .chat-subtitle {
          margin: 10px 0 0;
          color: var(--text-soft) !important;
          font-size: 14px;
        }

        .chat-open-row {
          display: flex;
          gap: 10px;
          margin-top: 14px;
        }

        .chat-dispute-input,
        .chat-input {
          background: var(--card-soft) !important;
          color: var(--text) !important;
          border: 1px solid var(--border) !important;
          outline: none;
        }

        .chat-dispute-input::placeholder,
        .chat-input::placeholder {
          color: var(--text-soft) !important;
        }

        .chat-dispute-input {
          flex: 1;
          height: 44px;
          border-radius: 12px;
          padding: 0 14px;
          font-weight: 700;
        }

        .chat-open-btn {
          border: none;
          border-radius: 12px;
          background: var(--main) !important;
          color: #fff !important;
          padding: 0 18px;
          font-weight: 900;
          cursor: pointer;
        }

        .chat-alert-error,
        .chat-alert-info {
          margin-top: 12px;
          border-radius: 12px;
          padding: 10px 12px;
          font-weight: 800;
        }

        .chat-alert-error {
          background: rgba(220, 38, 38, 0.12);
          color: #dc2626;
          border: 1px solid rgba(220, 38, 38, 0.3);
        }

        .chat-alert-info {
          background: rgba(34, 197, 94, 0.12);
          color: #16a34a;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .chat-body {
          flex: 1;
          overflow-y: auto;
          padding: 28px 22px;
          background: var(--card-soft) !important;
        }

        .chat-empty {
          text-align: center;
          color: var(--text-soft) !important;
          font-weight: 900;
          margin-top: 40px;
        }

        .chat-message-row {
          display: flex;
          margin-bottom: 18px;
        }

        .chat-message-row.me {
          justify-content: flex-end;
        }

        .chat-message-row.seller {
          justify-content: flex-start;
        }

        .chat-message-inner {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          max-width: 78%;
        }

        .chat-message-inner.me {
          flex-direction: row-reverse;
        }

        .chat-message-inner.seller {
          flex-direction: row;
        }

        .chat-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--border);
          background: var(--card);
          flex-shrink: 0;
        }

        .chat-bubble {
          padding: 14px 16px;
          line-height: 1.55;
          font-size: 15px;
          word-break: break-word;
          box-shadow: 0 3px 10px var(--shadow);
        }

        .chat-bubble.me {
          background: var(--main) !important;
          color: #fff !important;
          border-radius: 18px 18px 6px 18px;
        }

        .chat-bubble.seller {
          background: var(--card) !important;
          color: var(--text) !important;
          border: 1px solid var(--border);
          border-radius: 18px 18px 18px 6px;
        }

        .chat-time {
          font-size: 11px;
          color: var(--text-soft) !important;
          margin-top: 4px;
        }

        .chat-time.me {
          text-align: right;
        }

        .chat-time.seller {
          text-align: left;
        }

        .chat-footer {
          border-top: 1px solid var(--border);
          padding: 16px 18px 18px;
          background: var(--card) !important;
        }

        .chat-send-row {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .chat-input {
          flex: 1;
          resize: none;
          border-radius: 18px;
          padding: 16px 18px;
          font-size: 15px;
          font-weight: 700;
        }

        .chat-send-btn {
          width: 60px;
          height: 60px;
          min-width: 60px;
          border-radius: 50%;
          border: none;
          background: var(--main) !important;
          color: #fff !important;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 18px rgba(2, 62, 138, 0.24);
        }

        .chat-send-btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .chat-page {
            padding: 10px;
          }

          .chat-card {
            height: 90vh;
            border-radius: 18px;
          }

          .chat-header {
            padding: 18px 16px;
          }

          .chat-title {
            font-size: 26px;
          }

          .chat-message-inner {
            max-width: 88%;
          }

          .chat-send-row {
            gap: 8px;
          }

          .chat-send-btn {
            width: 52px;
            height: 52px;
            min-width: 52px;
          }
        }
      `}</style>

      <div className="chat-card">
        <div className="chat-header">
          <h1 className="chat-title">{t("chat.title", "Chat with seller")}</h1>

          <p
            className="chat-subtitle"
            style={{ textAlign: isArabic ? "right" : "left" }}
          >
            {conversationId
              ? `Conversation ID: ${conversationId} — Dispute ID: ${disputeId}`
              : t("chat.subtitle", "Send your message to the seller.")}
          </p>

          {!disputeId ? (
            <div className="chat-open-row">
              <input
                type="number"
                value={disputeInput}
                onChange={(e) => setDisputeInput(e.target.value)}
                placeholder="Enter dispute ID"
                className="chat-dispute-input"
              />

              <button
                type="button"
                onClick={handleLoadByDisputeId}
                className="chat-open-btn"
              >
                Open
              </button>
            </div>
          ) : null}

          {error ? <div className="chat-alert-error">{error}</div> : null}
          {info ? <div className="chat-alert-info">{info}</div> : null}
        </div>

        <div className="chat-body">
          {loading ? (
            <div className="chat-empty">Loading conversation...</div>
          ) : messages.length ? (
            messages.map((message) => {
              const isMe = isMyMessage(message);

              return (
                <div
                  key={message.id}
                  className={`chat-message-row ${isMe ? "me" : "seller"}`}
                >
                  <div className={`chat-message-inner ${isMe ? "me" : "seller"}`}>
                    <img
                      src={isMe ? myAvatar : sellerAvatar}
                      alt={isMe ? "My avatar" : "Seller avatar"}
                      className="chat-avatar"
                    />

                    <div>
                      <div className={`chat-bubble ${isMe ? "me" : "seller"}`}>
                        {message.content}
                      </div>

                      <div className={`chat-time ${isMe ? "me" : "seller"}`}>
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
            <div className="chat-empty">No messages yet. Start the conversation.</div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="chat-footer">
          <div className="chat-send-row">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("chat.placeholder", "Write your message here...")}
              rows={2}
              disabled={!disputeId || sending}
              className="chat-input"
            />

            <button
              onClick={handleSend}
              disabled={!disputeId || sending}
              aria-label={t("chat.sendMessage", "Send message")}
              className="chat-send-btn"
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
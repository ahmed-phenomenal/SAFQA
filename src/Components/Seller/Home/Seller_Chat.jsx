import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import icon from "../../../assets/2.png";

export default function Seller_Chat() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [input, setInput] = useState("");
  const [replyIndex, setReplyIndex] = useState(0);
  const messagesEndRef = useRef(null);

  const autoReplies = useMemo(
    () => [
      t("chatAutoReply1"),
      t("chatAutoReply2"),
      t("chatAutoReply3"),
    ],
    [t]
  );

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "buyer",
      textKey: "chatInitialBuyerMessage",
    },
  ]);

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmedMessage = input.trim();
    if (!trimmedMessage) return;

    const sellerMessage = {
      id: Date.now(),
      sender: "me",
      text: trimmedMessage,
    };

    setMessages((prev) => [...prev, sellerMessage]);
    setInput("");

    setTimeout(() => {
      const buyerReply = {
        id: Date.now() + 1,
        sender: "buyer",
        text: autoReplies[replyIndex],
      };

      setMessages((prev) => [...prev, buyerReply]);
      setReplyIndex((prev) => (prev + 1) % autoReplies.length);
    }, 700);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const buyerAvatar = "https://i.pravatar.cc/100?img=15";
  const sellerAvatar = "https://i.pravatar.cc/100?img=32";
  const primaryColor = "#023E8A";
  const lightBg = "#f5f7fb";
  const buyerBubble = "#e9eef6";

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
            padding: "26px 30px 20px",
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
            {t("chatSubtitle")}
          </p>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "28px 22px",
            background: lightBg,
          }}
        >
          {messages.map((message) => {
            const isMe = message.sender === "me";
            const text = message.textKey ? t(message.textKey) : message.text;

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
                    {text}
                  </div>
                </div>
              </div>
            );
          })}

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
              aria-label={t("sendMessage")}
              style={{
                width: "60px",
                height: "60px",
                minWidth: "60px",
                borderRadius: "50%",
                border: "none",
                background: primaryColor,
                color: "#ffffff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 18px rgba(2, 62, 138, 0.24)",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M21.8 2.2a1 1 0 0 0-1.05-.16L2.75 10.04a1 1 0 0 0 .09 1.87l7.15 2.51 2.51 7.15a1 1 0 0 0 .89.67h.06a1 1 0 0 0 .9-.56l8-18A1 1 0 0 0 21.8 2.2Zm-8.67 16.56-1.76-5.02a1 1 0 0 0-.61-.61L5.74 11.37l12.9-5.73Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
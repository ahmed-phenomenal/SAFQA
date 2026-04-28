import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import icon from "../../assets/2.png";

export default function Help_support() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const tr = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const [activeTab, setActiveTab] = useState("faq");
  const [openSection, setOpenSection] = useState("general");
  const [email, setEmail] = useState("");

  useEffect(() => {
    document.title = tr("helpSupport", "Help & Support");
  }, [i18n.language]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");

    if (link) {
      link.href = icon;
    } else {
      const newLink = document.createElement("link");
      newLink.rel = "icon";
      newLink.href = icon;
      document.head.appendChild(newLink);
    }
  }, []);

  const faqSections = useMemo(
    () => [
      {
        id: "general",
        title: tr("helpGeneralInfo", "General Information"),
        items: [
          {
            q: tr("helpWhatIsSafqaQuestion", "What is Safqa?"),
            a: tr(
              "helpWhatIsSafqaAnswer",
              "Safqa is an online auction platform that allows users to buy and sell products or services through competitive bidding in a secure and transparent environment."
            ),
          },
          {
            q: tr("helpHowDoesSafqaWorkQuestion", "How does Safqa work?"),
            a: tr(
              "helpHowDoesSafqaWorkAnswer",
              "Sellers create auction listings with a starting price and duration. Buyers place bids, and the highest bidder at the end of the auction wins the item or service."
            ),
          },
          {
            q: tr("helpIsSafqaFreeQuestion", "Is Safqa free to use?"),
            a: tr(
              "helpIsSafqaFreeAnswer",
              "Creating an account is free. Certain services, auction promotions, listings, or completed sales may include fees depending on platform rules."
            ),
          },
        ],
      },
      {
        id: "account",
        title: tr("helpAccountSecurity", "Account & Security"),
        items: [
          {
            q: tr("helpCreateAccountQuestion", "How do I create an account?"),
            a: tr(
              "helpCreateAccountAnswer",
              "Click on Sign Up, fill in your details, verify your email, and then you will be ready to start using Safqa."
            ),
          },
          {
            q: tr("helpVerifyIdentityQuestion", "Why do I need to verify my email?"),
            a: tr(
              "helpVerifyIdentityAnswer",
              "Email verification helps secure your account and ensures safe communication between buyers and sellers."
            ),
          },
          {
            q: tr("helpForgotPasswordQuestion", "I forgot my password. What should I do?"),
            a: tr(
              "helpForgotPasswordAnswer",
              "Click on Forgot Password on the login page and follow the instructions sent to your email."
            ),
          },
          {
            q: tr("helpPersonalInfoQuestion", "Is my personal information secure?"),
            a: tr(
              "helpPersonalInfoAnswer",
              "Yes. Safqa uses secure technologies and encryption to protect user data and transactions."
            ),
          },
        ],
      },
      {
        id: "bidding",
        title: tr("helpBiddingAuctions", "Bidding & Auctions"),
        items: [
          {
            q: tr("helpHowBidQuestion", "How do I place a bid?"),
            a: tr(
              "helpHowBidAnswer",
              "Open the auction details page, enter your bid amount, review it, and confirm your bid."
            ),
          },
          {
            q: tr("helpCancelBidQuestion", "Can I cancel a bid?"),
            a: tr(
              "helpCancelBidAnswer",
              "Bids may not be cancelled after submission unless the platform policy allows it for a specific case."
            ),
          },
          {
            q: tr("helpWinAuctionQuestion", "What happens if I win an auction?"),
            a: tr(
              "helpWinAuctionAnswer",
              "You will receive a notification and may need to complete payment within the required time."
            ),
          },
        ],
      },
      {
        id: "selling",
        title: tr("helpSellingSafqa", "Selling on Safqa"),
        items: [
          {
            q: tr("helpStartSellingQuestion", "How can I start selling?"),
            a: tr(
              "helpStartSellingAnswer",
              "Create a seller account, complete the required verification steps, and start listing auctions."
            ),
          },
          {
            q: tr("helpSellerVerificationQuestion", "Why is seller verification required?"),
            a: tr(
              "helpSellerVerificationAnswer",
              "Verification helps protect buyers and keeps the marketplace safe and trustworthy."
            ),
          },
          {
            q: tr("helpSellerFeesQuestion", "Are there seller fees?"),
            a: tr(
              "helpSellerFeesAnswer",
              "Some seller services or completed auctions may include fees according to platform policy."
            ),
          },
        ],
      },
      {
        id: "technical",
        title: tr("helpTechnicalSupport", "Technical Support & Issues"),
        items: [
          {
            q: tr("helpAppIssueQuestion", "The app or website is not working. What should I do?"),
            a: tr(
              "helpAppIssueAnswer",
              "Refresh the page, check your internet connection, and try again. If the issue continues, contact support."
            ),
          },
          {
            q: tr("helpPaymentIssueQuestion", "What should I do if payment fails?"),
            a: tr(
              "helpPaymentIssueAnswer",
              "Check your payment method and balance, then try again. If the problem continues, contact support."
            ),
          },
          {
            q: tr("helpContactSupportQuestion", "How can I contact support?"),
            a: tr(
              "helpContactSupportAnswer",
              "Open the Contact Us tab and enter your email so the support team can reach you."
            ),
          },
        ],
      },
    ],
    [i18n.language]
  );

  const toggleSection = (id) => {
    setOpenSection((prev) => (prev === id ? "" : id));
  };

  return (
    <div className="help-support-page" dir={isArabic ? "rtl" : "ltr"}>
      <style>{`
        .help-support-page {
          min-height: 100vh;
          background: #f5f7fb;
          padding: 28px 14px 60px;
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
        }

        .help-support-page * {
          box-sizing: border-box;
        }

        .help-support-container {
          width: min(100%, 1100px);
          margin: 0 auto;
          background: #ffffff;
          border-radius: 18px;
          padding: 22px;
          border: 1px solid #e5eaf1;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06);
        }

        .help-support-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-bottom: 22px;
        }

        .help-support-tab {
          border: 1px solid #cfe0f5;
          background: #eaf3ff;
          color: #0b3a82;
          border-radius: 7px;
          padding: 12px 18px;
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .help-support-tab.active {
          background: #0b4aa2;
          color: #ffffff;
          border-color: #0b4aa2;
        }

        .help-support-content {
          background: #ffffff;
        }

        .help-faq-section {
          border-bottom: 1px solid #edf1f6;
        }

        .help-faq-header {
          width: 100%;
          border: none;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 15px 4px;
          color: #111827;
          cursor: pointer;
          text-align: inherit;
        }

        .help-faq-title {
          font-size: 16px;
          font-weight: 800;
        }

        .help-faq-arrow {
          color: #0b4aa2;
          font-size: 14px;
          transition: 0.2s ease;
        }

        .help-faq-body {
          padding: 0 4px 18px;
        }

        .help-faq-item {
          margin-bottom: 15px;
        }

        .help-faq-question {
          margin: 0 0 5px;
          font-size: 14px;
          font-weight: 800;
          color: #111827;
        }

        .help-faq-answer {
          margin: 0;
          font-size: 13px;
          line-height: 1.55;
          color: #6b7280;
        }

        .help-contact-box {
          padding-top: 6px;
        }

        .help-contact-field {
          position: relative;
          width: 100%;
        }

        .help-contact-icon {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          left: ${isArabic ? "auto" : "15px"};
          right: ${isArabic ? "15px" : "auto"};
          color: #0b4aa2;
          font-size: 15px;
        }

        .help-contact-input {
          width: 100%;
          height: 48px;
          border: 1px solid #d9e1ec;
          border-radius: 10px;
          padding: ${isArabic ? "0 44px 0 14px" : "0 14px 0 44px"};
          outline: none;
          font-size: 14px;
          color: #111827;
          background: #ffffff;
        }

        .help-contact-input:focus {
          border-color: #0b4aa2;
          box-shadow: 0 0 0 3px rgba(11, 74, 162, 0.12);
        }

        .help-contact-button {
          width: 100%;
          margin-top: 14px;
          border: none;
          background: #0b4aa2;
          color: #ffffff;
          padding: 13px 16px;
          border-radius: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        @media (max-width: 640px) {
          .help-support-page {
            padding: 14px 10px 40px;
            background: #ffffff;
          }

          .help-support-container {
            box-shadow: none;
            border-radius: 0;
            border: none;
            padding: 0;
          }

          .help-support-tabs {
            gap: 12px;
          }

          .help-support-tab {
            font-size: 13px;
            padding: 9px 12px;
          }

          .help-faq-title {
            font-size: 13px;
          }

          .help-faq-question {
            font-size: 12px;
          }

          .help-faq-answer {
            font-size: 11px;
          }

          .help-contact-input {
            height: 42px;
            font-size: 12px;
          }
        }
      `}</style>

      <div className="help-support-container">
        <div className="help-support-tabs">
          <button
            type="button"
            className={`help-support-tab ${activeTab === "faq" ? "active" : ""}`}
            onClick={() => setActiveTab("faq")}
          >
            {tr("helpFaq", "FAQ's")}
          </button>

          <button
            type="button"
            className={`help-support-tab ${
              activeTab === "contact" ? "active" : ""
            }`}
            onClick={() => setActiveTab("contact")}
          >
            {tr("helpContactUs", "Contact Us")}
          </button>
        </div>

        <div className="help-support-content">
          {activeTab === "faq" ? (
            <>
              {faqSections.map((section) => {
                const isOpen = openSection === section.id;

                return (
                  <div className="help-faq-section" key={section.id}>
                    <button
                      type="button"
                      className="help-faq-header"
                      onClick={() => toggleSection(section.id)}
                    >
                      <span className="help-faq-title">{section.title}</span>

                      <i
                        className={`fa-solid ${
                          isOpen ? "fa-chevron-up" : "fa-chevron-down"
                        } help-faq-arrow`}
                      ></i>
                    </button>

                    {isOpen ? (
                      <div className="help-faq-body">
                        {section.items.map((item, index) => (
                          <div className="help-faq-item" key={index}>
                            <h4 className="help-faq-question">{item.q}</h4>
                            <p className="help-faq-answer">{item.a}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </>
          ) : (
            <div className="help-contact-box">
              <div className="help-contact-field">
                <i className="fa-regular fa-envelope help-contact-icon"></i>

                <input
                  type="email"
                  className="help-contact-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={tr("email", "Email")}
                />
              </div>

              <button type="button" className="help-contact-button">
                {tr("submit", "Submit")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
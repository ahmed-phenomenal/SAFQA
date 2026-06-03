import { useEffect } from "react";
import icon from "../../assets/2.png";
import { useTranslation } from "react-i18next";

export default function HowToBid() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const tr = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  useEffect(() => {
    document.title = tr("howToBid.pageTitle", "How To Bid");
  }, [i18n.language]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");

    if (!link) {
      const newLink = document.createElement("link");
      newLink.rel = "icon";
      newLink.href = icon;
      document.head.appendChild(newLink);
    } else {
      link.href = icon;
    }
  }, []);

  return (
    <div className="container legal-wrapper">
        <div className="legal-page" dir={isArabic ? "rtl" : "ltr"}>
      <div className="legal-container">
        <h1 className="legal-title" dir="auto">
          {tr("howToBid.pageTitle", "How To Bid")}
        </h1>

        <h2 className="legal-subtitle" dir="auto">
          {tr("howToBid.heading", "How bidding works on E-Safqa")}
        </h2>

        <p className="legal-subtitle" dir="auto">
          {tr(
            "howToBid.intro",
            "This guide explains how to place bids, use proxy bidding, and what happens after you win an auction."
          )}
        </p>

        <div className="legal-card">
          <h2 dir="auto">{tr("howToBid.s1.title", "1. Create and verify your account")}</h2>

          <ul>
            <li dir="auto">{tr("howToBid.s1.li1", "Create an account using your correct personal information.")}</li>
            <li dir="auto">{tr("howToBid.s1.li2", "Confirm your email or phone when verification is requested.")}</li>
            <li dir="auto">{tr("howToBid.s1.li3", "Keep your login details secure and do not share your account.")}</li>
          </ul>

          <p dir="auto" style={{ marginTop: 10 }}>
            <b>{tr("howToBid.s1.reviewTitle", "Before bidding, review:")}</b>
          </p>

          <ul>
            <li dir="auto">{tr("howToBid.s1.review1", "Auction title and item description.")}</li>
            <li dir="auto">{tr("howToBid.s1.review2", "Images and condition details.")}</li>
            <li dir="auto">{tr("howToBid.s1.review3", "Starting price and current price.")}</li>
            <li dir="auto">{tr("howToBid.s1.review4", "Auction end date and remaining time.")}</li>
            <li dir="auto">{tr("howToBid.s1.review5", "Delivery and payment requirements.")}</li>
          </ul>
        </div>

        <div className="legal-card">
          <h2 dir="auto">{tr("howToBid.s2.title", "2. Before placing a bid")}</h2>

          <p dir="auto">{tr("howToBid.s2.beforeTitle", "Make sure you understand the auction rules before submitting a bid.")}</p>

          <ul>
            <li dir="auto">{tr("howToBid.s2.li1", "Your bid should be higher than the current price.")}</li>
            <li dir="auto">{tr("howToBid.s2.li2", "Some auctions may require a minimum bid increment.")}</li>
            <li dir="auto">{tr("howToBid.s2.li3", "A submitted bid may not be cancelled unless the platform allows it.")}</li>
          </ul>
        </div>

        <div className="legal-card">
          <h2 dir="auto">{tr("howToBid.s3.title", "3. Place your bid")}</h2>

          <ul>
            <li dir="auto">{tr("howToBid.s3.li1", "Open the auction details page.")}</li>
            <li dir="auto">{tr("howToBid.s3.li2", "Enter your bid amount or select a suggested amount.")}</li>
            <li dir="auto">{tr("howToBid.s3.li3", "Confirm your bid after reviewing the final amount.")}</li>
          </ul>

          <p dir="auto" style={{ marginTop: 10 }}>
            <b>{tr("howToBid.s3.ifAcceptedTitle", "If your bid is accepted:")}</b>
          </p>

          <ul>
            <li dir="auto">{tr("howToBid.s3.acc1", "Your bid appears on the auction.")}</li>
            <li dir="auto">{tr("howToBid.s3.acc2", "You may receive notifications about bid updates.")}</li>
            <li dir="auto">{tr("howToBid.s3.acc3", "You remain responsible for your bid until the auction ends.")}</li>
          </ul>
        </div>

        <div className="legal-card">
          <h2 dir="auto">{tr("howToBid.s4.title", "4. Auction updates and notifications")}</h2>

          <p dir="auto">{tr("howToBid.s4.desc", "The platform may notify you about important auction activity.")}</p>

          <p dir="auto" style={{ marginTop: 10 }}>
            <b>{tr("howToBid.s4.notifyTitle", "You may be notified when:")}</b>
          </p>

          <ul>
            <li dir="auto">{tr("howToBid.s4.n1", "You place a bid successfully.")}</li>
            <li dir="auto">{tr("howToBid.s4.n2", "Another bidder places a higher bid.")}</li>
            <li dir="auto">{tr("howToBid.s4.n3", "The auction is ending soon.")}</li>
            <li dir="auto">{tr("howToBid.s4.n4", "You win an auction.")}</li>
            <li dir="auto">{tr("howToBid.s4.n5", "Payment or delivery action is required.")}</li>
          </ul>
        </div>

        <div className="legal-card">
          <h2 dir="auto">{tr("howToBid.proxy.title", "Proxy bidding")}</h2>

          <p dir="auto">
            {tr(
              "howToBid.proxy.desc",
              "Proxy bidding lets the system bid automatically on your behalf up to the maximum amount you choose."
            )}
          </p>

          <h3 dir="auto" style={{ marginTop: 10 }}>
            {tr("howToBid.proxy.howWorksTitle", "How proxy bidding works")}
          </h3>

          <p dir="auto">{tr("howToBid.proxy.youSetTitle", "You set:")}</p>

          <ul>
            <li dir="auto">{tr("howToBid.proxy.set1", "The maximum amount you are willing to pay.")}</li>
            <li dir="auto">{tr("howToBid.proxy.set2", "The system increases your bid only when needed.")}</li>
          </ul>

          <p dir="auto">
            {tr(
              "howToBid.proxy.autoDesc",
              "The system automatically places the lowest required bid to keep you competitive."
            )}
          </p>

          <p dir="auto" style={{ marginTop: 10 }}>
            <b>{tr("howToBid.proxy.untilTitle", "Proxy bidding continues until:")}</b>
          </p>

          <ul>
            <li dir="auto">{tr("howToBid.proxy.until1", "You remain the highest bidder.")}</li>
            <li dir="auto">{tr("howToBid.proxy.until2", "Another bidder exceeds your maximum amount.")}</li>
          </ul>

          <h3 dir="auto" style={{ marginTop: 10 }}>
            {tr("howToBid.proxy.exampleTitle", "Example")}
          </h3>

          <ul>
            <li dir="auto">{tr("howToBid.proxy.ex1", "Current price is 100.")}</li>
            <li dir="auto">{tr("howToBid.proxy.ex2", "You set a maximum proxy bid of 200.")}</li>
          </ul>

          <p dir="auto">{tr("howToBid.proxy.ex3", "If someone bids 120, the system may raise your bid automatically.")}</p>
          <p dir="auto">{tr("howToBid.proxy.ex4", "Your bid will not exceed your selected maximum amount.")}</p>

          <h3 dir="auto" style={{ marginTop: 10 }}>
            {tr("howToBid.proxy.benefitsTitle", "Benefits")}
          </h3>

          <ul>
            <li dir="auto">{tr("howToBid.proxy.b1", "You do not need to watch the auction constantly.")}</li>
            <li dir="auto">{tr("howToBid.proxy.b2", "Your maximum amount stays private.")}</li>
            <li dir="auto">{tr("howToBid.proxy.b3", "The system bids only when necessary.")}</li>
            <li dir="auto">{tr("howToBid.proxy.b4", "It helps you stay competitive until your limit is reached.")}</li>
          </ul>

          <h3 dir="auto" style={{ marginTop: 10 }}>
            {tr("howToBid.proxy.manageTitle", "Managing proxy bids")}
          </h3>

          <p dir="auto">{tr("howToBid.proxy.youCan", "You can:")}</p>

          <ul>
            <li dir="auto">{tr("howToBid.proxy.m1", "Review your active proxy bid.")}</li>
            <li dir="auto">{tr("howToBid.proxy.m2", "Increase your maximum amount if allowed.")}</li>
            <li dir="auto">{tr("howToBid.proxy.m3", "Follow notifications for bid changes.")}</li>
          </ul>

          <h3 dir="auto" style={{ marginTop: 10 }}>
            {tr("howToBid.proxy.notesTitle", "Important notes")}
          </h3>

          <ul>
            <li dir="auto">{tr("howToBid.proxy.note1", "Proxy bidding does not guarantee that you will win.")}</li>
            <li dir="auto">{tr("howToBid.proxy.note2", "You are responsible for the final winning bid.")}</li>
            <li dir="auto">{tr("howToBid.proxy.note3", "Platform rules may limit editing or cancelling proxy bids.")}</li>
          </ul>
        </div>

        <div className="legal-card">
          <h2 dir="auto">{tr("howToBid.win.title", "Winning an auction")}</h2>

          <p dir="auto">{tr("howToBid.win.whenEnds", "When the auction ends, the highest valid bidder wins.")}</p>

          <ul>
            <li dir="auto">{tr("howToBid.win.li1", "You will receive a winning notification.")}</li>
            <li dir="auto">{tr("howToBid.win.li2", "You may need to complete payment within the required time.")}</li>
            <li dir="auto">{tr("howToBid.win.li3", "Delivery or pickup instructions will be shown when available.")}</li>
            <li dir="auto">{tr("howToBid.win.li4", "Failure to complete payment may affect your account or the auction result.")}</li>
          </ul>
        </div>
      </div>
    </div>
    </div>
    
  );
}
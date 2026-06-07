import React, { useState, useEffect } from 'react'
import { useNavigate } from "react-router-dom";
import "../App.css";
import icon from "../assets/2.png";
import icon2 from '../assets/1.png'

function Splash() {

  const [title, setTitle] = useState('SAFQA');
  useEffect(() => {
    document.title = title;
  }, [title]);

  const [favicon, setFavicon] = useState(icon);
  useEffect(() => {
    const updateFavicon = (iconUrl) => {
      const link = document.querySelector("link[rel~='icon']");
      if (!link) {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = iconUrl;
        document.head.appendChild(newLink);
      } else {
        link.href = iconUrl;
      }
    };
    updateFavicon(favicon);
  }, [favicon]);

  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 6000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <>
      <style>{`
        *,
        *::before,
        *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html, body, #root {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }

        .splash {
          width: 100vw;
          max-width: 100%;
          min-height: 100vh;
          overflow: hidden;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .screen {
          width: 100%;
          max-width: 100%;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }

        .logo-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 100%;
          max-width: 100%;
          padding: 0 24px;
        }

        .circle {
          position: absolute;
          width: min(340px, 80vw);
          height: min(340px, 80vw);
          border-radius: 50%;
          background: rgba(6, 59, 120, 0.08);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: pulse 2s ease-in-out infinite;
          z-index: 0;
        }

        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
          50%       { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
        }

        .logo-row {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: clamp(8px, 3vw, 20px);
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 100%;
          animation: fadeInUp 0.8s ease both;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .hammer {
          width: clamp(48px, 15vw, 100px);
          height: auto;
          object-fit: contain;
          flex-shrink: 0;
        }

        .safqa {
          width: clamp(100px, 30vw, 200px);
          height: auto;
          object-fit: contain;
          flex-shrink: 0;
          display: block;
        }

        .text {
          line-height: 1;
          display: flex;
          align-items: center;
        }
      `}</style>

      <div className="splash">
        <div className="screen">
          <div className="logo-wrapper">
            <div className="circle"></div>
            <div className="logo-row">
              <img src={icon} className="hammer" alt="hammer" />
              <h1 className="text">
                <img src={icon2} className="safqa" alt="SAFQA" />
              </h1>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Splash;
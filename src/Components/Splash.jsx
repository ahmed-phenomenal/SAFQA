import React, { useState , useEffect, useContext} from 'react'
import { useNavigate } from "react-router-dom";
import "../App.css";
import icon from "../assets/2.png";
import icon2 from '../assets/1.png'


function Splash() {

      //title change
      const [title, setTitle] = useState('SAFQA'); 
      useEffect(() => {
          document.title = title; 
      }, [title]); 
  
      //icon change
      const [favicon, setFavicon] = useState(icon); // Initial favicon
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
    }, [favicon]); // Dependency array with favicon, so it updates when favicon state changes


  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 6000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="splash">
      <div className="screen">
        <div className="logo-wrapper">
          <div className="circle"></div>

          {/* FLEX ROW */}
          <div className="logo-row">
            <img src={icon} className="hammer" alt="hammer" />
            <h1 className="text"><img src={icon2} className='safqa' alt="SAFQA" /></h1>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Splash;

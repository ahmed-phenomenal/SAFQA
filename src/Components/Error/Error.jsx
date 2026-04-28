import { useEffect } from "react";
import errorImage from "../../IMG/Error/404-status-code.png";
import faviconIcon from "../../IMG/Error/error-404.png";

function Error404() {
  useEffect(() => {
    // Set page title
    document.title = "Error 404 — Not Found";

    // Set favicon
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = faviconIcon;
  }, []);

  return (
    <img
      className="ErrorImage"
      src={errorImage}
      alt="404 - Page Not Found"
      style={{width:"100%" ,height:"100vh"}}
    />
  );
}

export default Error404;

import { useRef, useState, useEffect } from "react";

export default function CustomScrollbar({ children }) {
  const contentRef = useRef(null);
  const [thumbHeight, setThumbHeight] = useState(40);
  const [thumbTop, setThumbTop] = useState(0);

  useEffect(() => {
    const content = contentRef.current;

    const updateThumb = () => {
      const ratio = content.clientHeight / content.scrollHeight;
      setThumbHeight(content.clientHeight * ratio);
      setThumbTop(
        (content.scrollTop / content.scrollHeight) *
          content.clientHeight
      );
    };

    content.addEventListener("scroll", updateThumb);
    updateThumb();

    return () => content.removeEventListener("scroll", updateThumb);
  }, []);

  const scrollUp = () => {
    contentRef.current.scrollBy({ top: -100, behavior: "smooth" });
  };

  const scrollDown = () => {
    contentRef.current.scrollBy({ top: 100, behavior: "smooth" });
  };

  return (
    <div className="scroll-container">
      <div className="scroll-content" ref={contentRef}>
        {children}
      </div>

      <div className="custom-scrollbar">
        <button className="arrow up" onClick={scrollUp}>▲</button>

        <div className="track">
          <div
            className="thumb"
            style={{
              height: thumbHeight,
              top: thumbTop
            }}
          />
        </div>

        <button className="arrow down" onClick={scrollDown}>▼</button>
      </div>
    </div>
  );
}
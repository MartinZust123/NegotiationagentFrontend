import React, { useState } from "react"; 

const VideoUpload: React.FC<{ onVideoUpload: (url: string) => void }> = ({ onVideoUpload }) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      onVideoUpload(url);
      setIsUploaded(true);
    }
    setIsHovering(false);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsHovering(true);
  };

  const handleDragLeave = () => {
    setIsHovering(false);
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  const handleClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file && file.type.startsWith("video/")) {
        const url = URL.createObjectURL(file);
        onVideoUpload(url);
        setIsUploaded(true);
      }
    };
    input.click();
  };

  if (isUploaded) {
    return null;
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        border: `2px dashed ${isHovering ? '#fff' : '#ccc'}`,
        borderRadius: "16px",
        padding: "60px 40px",
        margin: "40px auto",
        maxWidth: "800px",
        minHeight: "300px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        backgroundColor: isHovering ? "rgba(255, 255, 255, 0.1)" : "transparent",
        cursor: "pointer",
        transition: "all 0.3s ease",
        transform: isHovering ? "scale(1.02)" : "scale(1)",
      }}
    >
      <div>
        <p style={{
          fontSize: "1.5rem",
          color: isHovering ? "#fff" : "#ccc",
          margin: 0,
          transition: "color 0.3s ease"
        }}>
          Drag and drop a video file here
        </p>
        <p style={{
          fontSize: "1.2rem",
          color: isHovering ? "#fff" : "#999",
          marginTop: "10px",
          transition: "color 0.3s ease"
        }}>
          or click to select one
        </p>
      </div>
    </div>
  );
};

export default VideoUpload;
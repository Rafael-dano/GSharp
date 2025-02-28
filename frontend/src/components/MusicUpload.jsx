import { useState } from "react";

function MusicUpload() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) {
      setMessage("Please select a file first.");
      return;
    }

    setIsUploading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setMessage("File uploaded successfully!");
        setUploadedFileName(file.name);
      } else {
        setMessage(data.detail || "Upload failed.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setMessage("Error uploading file.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <h2>Upload Music</h2>
      <form onSubmit={handleUpload}>
        <input type="file" accept=".mp3" onChange={handleFileChange} />
        <button type="submit" disabled={isUploading}>
          {isUploading ? "Uploading..." : "Upload"}
        </button>
      </form>
      <p>{message}</p>
      {uploadedFileName && <p>Uploaded File: {uploadedFileName}</p>}
    </div>
  );
}

export default MusicUpload;
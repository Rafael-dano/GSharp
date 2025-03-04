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
      const response = await fetch("https://gsharp.onrender.com/upload", {  // Updated URL for Render
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
    <div className="p-4 bg-white rounded-lg shadow-md max-w-md mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">Upload Music</h2>
      <form onSubmit={handleUpload} className="flex flex-col items-center">
        <input
          type="file"
          accept=".mp3"
          onChange={handleFileChange}
          className="mb-4"
        />
        <button
          type="submit"
          disabled={isUploading}
          className={`w-full p-2 rounded text-white ${isUploading ? "bg-blue-400" : "bg-blue-500 hover:bg-blue-600"} transition duration-200 mb-4`}
        >
          {isUploading ? "Uploading..." : "Upload"}
        </button>
      </form>
      {message && <p className="mb-2 text-center">{message}</p>}
      {uploadedFileName && (
        <p className="text-center text-green-600">Uploaded File: {uploadedFileName}</p>
      )}
    </div>
  );
}

export default MusicUpload;

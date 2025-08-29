import React, { useState } from "react";
import "./ChatWindow.css";

export default function ChatWindow() {
  const [messages, setMessages] = useState([
    { text: "Hello! I’m your Academic Chatbot 🤖", sender: "bot" },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim() === "") return;

    // Add user message
    setMessages([...messages, { text: input, sender: "user" }]);
    setInput("");

    // Dummy bot reply
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { text: "Got your query 👍 (dummy reply)", sender: "bot" },
      ]);
    }, 800);
  };

  return (
    <div className="chat-window">
      {/* Chat messages */}
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`chat-bubble ${msg.sender === "user" ? "user" : "bot"}`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      {/* Input box */}
      <div className="chat-input">
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}

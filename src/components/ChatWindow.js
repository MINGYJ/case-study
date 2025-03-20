import React, { useState, useEffect, useRef } from "react";
import "./ChatWindow.css";
import { marked } from "marked";

function ChatWindow() {
  const defaultMessage = [{
    role: "assistant",
    content: "Hi, how can I help you today?"
  }];

  const [messages, setMessages] = useState(defaultMessage);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const sessionId = "unique-session-id"; // Replace with a unique session ID for each user

  const scrollToBottom = () => {
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const fetchChatHistory = async () => {
      const response = await fetch(`http://localhost:5000/api/history?sessionId=${sessionId}`);
      const history = await response.json();
      setMessages(history.length > 0 ? history : defaultMessage);
    };

    fetchChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (input) => {
    input = String(input).trim(); // Ensure input is a string and trim it
    if (input !== "") {
      // Set user message
      const newMessages = [...messages, { role: "user", content: input }];
      setMessages(newMessages);
      setInput("");

      // Call API & set assistant message
      const response = await fetch('http://localhost:5000/api/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: input, sessionId })
      });
      const newMessage = await response.json();
      const updatedMessages = [...newMessages, newMessage];
      setMessages(updatedMessages);

      // Save updated chat history to the server
      await fetch(`http://localhost:5000/api/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sessionId, messages: updatedMessages })
      });
    }
  };

  const handleClearHistory = async () => {
    setMessages(defaultMessage);
    localStorage.removeItem("chatMessages");

    // Clear chat history on the server
    await fetch(`http://localhost:5000/api/history`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionId })
    });
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <img src="https://partselectcom-gtcdcddbene3cpes.z01.azurefd.net/images/ps-25-year-logo.svg" alt="PartSelect Logo" className="chat-logo" />
      </div>
      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index} className={`${message.role}-message-container`}>
            {message.content && (
              <div className={`message ${message.role}-message`}>
                <div dangerouslySetInnerHTML={{ __html: marked(message.content).replace(/<p>|<\/p>/g, "") }}></div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              handleSend(input);
              e.preventDefault();
            }
          }}
          rows="3"
        />
        <button className="send-button" onClick={() => handleSend(input)}>
          Send
        </button>
        <button className="clear-button" onClick={handleClearHistory}>
          Clear History
        </button>
      </div>
    </div>
  );
}

export default ChatWindow;

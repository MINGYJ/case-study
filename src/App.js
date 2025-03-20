import React, { useState } from "react";
import "./App.css";
import ChatWindow from "./components/ChatWindow";

function App() {

  return (
    <div className="App">
      <div className="heading">
      <img src="https://partselectcom-gtcdcddbene3cpes.z01.azurefd.net/images/ps-25-year-logo.svg" alt="PartSelect Logo" className="chat-logo" />
        PartSelect Chatbot
      </div>
        <ChatWindow/>
    </div>
  );
}

export default App;

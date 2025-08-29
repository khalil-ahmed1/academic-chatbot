import { useState } from "react";
import "./App.css";
import ChatWindow from "./components/Chatwindow";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#f3f4f6",
        }}
      >
        <ChatWindow />
      </div>
    </>
  );
}

export default App;

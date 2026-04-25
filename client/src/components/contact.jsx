import Sidebar from "../components/Sidebar";
import { useState } from "react";
import axios from "axios";

function Contact() {
  const [msg, setMsg] = useState("");

  const send = async () => {
    await axios.post("/api/contact", { message: msg });
    alert("Message sent");
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="p-6">
        <h1>Contact</h1>

        <input
          className="border p-2"
          placeholder="Enter message"
          onChange={e => setMsg(e.target.value)}
        />

        <button onClick={send} className="bg-blue-600 p-2 ml-2">
          Send
        </button>
      </div>
    </div>
  );
}

export default Contact;

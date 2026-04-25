import TenantSidebar from "../components/TenantSidebar";
import { useState } from "react";
import axios from "axios";

function Contact() {
  const [message, setMessage] = useState("");

  const sendMessage = async () => {
    try {
      await axios.post("/api/contact", { message });
      alert("Message sent successfully");
      setMessage("");
    } catch (err) {
      alert("Error sending message");
    }
  };

  return (
    <div className="flex bg-gray-950 text-white min-h-screen">

      {/* ✅ SIDEBAR FIXED */}
      <TenantSidebar />

      <div className="flex-1 p-6 space-y-10">

        {/* HERO */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 rounded-2xl shadow">
          <h1 className="text-4xl font-bold mb-2">📞 Contact Us</h1>
          <p className="text-gray-200">
            Have questions? We’d love to hear from you. Reach out anytime!
          </p>
        </div>

        {/* CONTACT CARDS */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* YOU */}
          <div className="bg-gray-900 p-6 rounded-2xl shadow hover:scale-105 transition">
            <h2 className="text-xl font-bold text-blue-400 mb-2">
              👩‍💻 Neha Jaiswal
            </h2>

            <p className="text-gray-400">📧 nehajaiswal230250@gmail.com</p>
            <p className="text-gray-400">📱 7667135650</p>

            <p className="mt-3 text-gray-500 text-sm">
              Full Stack Developer & System Designer
            </p>
          </div>

          {/* PARTNER */}
          <div className="bg-gray-900 p-6 rounded-2xl shadow hover:scale-105 transition">
            <h2 className="text-xl font-bold text-purple-400 mb-2">
              👩‍💻 Palak Srivastav
            </h2>

            <p className="text-gray-400">📧 palaksri145@gmail.com</p>

            <p className="mt-3 text-gray-500 text-sm">
              UI/UX Designer & Frontend Developer
            </p>
          </div>

        </div>

        {/* CONTACT FORM */}
        <div className="bg-gray-900 p-6 rounded-2xl shadow max-w-xl">

          <h2 className="text-2xl font-semibold mb-4">💬 Send a Message</h2>

          <textarea
            className="w-full p-3 rounded bg-gray-800 text-white border border-gray-700"
            rows="4"
            placeholder="Write your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <button
            onClick={sendMessage}
            className="mt-4 w-full bg-blue-600 p-3 rounded-xl hover:bg-blue-700 transition"
          >
            Send Message
          </button>

        </div>

        {/* FOOTER */}
        <div className="text-center text-gray-500 text-sm">
          We usually respond within 24 hours 🚀
        </div>

      </div>
    </div>
  );
}

export default Contact;

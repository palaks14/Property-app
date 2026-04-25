import Sidebar from "../components/Sidebar";
import { useState } from "react";
import axios from "axios";

function Queries() {
  const [query, setQuery] = useState("");

  const sendQuery = async () => {
    await axios.post("/api/query", { message: query });
    alert("Query submitted");
  };

  return (
    <div className="flex">
      <Sidebar />
      <div className="p-6">
        <h1>Queries</h1>

        <input
          className="border p-2"
          placeholder="Ask something..."
          onChange={e => setQuery(e.target.value)}
        />

        <button onClick={sendQuery} className="bg-green-600 p-2 ml-2">
          Submit
        </button>
      </div>
    </div>
  );
}

export default Queries;

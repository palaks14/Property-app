import Sidebar from "../components/Sidebar";

function About() {
  return (
    <div className="flex">
      <Sidebar />
      <div className="p-6">
        <h1 className="text-2xl font-bold">About</h1>
        <p>This is a smart property management system.</p>
      </div>
    </div>
  );
}

export default About;
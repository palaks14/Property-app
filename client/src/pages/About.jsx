import TenantSidebar from "../components/TenantSidebar";

function About() {
  return (
    <div className="flex bg-gray-950 text-white min-h-screen">

      {/* ✅ SIDEBAR */}
      <TenantSidebar />

      {/* MAIN CONTENT */}
      <div className="flex-1 p-6 space-y-10">

        {/* HERO */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 rounded-2xl shadow">
          <h1 className="text-4xl font-bold mb-3">🏠 Smart Property Platform</h1>
          <p className="text-gray-200">
            Discover modern rental homes with verified listings, transparent pricing,
            and seamless online management.
          </p>
        </div>

        {/* STATS */}
        <div className="grid md:grid-cols-4 gap-4 text-center">
          {[
            { label: "Properties", value: "100+" },
            { label: "Happy Tenants", value: "500+" },
            { label: "Cities Covered", value: "10+" },
            { label: "Support", value: "24/7" }
          ].map((item, i) => (
            <div key={i} className="bg-gray-900 p-4 rounded-xl">
              <h2 className="text-2xl font-bold text-blue-400">{item.value}</h2>
              <p className="text-gray-400">{item.label}</p>
            </div>
          ))}
        </div>

        {/* PROPERTY TYPES */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">🏢 Property Types</h2>
          <div className="grid md:grid-cols-3 gap-4">

            <div className="bg-gray-900 p-4 rounded-xl">
              <h3 className="font-bold text-blue-400">2BHK Flats</h3>
              <p className="text-gray-400">Affordable and perfect for small families.</p>
            </div>

            <div className="bg-gray-900 p-4 rounded-xl">
              <h3 className="font-bold text-blue-400">3BHK Flats</h3>
              <p className="text-gray-400">Spacious homes with extra comfort.</p>
            </div>

            <div className="bg-gray-900 p-4 rounded-xl">
              <h3 className="font-bold text-blue-400">4BHK Flats</h3>
              <p className="text-gray-400">Luxury living with premium facilities.</p>
            </div>

          </div>
        </div>

        {/* FACILITIES */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">✨ Facilities</h2>
          <div className="flex flex-wrap gap-3">
            {["WiFi", "Parking", "Gym", "Security", "Power Backup", "Lift"].map(f => (
              <span key={f} className="bg-gray-800 px-3 py-1 rounded">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* PRICING */}
        <div className="bg-gray-900 p-6 rounded-xl">
          <h2 className="text-xl font-semibold mb-2">💰 Pricing</h2>
          <p className="text-gray-400">
            Rental prices range from <span className="text-green-400 font-bold">₹5000 to ₹15000</span>,
            based on location, facilities, and property size.
          </p>
        </div>

        {/* FEATURES */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">🚀 Key Features</h2>
          <div className="grid md:grid-cols-3 gap-4">

            <div className="bg-gray-900 p-4 rounded-xl">
              <h3 className="font-bold">🔐 Secure Login</h3>
              <p className="text-gray-400">JWT authentication system.</p>
            </div>

            <div className="bg-gray-900 p-4 rounded-xl">
              <h3 className="font-bold">💳 Online Payments</h3>
              <p className="text-gray-400">Integrated Razorpay system.</p>
            </div>

            <div className="bg-gray-900 p-4 rounded-xl">
              <h3 className="font-bold">🛠 Maintenance</h3>
              <p className="text-gray-400">Quick service request system.</p>
            </div>

          </div>
        </div>

        {/* TESTIMONIALS */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">💬 What Users Say</h2>

          <div className="grid md:grid-cols-2 gap-4">

            <div className="bg-gray-900 p-4 rounded-xl">
              <p className="text-gray-300">
                "Found my perfect flat in minutes. Super easy platform!"
              </p>
              <p className="text-blue-400 mt-2">– Aditi</p>
            </div>

            <div className="bg-gray-900 p-4 rounded-xl">
              <p className="text-gray-300">
                "Rent payment and maintenance tracking is very smooth."
              </p>
              <p className="text-blue-400 mt-2">– Rahul</p>
            </div>

          </div>
        </div>

        {/* MISSION */}
        <div className="bg-gray-900 p-6 rounded-xl">
          <h2 className="text-xl font-semibold mb-2">🎯 Our Mission</h2>
          <p className="text-gray-400">
            To simplify property management and provide a seamless digital experience
            for landlords and tenants.
          </p>
        </div>

        {/* CTA */}
        <div className="bg-blue-600 p-6 rounded-xl text-center">
          <h2 className="text-xl font-bold mb-2">Ready to find your home?</h2>
          <p>Explore properties and start your journey today!</p>
        </div>

      </div>
    </div>
  );
}

export default About;
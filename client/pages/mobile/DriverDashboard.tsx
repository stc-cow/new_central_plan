export default function DriverDashboard() {
  return (
    <div className="bg-gradient-to-b from-slate-50 to-slate-200 min-h-screen font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md px-4 py-3 flex justify-between items-center rounded-b-2xl">
        <div className="flex items-center gap-3">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2Fbd65b3cd7a86452e803a3d7dc7a3d048%2Fdf60032fd7d44277b7f568b8478ff12e?format=webp&width=400"
            alt="ACES Logo"
            className="h-8 w-auto"
          />
          <div className="flex flex-col text-sm">
            <span className="text-gray-500">Signed in as</span>
            <span className="text-blue-900 font-semibold">
              {localStorage.getItem("driver.remember") || "driver"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full hover:bg-slate-100 transition" aria-label="Notifications">
            🔔
          </button>
          <button className="bg-blue-800 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-900 transition" type="button" onClick={() => window.location.reload()}>
            Refresh
          </button>
          <button
            className="border border-red-500 text-red-600 px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-red-50 transition"
            type="button"
            onClick={() => {
              localStorage.removeItem("driver.remember");
              window.location.hash = "#/driver-login";
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow p-5 flex flex-col items-center">
        {/* Search */}
        <div className="w-full max-w-md mb-4">
          <input
            type="text"
            placeholder="Search fueling tasks..."
            className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-700 focus:outline-none shadow-sm"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap justify-center">
          <button className="px-4 py-2 bg-blue-800 text-white rounded-xl font-semibold shadow hover:bg-blue-900 transition">
            Active <span className="ml-1 text-xs bg-white text-blue-700 px-2 py-0.5 rounded-md">0</span>
          </button>
          <button className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition">
            Returned <span className="ml-1 text-xs bg-red-600 text-white px-2 py-0.5 rounded-md">0</span>
          </button>
          <button className="px-4 py-2 bg-green-50 text-green-600 rounded-xl font-semibold hover:bg-green-100 transition">
            Completed <span className="ml-1 text-xs bg-green-600 text-white px-2 py-0.5 rounded-md">0</span>
          </button>
          <button className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl font-semibold hover:bg-slate-100 transition">
            All Tasks <span className="ml-1 text-xs bg-slate-300 text-white px-2 py-0.5 rounded-md">0</span>
          </button>
        </div>

        {/* Empty state */}
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 w-full max-w-md flex flex-col items-center text-center shadow-sm">
          <div className="bg-blue-50 rounded-full p-3 mb-3">
            <span className="text-blue-600 text-2xl">➕</span>
          </div>
          <h3 className="text-slate-600 text-lg font-medium">No fueling missions assigned yet</h3>
          <p className="text-slate-400 text-sm mt-1">You’ll see your tasks here once assigned.</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-3 text-xs text-slate-400">
        Powered by <span className="text-blue-800 font-semibold">ACES Managed Services</span>
      </footer>
    </div>
  );
}

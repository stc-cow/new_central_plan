import { Bell, LogOut, PlusCircle } from "lucide-react";

export default function DriverTasks() {
  const username = localStorage.getItem("driver.remember") || "Baligh";
  return (
    <div className="min-h-screen flex flex-col font-sans bg-gradient-to-b from-[#001E60] via-[#0b1b3a] to-[#F5F7FB] text-slate-800">
      {/* Header */}
      <header className="bg-white/95 shadow-md rounded-b-2xl px-4 py-3 flex flex-col gap-3">
        <div className="flex justify-between items-center w-full">
          {/* Left: Logo and name */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] text-gray-500">Signed in as</span>
              <span className="text-sm font-semibold text-blue-900">{username}</span>
            </div>
          </div>

          {/* Right: Icons */}
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition" aria-label="Notifications">
              <Bell size={18} className="text-slate-600" />
            </button>
            <button
              className="p-1.5 border border-red-400 rounded-full text-red-600 hover:bg-red-50 transition"
              aria-label="Logout"
              onClick={() => {
                localStorage.removeItem("driver.remember");
                window.location.hash = "#/driver-login";
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search fueling tasks..."
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-700 focus:outline-none"
        />
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-2 px-3 py-3">
        <button className="px-4 py-1.5 rounded-full bg-blue-700 text-white text-sm font-semibold">
          Active <span className="ml-1 text-xs bg-white text-blue-700 px-1.5 rounded">0</span>
        </button>
        <button className="px-4 py-1.5 rounded-full bg-red-50 text-red-600 text-sm font-semibold">
          Returned <span className="ml-1 text-xs bg-red-500 text-white px-1.5 rounded">0</span>
        </button>
        <button className="px-4 py-1.5 rounded-full bg-green-50 text-green-600 text-sm font-semibold">
          Completed <span className="ml-1 text-xs bg-green-600 text-white px-1.5 rounded">0</span>
        </button>
        <button className="px-4 py-1.5 rounded-full bg-white/80 border border-slate-300 text-slate-700 text-sm font-semibold">
          All <span className="ml-1 text-xs bg-slate-300 text-white px-1.5 rounded">0</span>
        </button>
      </div>

      {/* Empty State */}
      <div className="flex-grow flex justify-center items-center px-4 pb-4">
        <div className="bg-white/95 border border-dashed border-slate-300 rounded-2xl p-6 w-full max-w-xs text-center shadow-md">
          <PlusCircle className="text-blue-700 mb-2 mx-auto" size={36} />
          <h3 className="font-semibold text-slate-700 text-sm">No fueling missions assigned yet</h3>
          <p className="text-xs text-slate-500 mt-1">You’ll see your tasks here once assigned.</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-3 text-[11px] text-slate-300">
        Powered by <span className="text-white font-semibold">ACES Managed Services</span>
      </footer>
    </div>
  );
}

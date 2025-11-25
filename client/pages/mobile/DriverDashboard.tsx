import { Bell, LogOut, PlusCircle } from "lucide-react";

export default function DriverDashboard() {
  const username = localStorage.getItem("driver.remember") || "baligh";
  return (
    <div className="min-h-screen flex flex-col font-sans bg-gradient-to-b from-[#001E60] via-[#0b1b3a] to-[#F5F7FB] text-slate-800">
      {/* Header */}
      <header className="bg-white/95 shadow-md rounded-b-2xl px-4 py-3 flex flex-col gap-3">
        {/* Top Row: ACES + Username */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="https://cdn.builder.io/api/v1/image/assets%2Fbd65b3cd7a86452e803a3d7dc7a3d048%2F4447a86c5269426e9a4e9dfb765a6409" alt="ACES Logo" className="h-6 w-auto" />
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] text-gray-500">Signed in as</span>
              <span className="text-sm font-semibold text-blue-900">{username}</span>
            </div>
          </div>

          {/* Icons: Notification + Logout */}
          <div className="flex items-center gap-3">
            <button className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition" aria-label="Notifications">
              <Bell size={18} className="text-slate-600" />
            </button>
            <button
              className="p-1.5 border border-red-400 rounded-full text-red-600 hover:bg-red-50 transition"
              type="button"
              onClick={() => {
                localStorage.removeItem("driver.remember");
                window.location.hash = "#/driver-login";
              }}
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div>
          <input
            type="text"
            placeholder="Search fueling tasks..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 shadow-sm text-sm focus:ring-2 focus:ring-blue-700 focus:outline-none bg-white/90"
          />
        </div>
      </header>

      {/* Task Tabs */}
      <div className="flex flex-wrap justify-center gap-2 px-3 py-3">
        <button className="px-4 py-1.5 rounded-full bg-blue-700 text-white text-sm font-semibold shadow-md">
          Active <span className="ml-1 bg-white text-blue-700 text-xs px-1.5 rounded">0</span>
        </button>
        <button className="px-4 py-1.5 rounded-full bg-red-50 text-red-600 text-sm font-semibold">
          Returned <span className="ml-1 bg-red-500 text-white text-xs px-1.5 rounded">0</span>
        </button>
        <button className="px-4 py-1.5 rounded-full bg-green-50 text-green-600 text-sm font-semibold">
          Completed <span className="ml-1 bg-green-600 text-white text-xs px-1.5 rounded">0</span>
        </button>
        <button className="px-4 py-1.5 rounded-full bg-white/80 border border-slate-300 text-slate-700 text-sm font-semibold">
          All <span className="ml-1 text-xs bg-slate-300 text-white px-1.5 rounded">0</span>
        </button>
      </div>

      {/* Empty State */}
      <div className="flex-grow flex flex-col justify-center items-center px-4">
        <div className="bg-white/90 border border-dashed border-slate-300 rounded-2xl p-8 w-full max-w-xs flex flex-col items-center text-center shadow-sm backdrop-blur-md">
          <PlusCircle className="text-blue-700 mb-2" size={36} />
          <h3 className="text-slate-700 font-semibold text-sm mb-1">No fueling missions assigned yet</h3>
          <p className="text-slate-500 text-xs">You’ll see your tasks here once assigned.</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-3 text-[11px] text-slate-300">
        Powered by <span className="text-white font-semibold">ACES MSD</span>
      </footer>
    </div>
  );
}

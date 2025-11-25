import { Bell, LogOut, PlusCircle } from "lucide-react";

export default function DriverDashboard() {
  const username = localStorage.getItem("driver.remember") || "baligh";
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#000b2d] via-[#0b2355] to-[#0f1c3b] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(15,118,255,0.18),transparent_45%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(94,234,212,0.18),transparent_40%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4 shadow-2xl backdrop-blur-xl sm:px-7">
          {/* Top Row: ACES + Username */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-2 shadow-inner">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets%2Fbd65b3cd7a86452e803a3d7dc7a3d048%2F4447a86c5269426e9a4e9dfb765a6409"
                  alt="ACES Logo"
                  className="h-8 w-auto"
                />
                <div className="h-8 w-px bg-white/30" aria-hidden="true" />
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/STC_%28Saudi_Telecom%29_logo.svg/2560px-STC_%28Saudi_Telecom%29_logo.svg.png"
                  alt="STC Logo"
                  className="h-8 w-auto"
                />
              </div>

              <div className="flex flex-col leading-tight text-slate-100">
                <span className="text-[11px] uppercase tracking-[0.2em] text-slate-300">Signed in as</span>
                <span className="text-lg font-semibold text-white drop-shadow-sm">{username}</span>
              </div>
            </div>

            {/* Icons: Notification + Logout */}
            <div className="flex items-center gap-3 self-start rounded-full bg-white/10 p-1.5 shadow-inner md:self-auto">
              <button
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-slate-200 ring-1 ring-white/15 transition hover:-translate-y-0.5 hover:bg-white/15 hover:text-white hover:shadow-lg"
                aria-label="Notifications"
              >
                <Bell size={18} />
              </button>
              <button
                className="flex h-11 w-11 items-center justify-center rounded-full border border-red-400/60 bg-red-500/10 text-red-200 ring-1 ring-red-500/30 transition hover:-translate-y-0.5 hover:bg-red-500/15 hover:text-white hover:shadow-lg"
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
          <div className="mt-4">
            <div className="group relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <span className="h-2 w-2 rounded-full bg-emerald-300" aria-hidden="true" />
              </div>
              <input
                type="text"
                placeholder="Search fueling tasks..."
                className="w-full rounded-2xl border border-white/15 bg-white/10 px-5 py-3 pl-11 text-sm text-white shadow-inner outline-none transition focus:border-emerald-300/70 focus:bg-white/15 focus:shadow-emerald-300/20"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-[11px] uppercase tracking-[0.2em] text-white/50">
                Fueling
              </div>
            </div>
          </div>
        </header>

        {/* Task Tabs */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-3 shadow-2xl backdrop-blur-xl">
          <div className="absolute inset-x-4 top-2 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" aria-hidden="true" />
          <div className="flex flex-wrap justify-center gap-2">
            <button className="group relative overflow-hidden rounded-full bg-gradient-to-r from-[#0ea5e9] to-[#2563eb] px-5 py-2 text-sm font-semibold text-white shadow-lg ring-1 ring-white/20 transition hover:-translate-y-0.5">
              <span className="relative z-10">
                Active <span className="ml-1 rounded bg-white/90 px-1.5 text-xs font-bold text-blue-700 shadow-sm">0</span>
              </span>
              <span className="absolute inset-0 bg-white/10 opacity-0 transition group-hover:opacity-40" aria-hidden="true" />
            </button>
            <button className="rounded-full bg-red-500/10 px-5 py-2 text-sm font-semibold text-red-200 ring-1 ring-red-300/30 transition hover:-translate-y-0.5 hover:bg-red-500/20 hover:text-red-50">
              Returned <span className="ml-1 rounded bg-red-500 text-xs px-1.5 text-white">0</span>
            </button>
            <button className="rounded-full bg-emerald-500/10 px-5 py-2 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-300/30 transition hover:-translate-y-0.5 hover:bg-emerald-500/20 hover:text-emerald-50">
              Completed <span className="ml-1 rounded bg-emerald-500 text-xs px-1.5 text-white">0</span>
            </button>
            <button className="rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/15">
              All <span className="ml-1 rounded bg-white/25 px-1.5 text-xs text-white">0</span>
            </button>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xl rounded-3xl border border-dashed border-white/20 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0ea5e9] to-[#2563eb] text-white shadow-lg">
              <PlusCircle className="text-white" size={28} />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">No fueling missions assigned yet</h3>
            <p className="text-sm text-slate-200/80">You’ll see your tasks here once assigned.</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="pb-2 text-center text-[11px] uppercase tracking-[0.2em] text-slate-300/70">
          <span className="rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">Powered by <span className="font-semibold text-white">ACES MSD</span></span>
        </footer>
      </div>
    </div>
  );
}

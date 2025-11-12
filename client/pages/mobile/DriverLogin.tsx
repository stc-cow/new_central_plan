import { CheckCircle2, ShieldCheck } from "lucide-react";

export default function DriverLogin() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1b3a] font-sans text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#001E60] via-[#0b1b3a] to-[#0F1F4C]" />
        <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#1c2f7a]/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-full bg-gradient-to-t from-[#0b1b3a] to-transparent" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col justify-center px-4 py-8 sm:px-6 md:px-8">
        <div className="mx-auto w-full max-w-md space-y-8 text-white">
          <div className="flex flex-col items-center gap-4 text-center">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2Fbd65b3cd7a86452e803a3d7dc7a3d048%2F4447a86c5269426e9a4e9dfb765a6409"
              alt="ACES Logo"
              className="h-16 w-auto"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/70">
                ACES Fuel Operations
              </p>
              <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
                Driver Command Center
              </h1>
            </div>
          </div>

          <p className="text-center text-sm leading-relaxed text-white/80 sm:text-base">
            Stay in sync with dispatch, receive fueling missions in real time,
            and submit photo-verified entries directly from the field. Your
            ACES credentials keep every mission secure and accountable.
          </p>

          <ul className="grid gap-3 text-sm text-white/80">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#94C5FF]" />
              <span>Secure access to assigned missions</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#94C5FF]" />
              <span>Guided task completion &amp; uploads</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#94C5FF]" />
              <span>Instant updates from operations control</span>
            </li>
          </ul>

          <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/80 shadow-xl backdrop-blur">
            <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#94C5FF]" />
            <div>
              <p className="font-semibold text-white">Need assistance?</p>
              <p>Contact dispatch at +971 55 000 0000 or ops@acesfuel.com</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

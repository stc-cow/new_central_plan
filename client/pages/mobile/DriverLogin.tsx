import { FormEvent, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, ShieldCheck } from "lucide-react";

export default function DriverLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setError("Please enter both username and password");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/driver/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: trimmedUsername,
          password: trimmedPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.error || "Login failed. Please check your credentials.");
        return;
      }

      if (remember) {
        localStorage.setItem("driver.remember", trimmedUsername);
        localStorage.setItem("driver.profile", JSON.stringify(data.profile));
      } else {
        localStorage.removeItem("driver.remember");
        localStorage.setItem("driver.profile", JSON.stringify(data.profile));
      }

      window.location.hash = "#/driver-dashboard";
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b1b3a] font-sans text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#001E60] via-[#0b1b3a] to-[#0F1F4C]" />
        <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#1c2f7a]/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-full bg-gradient-to-t from-[#0b1b3a] to-transparent" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <main className="flex flex-1 items-center justify-center px-4 py-10 lg:px-8">
          <div className="mx-auto grid w-full max-w-5xl gap-10 lg:grid-cols-[1.1fr,1fr] lg:items-center">
            <section className="space-y-8 text-white">
              <div className="flex items-center gap-4">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets%2Fbd65b3cd7a86452e803a3d7dc7a3d048%2F4447a86c5269426e9a4e9dfb765a6409"
                  alt="ACES Logo"
                  className="h-16 w-auto"
                />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/70">
                    ACES Fuel Operations
                  </p>
                  <h1 className="text-3xl font-semibold leading-tight">Driver Command Center</h1>
                </div>
              </div>

              <p className="max-w-xl text-base leading-relaxed text-white/80">
                Stay in sync with dispatch, receive fueling missions in real time,
                and submit photo-verified entries directly from the field. Your
                ACES credentials keep every mission secure and accountable.
              </p>

              <ul className="grid gap-3 text-sm text-white/80">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#94C5FF]" />
                  Secure access to assigned missions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#94C5FF]" />
                  Guided task completion &amp; uploads
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#94C5FF]" />
                  Instant updates from operations control
                </li>
              </ul>

              <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/80 shadow-xl backdrop-blur">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-[#94C5FF]" />
                <div>
                  <p className="font-semibold text-white">Need assistance?</p>
                  <p>Contact dispatch at +971 55 000 0000 or ops@acesfuel.com</p>
                </div>
              </div>
            </section>

            <Card className="w-full overflow-hidden rounded-3xl border border-white/15 bg-white/95 shadow-2xl shadow-[#0b1b3a]/40 backdrop-blur">
              <CardContent className="space-y-6 p-8">
                <div className="space-y-2 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#202B6D]/80">
                    Welcome back
                  </p>
                  <h2 className="text-2xl font-semibold text-[#0F172A]">
                    Sign in to your driver profile
                  </h2>
                  <p className="text-sm text-[#6B7280]">
                    Enter the credentials issued by ACES Managed Services.
                  </p>
                </div>

                <form onSubmit={onSubmit} className="space-y-5">
                  {error && (
                    <div className="rounded-xl border border-[#F4A5A8] bg-[#FDE8EA] px-4 py-3 text-sm font-medium text-[#C41D25]">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2 text-left">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[#202B6D]">
                      Username
                    </label>
                    <Input
                      type="text"
                      placeholder="driver.name@acesfuel.com"
                      className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 focus-visible:border-[#202B6D] focus-visible:ring-2 focus-visible:ring-[#202B6D]/30 focus-visible:ring-offset-0"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-[#202B6D]">
                      Password
                    </label>
                    <Input
                      type="password"
                      placeholder="Enter password"
                      className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 focus-visible:border-[#202B6D] focus-visible:ring-2 focus-visible:ring-[#202B6D]/30 focus-visible:ring-offset-0"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <label className="flex items-center gap-2 text-[#0F172A]">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border border-slate-300 text-[#202B6D] focus:ring-[#202B6D]"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        disabled={isLoading}
                      />
                      Remember me on this device
                    </label>
                    <a
                      href="#"
                      className="text-sm font-semibold text-[#202B6D] transition hover:text-[#162769]"
                    >
                      Forgot password?
                    </a>
                  </div>

                  <Button
                    type="submit"
                    className="h-12 w-full rounded-xl bg-[#202B6D] text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-[#202B6D]/30 transition hover:bg-[#162769] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#202B6D]/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isLoading}
                  >
                    {isLoading ? "Logging in..." : "Enter Driver Portal"}
                  </Button>
                </form>

                <p className="text-center text-xs text-[#6B7280]">
                  Access is limited to authorised ACES field teams. Contact
                  operations if you require assistance.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>

        <footer className="px-6 pb-6 text-center text-[11px] uppercase tracking-[0.3em] text-white/60">
          Powered by <span className="font-semibold text-white">ACES Managed Services</span>
        </footer>
      </div>
    </div>
  );
}

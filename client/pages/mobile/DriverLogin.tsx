import { FormEvent, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export default function DriverLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (remember && username) localStorage.setItem("driver.remember", username);
    if (!remember) localStorage.removeItem("driver.remember");
    window.location.hash = "#/driver-dashboard";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-200 font-sans p-4">
      <Card className="w-full max-w-sm bg-white shadow-2xl rounded-2xl border border-slate-100">
        <CardContent className="p-8">
          <div className="flex justify-center mb-6">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2Fbd65b3cd7a86452e803a3d7dc7a3d048%2Fdf60032fd7d44277b7f568b8478ff12e?format=webp&width=400"
              alt="ACES Logo"
              className="h-16 w-auto"
            />
          </div>

          <h2 className="text-2xl font-semibold text-center text-slate-800 mb-2">Driver App</h2>
          <p className="text-center text-slate-500 text-sm mb-8">
            Sign in with your assigned credentials to access fueling tasks.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Username *</span>
              <Input
                type="text"
                placeholder="Enter username"
                className="mt-1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Password *</span>
              <div className="relative mt-1">
                <Input
                  type={showPwd ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-2.5 text-slate-400"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm text-slate-600 gap-2">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(v) => setRemember(Boolean(v))}
                />
                Remember me
              </label>
              <a href="#" className="text-sm text-blue-600 hover:underline">
                Forgot password?
              </a>
            </div>

            <Button type="submit" className="w-full bg-blue-800 hover:bg-blue-900 text-white font-semibold py-2.5 rounded-lg shadow-md">
              LOGIN
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            Powered by <span className="font-semibold text-blue-800"><strong>ACES MSD</strong></span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

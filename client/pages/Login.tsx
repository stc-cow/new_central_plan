import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().optional().default(false),
});

type FormValues = z.infer<typeof schema>;

const VALID_PASSWORD = "Aces@6343";
const ADMINS_STORAGE_KEY = "app.admins";

export default function Login() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "Bannaga", password: "", remember: false },
  });

  useEffect(() => {
    const remembered = localStorage.getItem("remember.username");
    if (remembered) {
      setValue("username", remembered);
      setValue("remember", true);
    }
    if (localStorage.getItem("auth.loggedIn") === "true") {
      navigate("/");
    }
  }, [setValue, navigate]);

  const [authError, setAuthError] = useState<string | null>(null);

  const onSubmit = async (values: FormValues) => {
    setAuthError(null);
    // Validate against Supabase admins table
    let ok = false;
    const { data, error } = await supabase
      .from("admins")
      .select("id, username, password")
      .eq("username", values.username.trim())
      .maybeSingle();
    if (!error && data) {
      ok = data.password === values.password;
    }
    // fallback to legacy hardcoded admin if table not yet populated
    if (!ok && (!data || error)) {
      ok =
        values.username.trim() === "Bannaga" && values.password === "Aces@6343";
    }

    if (!ok) {
      setAuthError("Invalid username or password.");
      return;
    }
    if (values.remember) {
      localStorage.setItem("remember.username", values.username);
    } else {
      localStorage.removeItem("remember.username");
    }
    localStorage.setItem("auth.loggedIn", "true");
    localStorage.setItem("auth.username", values.username);
    // Log to admin_log table
    try {
      await supabase
        .from("admin_log")
        .insert({ username: values.username, event: "login" });
    } catch {}
    navigate("/");
  };

  const { t } = useI18n();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const sendReset = async () => {
    const email = resetEmail.trim();
    const emailOk = /[^@\s]+@[^@\s]+\.[^@\s]+/.test(email);
    if (!emailOk) {
      toast({ title: t("invalidEmail") });
      return;
    }
    try {
      await fetch("/api/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      toast({ title: t("resetEmailSent") });
      setResetOpen(false);
    } catch {
      toast({ title: t("resetEmailSent") });
      setResetOpen(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#eef2ff] via-[#f8fafc] to-[#ffffff]">
      <Decor />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">
        <Card className="w-full max-w-md bg-[#0D0F1A] border border-[#1F2937] rounded-2xl shadow-2xl transition-transform duration-300 ease-in-out hover:scale-[1.01]">
          <CardContent className="p-10">
            <div className="mb-8">
              <div className="mx-auto mb-3 flex items-center justify-center">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets%2Fbd65b3cd7a86452e803a3d7dc7a3d048%2Fdf60032fd7d44277b7f568b8478ff12e?format=webp&width=800"
                  alt="ACES"
                  className="h-20 w-auto"
                  loading="eager"
                  decoding="async"
                />
              </div>
              <h1 className="text-lg font-semibold text-white">
                Sign in to ACES Fuel Portal
              </h1>
              <p className="mt-1 text-xs text-white/60">
                {t("signInSubtitle")}
              </p>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <Label htmlFor="username" className="text-white/80">
                  {t("username")}
                </Label>
                <Input
                  id="username"
                  placeholder={t("username")}
                  autoComplete="username"
                  className="mt-2 h-11 rounded-lg bg-[#111827] border border-[#2D3748] text-white placeholder:text-gray-400 shadow-inner focus-visible:ring-2 focus-visible:ring-[#7A00FF]"
                  {...register("username")}
                />
                {errors.username && (
                  <p className="mt-1 text-xs text-rose-400">
                    {errors.username.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="password" className="text-white/80">
                  {t("password")}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("password")}
                  autoComplete="current-password"
                  className="mt-2 h-11 rounded-lg bg-[#111827] border border-[#2D3748] text-white placeholder:text-gray-400 shadow-inner focus-visible:ring-2 focus-visible:ring-[#FF0057]"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-rose-400">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-white/70">
                  <Checkbox
                    className="border-white/30 data-[state=checked]:bg-primary"
                    {...register("remember")}
                  />
                  <span className="text-sm">{t("rememberMe")}</span>
                </label>
              </div>
              {authError && (
                <p className="-mt-1 text-sm text-rose-400">{authError}</p>
              )}
              <Button
                type="submit"
                className="w-full py-3 rounded-lg font-bold text-lg bg-gradient-to-r from-[#FF0057] via-[#7A00FF] to-[#00D9FF] text-white shadow-lg shadow-[#7A00FF]/40 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
                disabled={isSubmitting}
              >
                {isSubmitting ? t("signingIn") : t("login")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("resetPassword")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="resetEmail">{t("enterEmailToReset")}</Label>
            <Input
              id="resetEmail"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setResetOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="button" onClick={sendReset}>
              {t("sendResetLink")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Decor() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1200 800"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="50%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
        <radialGradient
          id="r1"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(200,150) rotate(45) scale(400)"
        >
          <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#93c5fd" stopOpacity="0" />
        </radialGradient>
        <radialGradient
          id="r2"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(1000,650) rotate(-30) scale(500)"
        >
          <stop offset="0%" stopColor="#fda4af" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fda4af" stopOpacity="0" />
        </radialGradient>
        <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="60" />
        </filter>
      </defs>
      <g opacity="0.5">
        <circle cx="200" cy="150" r="300" fill="url(#r1)" filter="url(#blur)" />
        <circle
          cx="1000"
          cy="650"
          r="350"
          fill="url(#r2)"
          filter="url(#blur)"
        />
      </g>
      <g fill="none" stroke="url(#g)" strokeOpacity="0.25">
        <path d="M0 700 L300 500 600 650 900 450 1200 600" />
        <path d="M0 500 L250 350 500 500 750 350 1000 500 1200 400" />
        <path d="M0 300 L300 200 600 300 900 200 1200 250" />
      </g>
    </svg>
  );
}

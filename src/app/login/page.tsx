"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/format";
import { useT } from "@/lib/i18n";

const DICT = {
  en: {
    title: "Log in",
    subtitle: "Log in to start trading carbon credits",
    email: "Email",
    password: "Password",
    loggingIn: "Logging in…",
    login: "Log in",
    noAccount: "Don't have an account?",
    signUp: "Sign up",
    demoAccount: "Demo accounts",
  },
  zh: {
    title: "登录",
    subtitle: "登录后开始交易碳信用",
    email: "邮箱",
    password: "密码",
    loggingIn: "登录中…",
    login: "登录",
    noAccount: "还没有账号？",
    signUp: "注册",
    demoAccount: "演示账号",
  },
};

export default function LoginPage() {
  const t = useT(DICT);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      router.push("/portfolio");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-10">
      <div className="rounded-2xl border border-border bg-surface shadow-card p-6">
        <h1 className="text-lg font-bold mb-1">{t.title}</h1>
        <p className="text-muted text-sm mb-5">{t.subtitle}</p>
        <form onSubmit={submit} className="space-y-3">
          <Input label={t.email} type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <Input label={t.password} type="password" value={password} onChange={setPassword} placeholder="••••••" />
          {err && <div className="text-down text-xs">{err}</div>}
          <button disabled={busy} className="w-full py-2.5 rounded-full bg-accent text-background font-medium hover:bg-accent-strong transition-colors disabled:opacity-40">
            {busy ? t.loggingIn : t.login}
          </button>
        </form>
        <div className="text-sm text-muted mt-4 text-center">
          {t.noAccount}<Link href="/register" className="text-accent">{t.signUp}</Link>
        </div>
        <div className="mt-4 pt-4 border-t border-border text-xs text-muted space-y-1">
          <div className="font-medium text-foreground">{t.demoAccount}</div>
          <div>alice@carbonex.io / password123</div>
          <div>bob@carbonex.io / password123</div>
        </div>
      </div>
    </div>
  );
}

export function Input({ label, type, value, onChange, placeholder }: {
  label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required
        className="w-full mt-1 bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}

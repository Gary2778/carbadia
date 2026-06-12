"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/format";

export default function LoginPage() {
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
        <h1 className="text-lg font-bold mb-1">登录</h1>
        <p className="text-muted text-sm mb-5">登录后开始交易碳信用</p>
        <form onSubmit={submit} className="space-y-3">
          <Input label="邮箱" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <Input label="密码" type="password" value={password} onChange={setPassword} placeholder="••••••" />
          {err && <div className="text-down text-xs">{err}</div>}
          <button disabled={busy} className="w-full py-2.5 rounded-full bg-accent text-background font-medium hover:bg-accent-strong transition-colors disabled:opacity-40">
            {busy ? "登录中…" : "登录"}
          </button>
        </form>
        <div className="text-sm text-muted mt-4 text-center">
          还没有账号？<Link href="/register" className="text-accent">注册</Link>
        </div>
        <div className="mt-4 pt-4 border-t border-border text-xs text-muted space-y-1">
          <div className="font-medium text-foreground">演示账号</div>
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

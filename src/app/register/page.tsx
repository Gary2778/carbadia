"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { Input } from "../login/page";

export default function RegisterPage() {
  const t = useT("register");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await api("/api/auth/register", { method: "POST", body: JSON.stringify({ email, name, password }) });
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
          <Input label={t.nameLabel} type="text" value={name} onChange={setName} placeholder={t.namePlaceholder} />
          <Input label={t.emailLabel} type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <Input label={t.passwordLabel} type="password" value={password} onChange={setPassword} placeholder={t.passwordPlaceholder} />
          {err && <div className="text-down text-xs">{err}</div>}
          <button disabled={busy} className="w-full py-2.5 rounded-full bg-accent text-background font-medium hover:bg-accent-strong transition-colors disabled:opacity-40">
            {busy ? t.submitting : t.submit}
          </button>
        </form>
        <div className="text-sm text-muted mt-4 text-center">
          {t.haveAccount}<Link href="/login" className="text-accent">{t.login}</Link>
        </div>
      </div>
    </div>
  );
}

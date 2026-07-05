"use client";

import { useState } from "react";
import { useDict } from "@/i18n/I18nProvider";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormState = "idle" | "invalid" | "success" | "failed";

// M1:提交为本地 stub(localStorage);上线前接入真实后端(spec §6 占位清单)。
export function EmailForm() {
  const dict = useDict();
  const form = dict.scenes.camp.form!;
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");

  function submit() {
    if (!EMAIL_RE.test(email.trim())) {
      setState("invalid");
      return;
    }
    try {
      const key = "cocoeco-waitlist";
      const list: string[] = JSON.parse(localStorage.getItem(key) ?? "[]");
      list.push(email.trim());
      localStorage.setItem(key, JSON.stringify(list));
      setState("success");
    } catch {
      setState("failed");
    }
  }

  const message =
    state === "invalid" ? form.invalid :
    state === "success" ? form.success :
    state === "failed" ? form.failed : "";

  return (
    <div className="flex flex-col gap-2">
      <p>{form.pitch}</p>
      <div className="flex flex-wrap gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state !== "idle") setState("idle");
          }}
          placeholder={form.placeholder}
          className="min-w-0 flex-1 rounded-lg border border-[var(--card-border)] bg-[var(--card)]/60 px-4 py-2.5 placeholder:opacity-50 focus:border-[var(--accent)] focus:outline-none"
        />
        <button
          type="button"
          onClick={submit}
          className="rounded-lg border border-[var(--accent)] px-5 py-2.5 font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--bg)]"
        >
          {form.button}
        </button>
      </div>
      <p aria-live="polite" className="min-h-6 text-sm text-[var(--gold)]">
        {message}
      </p>
      <p className="text-sm opacity-60">{form.privacy}</p>
    </div>
  );
}

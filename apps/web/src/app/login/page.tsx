"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { enUS } from "../../messages/en-US";

export default function LoginPage() {
  const router = useRouter();
  const passwordRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    if (passwordRef.current) passwordRef.current.value = "";
    const email = String(form.get("email") ?? "");
    router.replace(email.toLowerCase().includes("ops") ? "/ops" : "/");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 p-6">
      <header>
        <p className="brand-name inline-block">{enUS.appName}</p>
        <p className="eyebrow mt-4">{enUS.loginMode}</p>
        <h1 className="mt-2 text-3xl font-semibold">{enUS.loginTitle}</h1>
        <p className="mt-2 text-liveos-muted">{enUS.loginDescription}</p>
      </header>
      <form onSubmit={handleSubmit} className="panel grid gap-4" aria-busy={pending}>
        <div className="grid gap-2">
          <label htmlFor="email">{enUS.loginEmail}</label>
          <input className="min-h-12 w-full rounded-md border border-[var(--color-border-strong)] bg-liveos-raised px-3 text-liveos-text outline-offset-2 focus-visible:outline-3 focus-visible:outline-[var(--color-focus)]" id="email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="grid gap-2">
          <label htmlFor="password">{enUS.loginPassword}</label>
          <input className="min-h-12 w-full rounded-md border border-[var(--color-border-strong)] bg-liveos-raised px-3 text-liveos-text outline-offset-2 focus-visible:outline-3 focus-visible:outline-[var(--color-focus)]" id="password" name="password" type="password" autoComplete="current-password" ref={passwordRef} required />
        </div>
        <button className="min-h-12 rounded-md bg-liveos-accent px-4 font-semibold text-[var(--color-primary-fg)] disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">{pending ? enUS.loginPending : enUS.loginSubmit}</button>
      </form>
    </main>
  );
}

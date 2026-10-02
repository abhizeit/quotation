"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { login } from "@/app/admin/actions";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div className="login-wrap">
      <form
        className="tag gate"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          const result = await login(new FormData(event.currentTarget));
          setPending(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.refresh();
        }}
      >
        <h2>Admin</h2>
        <p className="sub">Sign in to edit prices, page content, and saved quotations.</p>
        <label className="fld">
          <span>Email</span>
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label className="fld">
          <span>Password</span>
          <input name="password" type="password" autoComplete="current-password" required />
          <small>{error}</small>
        </label>
        <button className="btn block" type="submit" disabled={pending}>
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

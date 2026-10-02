"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAdmin, setAdminActive } from "@/app/admin/actions";
import type { AdminAccount } from "@/lib/admin-types";
import { SaveRow, TextField } from "./ui";

export function TeamPanel({ admins, currentId }: { admins: AdminAccount[]; currentId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="af">
      <h3>Team</h3>
      <p className="note">Admins can edit the quotation page and read saved quotes. The last active account stays on.</p>
      {admins.map((admin) => (
        <div className="srow" key={admin.id}>
          <div className="lead-r">
            <div>
              <b>{admin.email}</b>
              <small>
                {admin.id === currentId ? "You · " : ""}
                added {new Date(admin.createdAt).toLocaleDateString("en-IN")}
              </small>
            </div>
            <div />
            <button
              className="btn ghost small"
              type="button"
              onClick={() => {
                start(async () => {
                  const result = await setAdminActive(admin.id, !admin.active);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setError("");
                  router.refresh();
                });
              }}
            >
              {admin.active ? "Disable" : "Enable"}
            </button>
          </div>
        </div>
      ))}
      <h3 style={{ marginTop: 18 }}>Add an admin</h3>
      <div className="ag">
        <TextField label="Email" type="email" value={email} onChange={setEmail} />
        <TextField label="Password" type="password" value={password} onChange={setPassword} />
      </div>
      <SaveRow
        label="Add admin"
        pending={pending}
        error={error}
        onSave={() => {
          start(async () => {
            const result = await createAdmin({ email, password });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setEmail("");
            setPassword("");
            setError("");
            router.refresh();
          });
        }}
      />
    </div>
  );
}

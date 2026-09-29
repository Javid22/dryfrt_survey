"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setStatus("error");
      setMessage("Password must be at least 8 characters.");
      return;
    }
    setStatus("saving");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus("error");
      setMessage("Could not update password. Please try again.");
    } else {
      setStatus("success");
      setMessage("Password updated.");
      setPassword("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:max-w-sm">
      <Label htmlFor="new-password">New password</Label>
      <Input
        id="new-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="At least 8 characters"
      />
      {message && (
        <p className={status === "error" ? "text-sm text-red-600" : "text-sm text-emerald-600"}>
          {message}
        </p>
      )}
      <Button type="submit" disabled={status === "saving"} className="w-fit">
        {status === "saving" ? "Saving..." : "Update password"}
      </Button>
    </form>
  );
}

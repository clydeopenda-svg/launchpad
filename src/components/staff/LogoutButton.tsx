"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/staff/logout", { method: "POST" }).catch(() => {});
    router.replace("/");
  }

  return (
    <Button variant="secondary" onClick={handleLogout} loading={loading}>
      Log out
    </Button>
  );
}

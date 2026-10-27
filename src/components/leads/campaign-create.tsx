"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { campaignAction } from "@/features/opportunities/actions";
import { Button } from "@/components/ui/button";
export function CampaignCreate() {
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="panel mb-5 flex flex-wrap items-end gap-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const name = String(new FormData(e.currentTarget).get("name") ?? "");
        start(async () => {
          try {
            const result = await campaignAction(name);
            setMessage(
              result.error ??
                "Campaign available. Assign prospects using the opportunity form.",
            );
            router.refresh();
          } catch {
            setMessage("Could not create campaign. Retry.");
          }
        });
      }}
    >
      <div className="min-w-60 flex-1">
        <label htmlFor="campaign-name">Create campaign</label>
        <input
          id="campaign-name"
          name="name"
          maxLength={200}
          required
          defaultValue="US Small Business — AI Automation"
        />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        Create campaign
      </Button>
      {message && (
        <p role="status" className="w-full text-xs text-zinc-600">
          {message}
        </p>
      )}
    </form>
  );
}

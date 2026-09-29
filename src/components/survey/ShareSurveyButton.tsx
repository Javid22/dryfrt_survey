"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Generates a wa.me share link using window.location.origin at click time so
 * it always points at the current production URL (never hardcoded).
 */
export function ShareSurveyButton() {
  const [copied, setCopied] = useState(false);

  function handleShare() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const surveyUrl = `${origin}/survey`;
    const message =
      `Hi! I'm helping with a short customer research survey about how people buy dry fruits. ` +
      `It takes around 3–4 minutes. We'd really appreciate your honest opinion.\n\n${surveyUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "Dry Fruit Customer Research Survey", text: message, url: surveyUrl }).catch(() => {
        window.open(waUrl, "_blank", "noopener,noreferrer");
      });
    } else {
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="secondary" size="lg" onClick={handleShare} className="w-full sm:w-auto">
      <Share2 className="h-4 w-4" />
      {copied ? "Opening WhatsApp..." : "Share Survey"}
    </Button>
  );
}

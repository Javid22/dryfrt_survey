"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AREA_OPTIONS } from "@/config/surveyQuestions";

export type VoiceEntry = {
  submissionId: string;
  questionId: string;
  questionTitle: string;
  text: string;
  area: string | null;
  purchaseChannel: string | null;
  date: string;
};

const QUESTION_OPTIONS = [
  { value: "all", label: "All questions" },
  { value: "q4_likes_most", label: "What they like most" },
  { value: "q6_change_one_thing", label: "One thing they'd change" },
  { value: "q12_owner_suggestion", label: "If they owned the store" },
];

export function CustomerVoice({ entries }: { entries: VoiceEntry[] }) {
  const [area, setArea] = useState("All Areas");
  const [question, setQuestion] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (area !== "All Areas" && e.area !== area) return false;
      if (question !== "all" && e.questionId !== question) return false;
      if (search && !e.text.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [entries, area, question, search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={area} onValueChange={setArea}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AREA_OPTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={question} onValueChange={setQuestion}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUESTION_OPTIONS.map((q) => (
              <SelectItem key={q.value} value={q.value}>
                {q.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Search feedback..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
      </div>

      <p className="text-sm text-stone-500">{filtered.length} entries</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtered.map((e, idx) => (
          <Card key={`${e.submissionId}-${e.questionId}-${idx}`}>
            <CardContent className="flex flex-col gap-2 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                {e.questionTitle}
              </p>
              <p className="text-stone-800">&ldquo;{e.text}&rdquo;</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {e.area && <Badge variant="outline">{e.area}</Badge>}
                {e.purchaseChannel && <Badge variant="secondary">{e.purchaseChannel}</Badge>}
                <span className="text-xs text-stone-400">
                  {new Date(e.date).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-stone-500">No feedback matches these filters.</p>
        )}
      </div>
    </div>
  );
}

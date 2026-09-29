"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { AREA_OPTIONS } from "@/config/surveyQuestions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Area filter that updates the `area` search param, which server components
 * read to re-filter all dashboard metrics (spec section 16).
 */
export function AreaFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentArea = searchParams.get("area") ?? "All Areas";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "All Areas") {
      params.delete("area");
    } else {
      params.set("area", value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={currentArea} onValueChange={handleChange}>
      <SelectTrigger className="w-full sm:w-56">
        <SelectValue placeholder="All Areas" />
      </SelectTrigger>
      <SelectContent>
        {AREA_OPTIONS.map((area) => (
          <SelectItem key={area} value={area}>
            {area}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

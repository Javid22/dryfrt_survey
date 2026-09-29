import { createClient } from "@/lib/supabase/server";
import { SURVEY_VERSION } from "@/config/surveyQuestions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Settings</h1>
        <p className="text-stone-500">Basic application settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Signed in as {user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Survey</CardTitle>
          <CardDescription>Current survey configuration.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">Survey version</p>
            <p className="font-medium text-stone-800">{SURVEY_VERSION}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">Questions</p>
            <p className="font-medium text-stone-800">Edit src/config/surveyQuestions.ts</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

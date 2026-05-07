import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import AppShell from "@/components/layout/AppShell";
import BucketBoard from "@/components/tasks/BucketBoard";
import type { Profile } from "@/lib/types";

export default async function TasksPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profiles } = await supabase.from("profiles").select("*");

  return (
    <AppShell>
      <BucketBoard
        profiles={(profiles ?? []) as Profile[]}
        currentUserId={user.id}
      />
    </AppShell>
  );
}

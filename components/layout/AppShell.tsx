"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, CheckSquare, DollarSign, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/vendors", label: "Budget & Vendors", icon: DollarSign },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex h-full">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-stone-200 bg-white">
        <div className="px-6 py-5 border-b border-stone-100">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-widest">
            Wedding Planner
          </p>
          <p className="text-lg font-semibold mt-0.5" style={{ color: "var(--rose-dark)" }}>
            💍 Our Big Day
          </p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? "text-white"
                    : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
                }`}
                style={active ? { background: "var(--rose-dark)" } : {}}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-stone-100">
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-stone-400 hover:text-stone-600 hover:bg-stone-50 w-full transition-colors"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>

        {/* Bottom nav — mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex z-40">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center flex-1 py-3 gap-1 text-xs font-medium transition-colors ${
                  active ? "" : "text-stone-400"
                }`}
                style={active ? { color: "var(--rose-dark)" } : {}}
              >
                <Icon size={20} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

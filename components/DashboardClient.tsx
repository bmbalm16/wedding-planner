"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type { Task, Vendor, Budget } from "@/lib/types";
import { CheckSquare, Clock, AlertCircle, DollarSign } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import Link from "next/link";

function fmt(n: number | null) {
  if (n === null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function DashboardClient({ userId }: { userId: string }) {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [weddingDate, setWeddingDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: t }, { data: v }, { data: b }] = await Promise.all([
      supabase.from("tasks").select("*"),
      supabase.from("vendors").select("*"),
      supabase.from("budget").select("*").limit(1).maybeSingle(),
    ]);
    if (t) setTasks(t);
    if (v) setVendors(v);
    if (b) setBudget(b);
  }, [supabase]);

  useEffect(() => {
    load();
    const stored = localStorage.getItem("wedding_date");
    if (stored) setWeddingDate(stored);
  }, [load]);

  const todo = tasks.filter((t) => t.status === "todo").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const done = tasks.filter((t) => t.status === "done").length;
  const total = tasks.length;

  const committed = vendors.reduce((s, v) => s + (v.estimated_cost ?? 0), 0);
  const spent = vendors.reduce((s, v) => s + (v.actual_cost ?? 0), 0);
  const totalBudget = budget?.total_amount ?? 0;

  const daysUntil = weddingDate ? differenceInDays(new Date(weddingDate), new Date()) : null;

  const myTasks = tasks
    .filter((t) => t.assigned_to === userId && t.status !== "done")
    .sort((a, b) => (a.due_date ?? "z") < (b.due_date ?? "z") ? -1 : 1)
    .slice(0, 5);

  function saveWeddingDate(date: string) {
    localStorage.setItem("wedding_date", date);
    setWeddingDate(date);
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-800">Dashboard</h1>
          <p className="text-sm text-stone-400">Welcome back 💕</p>
        </div>
        {daysUntil !== null && daysUntil >= 0 ? (
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: "var(--rose-dark)" }}>{daysUntil}</p>
            <p className="text-xs text-stone-400">days to go</p>
          </div>
        ) : (
          <div>
            <label className="block text-xs text-stone-400 mb-1">Wedding date</label>
            <input
              type="date"
              onChange={(e) => saveWeddingDate(e.target.value)}
              className="border border-stone-200 rounded-xl px-2 py-1.5 text-xs"
            />
          </div>
        )}
      </div>

      {/* Task stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "To do", count: todo, icon: AlertCircle, color: "#f97316" },
          { label: "In progress", count: inProgress, icon: Clock, color: "#3b82f6" },
          { label: "Done", count: done, icon: CheckSquare, color: "#22c55e" },
        ].map(({ label, count, icon: Icon, color }) => (
          <Link
            key={label}
            href="/tasks"
            className="bg-white rounded-2xl border border-stone-100 p-4 flex flex-col gap-2 hover:border-stone-200 transition-colors"
          >
            <Icon size={16} style={{ color }} />
            <p className="text-xl font-bold text-stone-800">{count}</p>
            <p className="text-xs text-stone-400">{label}</p>
          </Link>
        ))}
      </div>

      {total > 0 && (
        <div>
          <div className="flex justify-between text-xs text-stone-400 mb-1">
            <span>Overall progress</span>
            <span>{Math.round((done / total) * 100)}%</span>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(done / total) * 100}%`, background: "#22c55e" }}
            />
          </div>
        </div>
      )}

      {/* Budget snapshot */}
      <Link href="/vendors" className="block bg-white rounded-2xl border border-stone-100 p-4 hover:border-stone-200 transition-colors">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={15} className="text-stone-400" />
          <span className="text-sm font-semibold text-stone-700">Budget</span>
        </div>
        {totalBudget > 0 ? (
          <div className="grid grid-cols-3 gap-3 text-sm">
            {[
              { label: "Budget", value: fmt(totalBudget) },
              { label: "Committed", value: fmt(committed) },
              { label: "Paid", value: fmt(spent) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-stone-400">{label}</p>
                <p className="font-semibold text-stone-700">{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-stone-400">Set your budget in Budget & Vendors →</p>
        )}
      </Link>

      {/* My tasks */}
      {myTasks.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-stone-700 mb-2">Your upcoming tasks</p>
          <div className="space-y-2">
            {myTasks.map((task) => (
              <Link
                key={task.id}
                href="/tasks"
                className="flex items-center justify-between bg-white rounded-xl border border-stone-100 px-3 py-2.5 hover:border-stone-200 transition-colors"
              >
                <span className="text-sm text-stone-700 truncate">{task.title}</span>
                {task.due_date && (
                  <span className="text-xs text-stone-400 shrink-0 ml-2">
                    {format(new Date(task.due_date), "MMM d")}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

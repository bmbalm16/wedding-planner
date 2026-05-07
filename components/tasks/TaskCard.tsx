"use client";

import { Calendar, User, MessageSquare } from "lucide-react";
import type { Task, Profile } from "@/lib/types";
import { format, isPast, isToday } from "date-fns";
import { createClient } from "@/lib/supabase";
import { useState, useEffect } from "react";

const STATUS_STYLES: Record<string, string> = {
  todo: "bg-stone-100 text-stone-500",
  in_progress: "bg-blue-50 text-blue-600",
  done: "bg-green-50 text-green-600",
};

const STATUS_LABELS: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

interface TaskCardProps {
  task: Task;
  profiles: Profile[];
  onClick: () => void;
}

export default function TaskCard({ task, profiles, onClick }: TaskCardProps) {
  const [commentCount, setCommentCount] = useState(0);
  const supabase = createClient();
  const assignee = profiles.find((p) => p.id === task.assigned_to);

  useEffect(() => {
    supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("task_id", task.id)
      .then(({ count }) => setCommentCount(count ?? 0));
  }, [task.id, supabase]);

  const dueDateStyle = task.due_date
    ? isToday(new Date(task.due_date))
      ? "text-amber-600"
      : isPast(new Date(task.due_date)) && task.status !== "done"
      ? "text-red-500"
      : "text-stone-400"
    : "";

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-stone-50 hover:bg-stone-100 border border-stone-100 rounded-xl px-3 py-2.5 transition-colors"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${task.status === "done" ? "line-through text-stone-400" : "text-stone-700"}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-2.5 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[task.status]}`}>
              {STATUS_LABELS[task.status]}
            </span>
            {task.due_date && (
              <span className={`flex items-center gap-1 text-xs ${dueDateStyle}`}>
                <Calendar size={11} />
                {format(new Date(task.due_date), "MMM d")}
              </span>
            )}
            {assignee && (
              <span className="flex items-center gap-1 text-xs text-stone-400">
                <User size={11} />
                {assignee.display_name}
              </span>
            )}
            {commentCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-stone-400">
                <MessageSquare size={11} />
                {commentCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

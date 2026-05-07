"use client";

import { useState, useEffect } from "react";
import { Trash2, Send } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { Task, Profile, Comment } from "@/lib/types";
import Modal from "@/components/ui/Modal";
import { format } from "date-fns";

interface TaskModalProps {
  task?: Task;
  bucketId: string;
  profiles: Profile[];
  currentUserId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function TaskModal({
  task,
  bucketId,
  profiles,
  currentUserId,
  onClose,
  onSaved,
}: TaskModalProps) {
  const supabase = createClient();
  const isNew = !task;

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to ?? "");
  const [status, setStatus] = useState(task?.status ?? "todo");
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!task) return;
    supabase
      .from("comments")
      .select("*")
      .eq("task_id", task.id)
      .order("created_at")
      .then(({ data }) => setComments(data ?? []));

    const channel = supabase
      .channel(`comments-${task.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `task_id=eq.${task.id}` },
        () => {
          supabase
            .from("comments")
            .select("*")
            .eq("task_id", task.id)
            .order("created_at")
            .then(({ data }) => setComments(data ?? []));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [task, supabase]);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    if (isNew) {
      await supabase.from("tasks").insert({
        bucket_id: bucketId,
        title: title.trim(),
        description: description || null,
        due_date: dueDate || null,
        assigned_to: assignedTo || null,
        status,
        position: 0,
      });
    } else {
      await supabase.from("tasks").update({
        title: title.trim(),
        description: description || null,
        due_date: dueDate || null,
        assigned_to: assignedTo || null,
        status,
        updated_at: new Date().toISOString(),
      }).eq("id", task!.id);
    }
    setSaving(false);
    onSaved();
  }

  async function deleteTask() {
    if (!task) return;
    await supabase.from("tasks").delete().eq("id", task.id);
    onSaved();
  }

  async function addComment() {
    if (!newComment.trim() || !task) return;
    await supabase.from("comments").insert({
      task_id: task.id,
      user_id: currentUserId,
      content: newComment.trim(),
    });
    setNewComment("");
  }

  const authorName = (userId: string) =>
    profiles.find((p) => p.id === userId)?.display_name ?? "Unknown";

  return (
    <Modal title={isNew ? "New task" : "Edit task"} onClose={onClose} wide>
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Title *</label>
          <input
            autoFocus={isNew}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Details</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any notes or details…"
            rows={3}
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm resize-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Task["status"])}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-white"
            >
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm"
            />
          </div>

          {/* Assigned to */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Assigned to</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm bg-white"
            >
              <option value="">Unassigned</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.display_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Comments — only on existing tasks */}
        {!isNew && (
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-2">Comments</label>
            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="bg-stone-50 rounded-xl px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-stone-600">{authorName(c.user_id)}</span>
                    <span className="text-xs text-stone-400">{format(new Date(c.created_at), "MMM d, h:mm a")}</span>
                  </div>
                  <p className="text-sm text-stone-700">{c.content}</p>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-xs text-stone-400">No comments yet</p>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addComment()}
                placeholder="Add a comment…"
                className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm"
              />
              <button
                onClick={addComment}
                className="px-3 py-2 rounded-xl text-white transition-colors"
                style={{ background: "var(--rose-dark)" }}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
          {!isNew ? (
            <button
              onClick={deleteTask}
              className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-600 transition-colors"
            >
              <Trash2 size={14} />
              Delete task
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-stone-500 hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || !title.trim()}
              className="px-4 py-2 rounded-xl text-sm text-white transition-colors disabled:opacity-50"
              style={{ background: "var(--rose-dark)" }}
            >
              {isNew ? "Create task" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, MoreHorizontal, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { Bucket, Task, Profile } from "@/lib/types";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";
import Modal from "@/components/ui/Modal";

const BUCKET_COLORS = [
  "#e8a0a0", "#a0c4e8", "#a0e8b4", "#e8d4a0",
  "#c4a0e8", "#e8a0d4", "#a0e8e0", "#e8c4a0",
];

interface BucketBoardProps {
  profiles: Profile[];
  currentUserId: string;
}

export default function BucketBoard({ profiles, currentUserId }: BucketBoardProps) {
  const supabase = createClient();
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [addingToBucket, setAddingToBucket] = useState<string | null>(null);
  const [showNewBucket, setShowNewBucket] = useState(false);
  const [newBucketName, setNewBucketName] = useState("");
  const [bucketMenuOpen, setBucketMenuOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: b }, { data: t }] = await Promise.all([
      supabase.from("buckets").select("*").order("position"),
      supabase.from("tasks").select("*").order("position"),
    ]);
    if (b) setBuckets(b);
    if (t) setTasks(t);
  }, [supabase]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel("realtime-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "buckets" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load, supabase]);

  async function addBucket() {
    if (!newBucketName.trim()) return;
    const color = BUCKET_COLORS[buckets.length % BUCKET_COLORS.length];
    await supabase.from("buckets").insert({
      name: newBucketName.trim(),
      color,
      position: buckets.length,
    });
    setNewBucketName("");
    setShowNewBucket(false);
  }

  async function deleteBucket(id: string) {
    await supabase.from("buckets").delete().eq("id", id);
    setBucketMenuOpen(null);
  }

  const tasksByBucket = (bucketId: string) =>
    tasks.filter((t) => t.bucket_id === bucketId);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-800">Tasks</h1>
        <button
          onClick={() => setShowNewBucket(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ background: "var(--rose-dark)" }}
        >
          <Plus size={15} />
          New bucket
        </button>
      </div>

      <div className="space-y-3">
        {buckets.map((bucket) => {
          const bucketTasks = tasksByBucket(bucket.id);
          const isCollapsed = collapsed[bucket.id];
          const done = bucketTasks.filter((t) => t.status === "done").length;

          return (
            <div key={bucket.id} className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
              {/* Bucket header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: bucket.color }} />
                <button
                  className="flex items-center gap-1.5 flex-1 text-left font-semibold text-stone-700 text-sm"
                  onClick={() => setCollapsed((c) => ({ ...c, [bucket.id]: !c[bucket.id] }))}
                >
                  {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  {bucket.name}
                  <span className="ml-1.5 text-xs font-normal text-stone-400">
                    {done}/{bucketTasks.length}
                  </span>
                </button>

                <button
                  onClick={() => setAddingToBucket(bucket.id)}
                  className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <Plus size={15} />
                </button>

                <div className="relative">
                  <button
                    onClick={() => setBucketMenuOpen(bucketMenuOpen === bucket.id ? null : bucket.id)}
                    className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
                  >
                    <MoreHorizontal size={15} />
                  </button>
                  {bucketMenuOpen === bucket.id && (
                    <div className="absolute right-0 top-8 bg-white border border-stone-200 rounded-xl shadow-lg z-10 py-1 w-40">
                      <button
                        onClick={() => deleteBucket(bucket.id)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />
                        Delete bucket
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Tasks */}
              {!isCollapsed && (
                <div className="px-3 pb-3 space-y-2">
                  {bucketTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      profiles={profiles}
                      onClick={() => setSelectedTask(task)}
                    />
                  ))}
                  {bucketTasks.length === 0 && (
                    <p className="text-xs text-stone-400 px-2 py-1">No tasks yet</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {buckets.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            <p className="text-sm">No buckets yet. Create one to get started.</p>
          </div>
        )}
      </div>

      {/* New bucket modal */}
      {showNewBucket && (
        <Modal title="New bucket" onClose={() => setShowNewBucket(false)}>
          <div className="space-y-4">
            <input
              autoFocus
              type="text"
              placeholder="e.g. Venue, Catering, Flowers…"
              value={newBucketName}
              onChange={(e) => setNewBucketName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addBucket()}
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowNewBucket(false)}
                className="px-4 py-2 rounded-xl text-sm text-stone-500 hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addBucket}
                className="px-4 py-2 rounded-xl text-sm text-white transition-colors"
                style={{ background: "var(--rose-dark)" }}
              >
                Create
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add task modal */}
      {addingToBucket && (
        <TaskModal
          bucketId={addingToBucket}
          profiles={profiles}
          currentUserId={currentUserId}
          onClose={() => setAddingToBucket(null)}
          onSaved={() => { setAddingToBucket(null); load(); }}
        />
      )}

      {/* Edit task modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          bucketId={selectedTask.bucket_id}
          profiles={profiles}
          currentUserId={currentUserId}
          onClose={() => setSelectedTask(null)}
          onSaved={() => { setSelectedTask(null); load(); }}
        />
      )}
    </div>
  );
}

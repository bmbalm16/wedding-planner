"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, CheckCircle2, Circle, DollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { Vendor, Budget } from "@/lib/types";
import Modal from "@/components/ui/Modal";

function fmt(n: number | null) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function VendorList() {
  const supabase = createClient();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  const load = useCallback(async () => {
    const [{ data: v }, { data: b }] = await Promise.all([
      supabase.from("vendors").select("*").order("created_at"),
      supabase.from("budget").select("*").limit(1).maybeSingle(),
    ]);
    if (v) setVendors(v);
    if (b) setBudget(b);
  }, [supabase]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("realtime-vendors")
      .on("postgres_changes", { event: "*", schema: "public", table: "vendors" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "budget" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, supabase]);

  async function saveBudget() {
    const amount = parseFloat(budgetInput.replace(/[^0-9.]/g, ""));
    if (isNaN(amount)) return;
    if (budget) {
      await supabase.from("budget").update({ total_amount: amount, updated_at: new Date().toISOString() }).eq("id", budget.id);
    } else {
      await supabase.from("budget").insert({ total_amount: amount });
    }
    setEditingBudget(false);
  }

  async function togglePaid(vendor: Vendor) {
    await supabase.from("vendors").update({ paid: !vendor.paid, updated_at: new Date().toISOString() }).eq("id", vendor.id);
  }

  async function deleteVendor(id: string) {
    await supabase.from("vendors").delete().eq("id", id);
  }

  const totalBudget = budget?.total_amount ?? 0;
  const committed = vendors.reduce((s, v) => s + (v.estimated_cost ?? 0), 0);
  const spent = vendors.reduce((s, v) => s + (v.actual_cost ?? 0), 0);
  const remaining = totalBudget - committed;
  const spentPct = totalBudget > 0 ? Math.min((spent / totalBudget) * 100, 100) : 0;
  const committedPct = totalBudget > 0 ? Math.min((committed / totalBudget) * 100, 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-800">Budget & Vendors</h1>
        <button
          onClick={() => setAddingNew(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ background: "var(--rose-dark)" }}
        >
          <Plus size={15} />
          Add vendor
        </button>
      </div>

      {/* Budget summary */}
      <div className="bg-white rounded-2xl border border-stone-100 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-stone-400" />
            <span className="font-semibold text-stone-700 text-sm">Budget overview</span>
          </div>
          <button
            onClick={() => { setBudgetInput(String(totalBudget)); setEditingBudget(true); }}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors underline"
          >
            {budget ? "Edit budget" : "Set budget"}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total budget", value: fmt(totalBudget), color: "text-stone-700" },
            { label: "Committed", value: fmt(committed), color: remaining < 0 ? "text-red-500" : "text-stone-700" },
            { label: "Paid", value: fmt(spent), color: "text-green-600" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-xs text-stone-400">{label}</p>
              <p className={`text-lg font-semibold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {totalBudget > 0 && (
          <div>
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full relative"
                style={{ width: `${committedPct}%`, background: remaining < 0 ? "#ef4444" : "#e8a0a0" }}
              >
                <div
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{ width: `${(spentPct / committedPct) * 100}%`, background: "#22c55e" }}
                />
              </div>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-stone-400">{committedPct.toFixed(0)}% committed</span>
              {remaining < 0 && (
                <span className="text-xs text-red-500">{fmt(Math.abs(remaining))} over budget</span>
              )}
              {remaining >= 0 && (
                <span className="text-xs text-stone-400">{fmt(remaining)} remaining</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Vendor list */}
      <div className="space-y-2">
        {vendors.map((vendor) => (
          <div
            key={vendor.id}
            className="bg-white rounded-2xl border border-stone-100 px-4 py-3 flex items-start gap-3"
          >
            <button
              onClick={() => togglePaid(vendor)}
              className="mt-0.5 shrink-0 transition-colors"
              style={{ color: vendor.paid ? "var(--sage)" : "#d1d5db" }}
            >
              {vendor.paid ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-stone-700">{vendor.name}</p>
                  {vendor.category && (
                    <p className="text-xs text-stone-400">{vendor.category}</p>
                  )}
                  {vendor.contact_info && (
                    <p className="text-xs text-stone-400 mt-0.5">{vendor.contact_info}</p>
                  )}
                  {vendor.notes && (
                    <p className="text-xs text-stone-500 mt-1">{vendor.notes}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {vendor.actual_cost !== null && (
                    <p className="text-sm font-semibold text-stone-700">{fmt(vendor.actual_cost)}</p>
                  )}
                  {vendor.estimated_cost !== null && vendor.actual_cost === null && (
                    <p className="text-sm text-stone-400">est. {fmt(vendor.estimated_cost)}</p>
                  )}
                  {vendor.actual_cost !== null && vendor.estimated_cost !== null && (
                    <p className="text-xs text-stone-400">est. {fmt(vendor.estimated_cost)}</p>
                  )}
                  {vendor.paid && (
                    <span className="text-xs text-green-600 font-medium">Paid</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => setEditingVendor(vendor)}
                className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => deleteVendor(vendor.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}

        {vendors.length === 0 && (
          <div className="text-center py-12 text-stone-400">
            <p className="text-sm">No vendors yet. Add one to start tracking costs.</p>
          </div>
        )}
      </div>

      {/* Budget modal */}
      {editingBudget && (
        <Modal title="Set total budget" onClose={() => setEditingBudget(false)}>
          <div className="space-y-4">
            <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden">
              <span className="px-3 text-stone-400 bg-stone-50 border-r border-stone-200 py-2.5 text-sm">$</span>
              <input
                autoFocus
                type="number"
                placeholder="0"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveBudget()}
                className="flex-1 px-3 py-2.5 text-sm"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditingBudget(false)} className="px-4 py-2 rounded-xl text-sm text-stone-500 hover:bg-stone-100 transition-colors">Cancel</button>
              <button onClick={saveBudget} className="px-4 py-2 rounded-xl text-sm text-white" style={{ background: "var(--rose-dark)" }}>Save</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Vendor modal */}
      {(addingNew || editingVendor) && (
        <VendorModal
          vendor={editingVendor ?? undefined}
          onClose={() => { setAddingNew(false); setEditingVendor(null); }}
          onSaved={() => { setAddingNew(false); setEditingVendor(null); load(); }}
        />
      )}
    </div>
  );
}

function VendorModal({
  vendor,
  onClose,
  onSaved,
}: {
  vendor?: Vendor;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState(vendor?.name ?? "");
  const [category, setCategory] = useState(vendor?.category ?? "");
  const [contactInfo, setContactInfo] = useState(vendor?.contact_info ?? "");
  const [notes, setNotes] = useState(vendor?.notes ?? "");
  const [estimatedCost, setEstimatedCost] = useState(vendor?.estimated_cost !== null && vendor?.estimated_cost !== undefined ? String(vendor.estimated_cost) : "");
  const [actualCost, setActualCost] = useState(vendor?.actual_cost !== null && vendor?.actual_cost !== undefined ? String(vendor.actual_cost) : "");
  const [paid, setPaid] = useState(vendor?.paid ?? false);

  async function save() {
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      category: category || null,
      contact_info: contactInfo || null,
      notes: notes || null,
      estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
      actual_cost: actualCost ? parseFloat(actualCost) : null,
      paid,
    };
    if (vendor) {
      await supabase.from("vendors").update({ ...data, updated_at: new Date().toISOString() }).eq("id", vendor.id);
    } else {
      await supabase.from("vendors").insert(data);
    }
    onSaved();
  }

  return (
    <Modal title={vendor ? "Edit vendor" : "Add vendor"} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Name *</label>
          <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. The Grand Venue" className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Category</label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Venue, Florist…" className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Contact info</label>
            <input type="text" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} placeholder="Phone or email" className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Estimated cost ($)</label>
            <input type="number" value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} placeholder="0" className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Actual cost ($)</label>
            <input type="number" value={actualCost} onChange={(e) => setActualCost(e.target.value)} placeholder="0" className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any notes…" className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm resize-none" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="rounded" />
          <span className="text-sm text-stone-600">Paid</span>
        </label>
        <div className="flex gap-2 justify-end pt-2 border-t border-stone-100">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-stone-500 hover:bg-stone-100 transition-colors">Cancel</button>
          <button onClick={save} disabled={!name.trim()} className="px-4 py-2 rounded-xl text-sm text-white disabled:opacity-50" style={{ background: "var(--rose-dark)" }}>
            {vendor ? "Save" : "Add vendor"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

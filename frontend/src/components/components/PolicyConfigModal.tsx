import React, { useState, useEffect } from 'react';
import { X, Sliders, Check } from 'lucide-react';
import { PolicyConfig } from '../types';
import { updatePolicyConfig } from '../api';

interface PolicyConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: PolicyConfig | null;
  onPolicyUpdated: (p: PolicyConfig) => void;
}

export const PolicyConfigModal: React.FC<PolicyConfigModalProps> = ({
  isOpen,
  onClose,
  policy,
  onPolicyUpdated
}) => {
  const [form, setForm] = useState<PolicyConfig>({
    max_discount_pct: 7.5,
    max_discount_flat_inr: 5000,
    max_split_installments: 3,
    min_upfront_pct: 25,
    max_grace_days: 14,
    allow_ptp: true,
    enforce_trai_hours: true,
    max_contact_velocity: 3,
    cool_off_hours: 48
  });
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (policy) setForm(policy);
  }, [policy]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updatePolicyConfig(form);
      onPolicyUpdated(updated);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 800);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-xl bg-[#0D1527] border border-slate-800 shadow-xl p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Merchant Recovery Policy & Guardrails</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          {/* Discount Cap */}
          <div className="space-y-1">
            <div className="flex justify-between font-medium text-slate-300">
              <span>Max Settlement Goodwill Discount Cap:</span>
              <span className="text-blue-400 font-bold">{form.max_discount_pct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={form.max_discount_pct}
              onChange={(e) => setForm({ ...form, max_discount_pct: parseFloat(e.target.value) })}
              className="w-full accent-blue-500"
            />
            <p className="text-[10px] text-slate-400">Agent cannot grant any settlement credit above this threshold.</p>
          </div>

          {/* Max Splits */}
          <div className="space-y-1">
            <div className="flex justify-between font-medium text-slate-300">
              <span>Max Installment Splits:</span>
              <span className="text-blue-400 font-bold">{form.max_split_installments} Tranches</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={form.max_split_installments}
              onChange={(e) => setForm({ ...form, max_split_installments: parseInt(e.target.value) })}
              className="w-full accent-blue-500"
            />
          </div>

          {/* Min Upfront % */}
          <div className="space-y-1">
            <div className="flex justify-between font-medium text-slate-300">
              <span>Minimum Upfront Payment %:</span>
              <span className="text-blue-400 font-bold">{form.min_upfront_pct}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              step="5"
              value={form.min_upfront_pct}
              onChange={(e) => setForm({ ...form, min_upfront_pct: parseInt(e.target.value) })}
              className="w-full accent-blue-500"
            />
          </div>

          {/* TRAI Window Toggle */}
          <div className="flex items-center justify-between p-2.5 bg-[#090F1C] rounded-lg border border-slate-800">
            <div>
              <span className="font-medium text-slate-200 block">Enforce TRAI 9 AM - 8 PM IST Window</span>
              <span className="text-[10px] text-slate-400">Block automated outreach outside permissible hours</span>
            </div>
            <input
              type="checkbox"
              checked={form.enforce_trai_hours}
              onChange={(e) => setForm({ ...form, enforce_trai_hours: e.target.checked })}
              className="w-4 h-4 accent-blue-600 rounded"
            />
          </div>

          {/* Velocity Cap */}
          <div className="flex items-center justify-between p-2.5 bg-[#090F1C] rounded-lg border border-slate-800">
            <div>
              <span className="font-medium text-slate-200 block">Max Contact Velocity</span>
              <span className="text-[10px] text-slate-400">Maximum 3 outreach attempts per customer in 7 days</span>
            </div>
            <span className="text-xs font-semibold text-blue-300">{form.max_contact_velocity} Attempts</span>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center gap-1 shadow-sm"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </>
            ) : (
              <span>Save Policy Rules</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

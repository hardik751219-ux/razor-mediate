import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Phone, Send, CheckCheck, ExternalLink,
  RefreshCw, CheckCircle2, Sliders, Copy, ArrowRight,
  Package, Cloud, Server, ShieldCheck, AlertCircle
} from 'lucide-react';
import { sendChatMessage, triageTransaction } from '../api';
import { RestructurePlan, PTPCommitment, PolicyConfig, RCADiagnosis } from '../types';

interface Scenario {
  id: string;
  title: string;
  categoryTag: string;
  customerName: string;
  phone: string;
  email: string;
  amount: number;
  invoiceId: string;
  dueDate: string;
  errorCode: string;
  errorDesc: string;
  iconType: 'package' | 'cloud' | 'server' | 'shield';
}

const PRESET_SCENARIOS: Scenario[] = [
  {
    id: 'b2b_dispute',
    title: 'B2B Partial Delivery Dispute',
    categoryTag: 'MICRO_DISPUTE',
    customerName: 'Vikram Logistics Hub',
    phone: '+91 98234 56789',
    email: 'vikram@logistics.in',
    amount: 65000,
    invoiceId: 'INV-2026-9042',
    dueDate: '2026-09-05',
    errorCode: 'DISPUTE_RAISED',
    errorDesc: 'Unresolved invoice dispute flag recorded on ledger. Specific defect pending customer statement.',
    iconType: 'package'
  },
  {
    id: 'saas_cashflow',
    title: 'SaaS Renewal Cashflow Crunch',
    categoryTag: 'LIQUIDITY_CRUNCH',
    customerName: 'Ananya Iyer (DesignPro)',
    phone: '+91 97654 32109',
    email: 'ananya@designpro.in',
    amount: 28000,
    invoiceId: 'INV-2026-7811',
    dueDate: '2026-09-08',
    errorCode: 'INSUFFICIENT_FUNDS',
    errorDesc: 'Issuer declined: card balance limit reached during recurring billing.',
    iconType: 'cloud'
  },
  {
    id: 'gateway_timeout',
    title: 'Bank Switch 504 Timeout',
    categoryTag: 'TECH_OUTAGE',
    customerName: 'Rajesh Gupta',
    phone: '+91 99887 76655',
    email: 'rajesh@guptatech.in',
    amount: 4500,
    invoiceId: 'INV-2026-3391',
    dueDate: '2026-09-02',
    errorCode: 'GATEWAY_TIMEOUT',
    errorDesc: 'HDFC core switch timed out during OTP verification telemetry.',
    iconType: 'server'
  },
  {
    id: 'distress_emergency',
    title: 'Emergency Stopping Rule Test',
    categoryTag: 'DISTRESS_STOPPING_RULE',
    customerName: 'Siddharth Rao',
    phone: '+91 98345 67890',
    email: 'sid@raoenterprises.in',
    amount: 45000,
    invoiceId: 'INV-2026-1188',
    dueDate: '2026-09-10',
    errorCode: 'PAYMENT_PENDING',
    errorDesc: 'Overdue commercial receivable. Telemetry awaiting customer response.',
    iconType: 'shield'
  }
];

interface LiveMediationStudioProps {
  onOpenPolicyModal?: () => void;
  policy?: PolicyConfig | null;
}

export const LiveMediationStudio: React.FC<LiveMediationStudioProps> = ({
  onOpenPolicyModal,
  policy
}) => {
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(PRESET_SCENARIOS[2]);
  const [channel, setChannel] = useState<'WHATSAPP' | 'VOICE'>('WHATSAPP');
  const [copiedInvoice, setCopiedInvoice] = useState(false);

  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'agent'; text: string; time: string }>>([
    {
      sender: 'agent',
      text: `Hello ${PRESET_SCENARIOS[2].customerName}, this is the billing desk regarding invoice ${PRESET_SCENARIOS[2].invoiceId} of ₹${PRESET_SCENARIOS[2].amount.toLocaleString('en-IN')}. How can we assist you with this balance today?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [rcaLoading, setRcaLoading] = useState(false);

  const [restructurePlan, setRestructurePlan] = useState<RestructurePlan | null>(null);
  const [ptpContract, setPtpContract] = useState<PTPCommitment | null>(null);
  const [isEscalated, setIsEscalated] = useState(false);
  const [simulatedPaid, setSimulatedPaid] = useState(false);

  // Live RCA populated dynamically from backend
  const [liveRca, setLiveRca] = useState<{
    failure_category: string;
    confidence_pct: number;
    root_cause_explanation: string;
    recommended_action: string;
    tags: string[];
    is_verified: boolean;
  } | null>(null);

  // Run backend diagnosis on scenario telemetry
  const runLiveTriage = async (scenario: Scenario) => {
    setRcaLoading(true);
    try {
      const diag: RCADiagnosis = await triageTransaction({
        id: `txn_${scenario.id}`,
        invoice_id: scenario.invoiceId,
        customer_name: scenario.customerName,
        customer_phone: scenario.phone,
        customer_email: scenario.email,
        original_amount: scenario.amount,
        error_code: scenario.errorCode,
        error_description: scenario.errorDesc
      });

      setLiveRca({
        failure_category: diag.failure_category,
        confidence_pct: Math.round((diag.confidence || 0) * 100),
        root_cause_explanation: diag.root_cause_explanation,
        recommended_action: diag.recommended_action,
        tags: diag.tags || [],
        is_verified: diag.failure_category === 'TECH_OUTAGE'
      });
    } catch (err) {
      console.error('Failed to run backend triage:', err);
    } finally {
      setRcaLoading(false);
    }
  };

  useEffect(() => {
    runLiveTriage(selectedScenario);
  }, []);

  const handleScenarioChange = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setInputText('');
    setSimulatedPaid(false);
    setIsEscalated(false);
    setPtpContract(null);
    setRestructurePlan(null);

    setMessages([
      {
        sender: 'agent',
        text: `Hello ${scenario.customerName}, this is the billing desk regarding invoice ${scenario.invoiceId} of ₹${scenario.amount.toLocaleString('en-IN')}. How can we assist you with this balance today?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    runLiveTriage(scenario);
  };

  const handleCopyInvoice = () => {
    navigator.clipboard.writeText(selectedScenario.invoiceId);
    setCopiedInvoice(true);
    setTimeout(() => setCopiedInvoice(false), 1500);
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim()) return;

    const userMsg = {
      sender: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await sendChatMessage({
        transaction_id: `txn_${selectedScenario.id}`,
        customer_name: selectedScenario.customerName,
        customer_phone: selectedScenario.phone,
        customer_email: selectedScenario.email,
        original_amount: selectedScenario.amount,
        invoice_id: selectedScenario.invoiceId,
        error_code: selectedScenario.errorCode,
        error_description: selectedScenario.errorDesc,
        user_message: textToSend,
        channel: channel
      });

      const agentMsg = {
        sender: 'agent' as const,
        text: res.agent_response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, agentMsg]);

      // Update RCA live from conversational diagnosis
      if (res.rca) {
        setLiveRca({
          failure_category: res.rca.failure_category,
          confidence_pct: res.rca.confidence_pct || Math.round(res.rca.confidence * 100),
          root_cause_explanation: res.rca.root_cause_explanation,
          recommended_action: res.rca.recommended_action,
          tags: res.rca.tags || [],
          is_verified: true
        });
      }
      if (res.restructure_plan) {
        setRestructurePlan(res.restructure_plan);
      }
      if (res.ptp) {
        setPtpContract(res.ptp);
      }
      if (res.escalated) {
        setIsEscalated(true);
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* ================= LEFT COLUMN: 1. Select Failure Context -> 2. Channels/Controls -> 3. Customer Conversation ================= */}
      <div className="lg:col-span-7 flex flex-col gap-4">

        {/* 1. TOP: Select Invoice Failure Context */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-400">Select Invoice Failure Context</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {PRESET_SCENARIOS.map((sc) => {
              const isSelected = selectedScenario.id === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => handleScenarioChange(sc)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between h-[85px] ${
                    isSelected
                      ? 'bg-[#0E1E38] border-blue-500 ring-1 ring-blue-500 text-white'
                      : 'bg-[#0B1322] border-[#162238] hover:bg-[#101A2C] text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {sc.iconType === 'package' && <Package className="w-4 h-4 text-slate-400" />}
                    {sc.iconType === 'cloud' && <Cloud className="w-4 h-4 text-slate-400" />}
                    {sc.iconType === 'server' && <Server className="w-4 h-4 text-blue-400" />}
                    {sc.iconType === 'shield' && <ShieldCheck className="w-4 h-4 text-slate-400" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold line-clamp-1 leading-tight">{sc.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">₹{sc.amount.toLocaleString('en-IN')}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. MIDDLE: Channels / Controls */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-400">Channels / Controls</div>
          <div className="flex items-center gap-2">
            {onOpenPolicyModal && (
              <button
                onClick={onOpenPolicyModal}
                className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl bg-[#0B1322] hover:bg-[#101A2C] text-slate-200 border border-[#162238] transition shadow-xs"
              >
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Policy Rules ({policy?.max_discount_pct ?? 15}% Max Cap)</span>
              </button>
            )}

            <button
              onClick={() => setChannel('WHATSAPP')}
              className={`p-2.5 rounded-xl border transition ${
                channel === 'WHATSAPP'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                  : 'bg-[#0B1322] border-[#162238] text-slate-400 hover:text-white'
              }`}
              title="WhatsApp Channel"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChannel('VOICE')}
              className={`p-2.5 rounded-xl border transition ${
                channel === 'VOICE'
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                  : 'bg-[#0B1322] border-[#162238] text-slate-400 hover:text-white'
              }`}
              title="Voice Call Channel"
            >
              <Phone className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3. BOTTOM: Customer Conversation Card */}
        <div className="p-4 rounded-2xl bg-[#0B1322] border border-[#162238] flex flex-col h-[500px] shadow-sm">
          <div className="text-xs font-semibold text-slate-400 mb-2.5">Customer Conversation</div>

          {/* Customer Header inside the card */}
          <div className="px-3.5 py-2.5 rounded-xl bg-[#0E182A] border border-[#1A2740] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase">
                {selectedScenario.customerName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <span>{selectedScenario.customerName}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="text-[10px] text-emerald-400 font-normal">Official Business</span>
                </div>
                <div className="text-[11px] text-slate-400">Invoice {selectedScenario.invoiceId}</div>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-xs font-bold text-white">
                <span>₹{selectedScenario.amount.toLocaleString('en-IN')}</span>
                <button
                  onClick={handleCopyInvoice}
                  title="Copy Invoice ID"
                  className="text-slate-400 hover:text-white transition"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <div className="text-[10px] text-slate-400">
                {copiedInvoice ? <span className="text-emerald-400">Copied!</span> : `Due: ${selectedScenario.dueDate}`}
              </div>
            </div>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 my-3 overflow-y-auto space-y-2.5 pr-1">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2 text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-[#005C4B] text-[#E9EDEF]'
                      : 'bg-[#131F33] text-slate-200 border border-[#1C2C47]'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                    <span>{m.time}</span>
                    {m.sender === 'user' && <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB]" />}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#131F33] p-2.5 rounded-xl max-w-fit border border-[#1C2C47]">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                <span>Running real-time RCA & bounded policy evaluation...</span>
              </div>
            )}
          </div>

          {/* Test Scenarios Chips */}
          <div className="pt-2 pb-2.5 border-t border-[#162238] flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0">Test Scenarios:</span>
            <button
              onClick={() => handleSendMessage("Bhai shipment mein 2 cartons damaged the, invoice adjust karo")}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-[#0C1E38] hover:bg-[#122A4E] text-blue-300 border border-blue-900/60 shrink-0 transition"
            >
              Damaged cartons (5% credit test)
            </button>
            <button
              onClick={() => handleSendMessage("Can I pay 40% today and the remaining balance next Friday?")}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-[#0C1E38] hover:bg-[#122A4E] text-blue-300 border border-blue-900/60 shrink-0 transition"
            >
              Request 2-part split plan
            </button>
            <button
              onClick={() => handleSendMessage("Main hospital mein hu family emergency hai, call mat karo abhi")}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-[#2A1218] hover:bg-[#3D1A22] text-rose-300 border border-rose-900/60 shrink-0 transition"
            >
              Hospital emergency Auto-Stop
            </button>
          </div>

          {/* Chat Input Bar */}
          <div className="p-1 rounded-xl bg-[#0E182A] border border-[#1A2740] flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type customer reply or claim to diagnose..."
              className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !inputText.trim()}
              className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition flex items-center justify-center shrink-0 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ================= RIGHT COLUMN: 1. Failure Diagnostics (RCA) -> 2. Restructured Settlement ================= */}
      <div className="lg:col-span-5 flex flex-col gap-4">

        {/* Card 1: Failure Diagnostics (RCA) - Real dynamic backend diagnosis on TOP */}
        <div className="p-4 rounded-2xl bg-[#0B1322] border border-[#162238] space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Failure Diagnostics (RCA)</span>
            {rcaLoading ? (
              <span className="text-[11px] text-blue-400 font-medium flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Diagnosing...
              </span>
            ) : liveRca?.is_verified ? (
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Verified by Telemetry & Dialogue
              </span>
            ) : (
              <span className="text-[11px] text-amber-400 font-medium">
                Preliminary Telemetry (Awaiting Dialogue)
              </span>
            )}
          </div>

          {/* Root Cause block */}
          {liveRca ? (
            <div className="space-y-0.5">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Root Cause</div>
              <div className="text-xs font-bold text-white capitalize">
                {liveRca.failure_category.replace(/_/g, ' ').toLowerCase()}
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                {liveRca.root_cause_explanation}
              </p>
            </div>
          ) : (
            <div className="p-3 text-center rounded-xl bg-[#0E182A] border border-[#1A2740] text-slate-400 text-xs">
              <AlertCircle className="w-4 h-4 mx-auto mb-1 text-slate-500" />
              <span>Analyzing incoming telemetry...</span>
            </div>
          )}

          {/* Classified Category & Raw Error Code (2 columns) */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Classified Category</span>
              <div className="px-2.5 py-1.5 rounded-lg bg-[#2B173E] text-purple-300 border border-purple-800/60 font-mono text-[11px] font-medium text-center truncate">
                {liveRca ? liveRca.failure_category : selectedScenario.categoryTag}
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Raw Error Code</span>
              <div className="px-2.5 py-1.5 rounded-lg bg-[#381519] text-rose-300 border border-rose-800/60 font-mono text-[11px] font-medium text-center truncate">
                {selectedScenario.errorCode}
              </div>
            </div>
          </div>

          {/* Footer: Diagnostic Status & Confidence */}
          <div className="pt-2 border-t border-[#162238] flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              {liveRca?.is_verified ? 'Status: Confirmed' : 'Status: Inconclusive (Awaiting Statement)'}
            </span>
            <span className={`font-semibold ${
              (liveRca?.confidence_pct || 0) >= 95 ? 'text-emerald-400' : (liveRca?.confidence_pct || 0) >= 85 ? 'text-blue-400' : 'text-amber-400'
            }`}>
              Confidence: {liveRca ? `${liveRca.confidence_pct}%` : 'Evaluating...'}
            </span>
          </div>
        </div>

        {/* Card 2: Restructured Settlement (BELOW RCA) */}
        <div className="p-4 rounded-2xl bg-[#0B1322] border border-[#162238] space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Restructured Settlement</span>
            <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
              <span>{restructurePlan ? 'Policy Approved' : 'Standard Balance'}</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>

          {/* Amount Breakdown */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Original Invoice</span>
              <span className="text-slate-200 font-medium">
                ₹{selectedScenario.amount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>Settlement Goodwill Credit</span>
              <span className="font-semibold">
                {restructurePlan && restructurePlan.discount_amount > 0
                  ? `-₹${restructurePlan.discount_amount.toLocaleString('en-IN')} (${restructurePlan.discount_pct}%)`
                  : '-₹0 (0%)'}
              </span>
            </div>
            <div className="pt-2 border-t border-[#162238] flex justify-between items-baseline">
              <span className="font-bold text-white text-xs">Net Amount Payable</span>
              <span className="text-base font-bold text-emerald-400">
                ₹{(restructurePlan ? restructurePlan.settlement_amount : selectedScenario.amount).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Payment Links Generated */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-medium text-slate-400 block">Payment Links Generated</span>
            {restructurePlan && restructurePlan.installments && restructurePlan.installments.length > 0 ? (
              <div className="space-y-1.5">
                {restructurePlan.installments.map((inst) => (
                  <div key={inst.index} className="p-2.5 rounded-xl bg-[#0E182A] border border-[#1A2740] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-white">Tranche {inst.index}</div>
                      <div className="text-[10px] text-slate-400">Due Date: {inst.due_date}</div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-white">₹{inst.amount.toLocaleString('en-IN')}</span>
                      <a
                        href={inst.payment_url || 'https://rzp.io/i/mock'}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 text-[11px] font-medium transition flex items-center gap-1"
                      >
                        <span>Pay Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-[#0E182A] border border-[#1A2740] flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white">Full Settlement</div>
                  <div className="text-[10px] text-slate-400">Due Date: {selectedScenario.dueDate}</div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-white">₹{selectedScenario.amount.toLocaleString('en-IN')}</span>
                  <a
                    href="https://rzp.io/i/demo_link"
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 text-[11px] font-medium transition flex items-center gap-1"
                  >
                    <span>Pay Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Big CTA: Simulate Settlement */}
          <div>
            {simulatedPaid ? (
              <div className="w-full p-3 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center justify-between font-semibold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Settlement Captured (Webhook Verified)</span>
                </div>
                <span className="text-[10px] bg-emerald-900 px-2 py-0.5 rounded font-mono font-bold">PAID</span>
              </div>
            ) : (
              <button
                onClick={() => setSimulatedPaid(true)}
                className="w-full p-3 rounded-xl bg-[#00875A] hover:bg-[#009E69] text-white flex items-center justify-between font-semibold text-xs shadow-md transition"
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-7 h-7 rounded-lg bg-emerald-800/60 flex items-center justify-center">
                    <span className="text-xs">💳</span>
                  </div>
                  <div>
                    <div className="font-bold leading-tight">Simulate Settlement</div>
                    <div className="text-[10px] text-emerald-200 font-normal">Initiate payment & move to next phase</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

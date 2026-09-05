import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { LiveMediationStudio } from './components/LiveMediationStudio';
import { BatchBenchmarkView } from './components/BatchBenchmarkView';
import { AuditLedgerView } from './components/AuditLedgerView';
import { PolicyConfigModal } from './components/PolicyConfigModal';
import { PolicyConfig, BatchBenchmarkSummary } from './types';
import { fetchPolicyConfig, fetchAuditLogs, fetchPTPs } from './api';

export function App() {
  const [activeTab, setActiveTab] = useState<'studio' | 'benchmark' | 'audit'>('studio');
  const [policy, setPolicy] = useState<PolicyConfig | null>(null);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState<BatchBenchmarkSummary | null>(null);
  const [ptpCount, setPtpCount] = useState(0);

  useEffect(() => {
    fetchPolicyConfig().then(setPolicy).catch(console.error);
    fetchPTPs().then((res) => setPtpCount(res.length)).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-[#070D18] text-slate-100 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-5 space-y-5">
        {/* Metric Cards Top Cockpit */}
        <MetricCards benchmarkData={benchmarkData} ptpCount={ptpCount} />

        {/* Tab Views */}
        {activeTab === 'studio' && (
          <LiveMediationStudio
            onOpenPolicyModal={() => setIsPolicyModalOpen(true)}
            policy={policy}
          />
        )}
        {activeTab === 'benchmark' && (
          <BatchBenchmarkView
            benchmarkData={benchmarkData}
            onBenchmarkRun={(data) => setBenchmarkData(data)}
          />
        )}
        {activeTab === 'audit' && <AuditLedgerView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#162238] py-4 px-8 text-center text-xs text-slate-500 bg-[#070D18]">
        <span>RazorMediate &nbsp;•&nbsp; AI-Powered Recovery & Dispute Mediation &nbsp;•&nbsp; Built for Razorpay Merchants</span>
      </footer>

      {/* Policy Modal */}
      <PolicyConfigModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        policy={policy}
        onPolicyUpdated={(p) => setPolicy(p)}
      />
    </div>
  );
}

export default App;

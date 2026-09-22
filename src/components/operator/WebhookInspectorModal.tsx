import React, { useState } from 'react';
import {
  X,
  Radio,
  CheckCircle2,
  Copy,
  Check,
  Server,
  Building2,
  MapPin,
  ExternalLink,
  Code2
} from 'lucide-react';
import { useIncidents } from '../../context/IncidentContext';

export const WebhookInspectorModal: React.FC = () => {
  const { isWebhookModalOpen, setIsWebhookModalOpen, inspectingWebhookReport } = useIncidents();
  const [copied, setCopied] = useState(false);

  if (!isWebhookModalOpen || !inspectingWebhookReport) return null;

  const routing = inspectingWebhookReport.webhookRouting;

  const handleCopyPayload = () => {
    if (routing?.payloadSnippet) {
      navigator.clipboard.writeText(routing.payloadSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[1150] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="webhook-inspector-modal"
        className="relative w-full max-w-xl bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col font-mono text-xs"
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-blue-400 uppercase tracking-wider font-bold">
                Civic Automated Workflow Engine
              </div>
              <div className="text-xs font-bold text-white">
                Municipal Webhook Dispatch Audit
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsWebhookModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 font-sans">
          {/* Ticket & Target Summary */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Ticket Identifier:</span>
              <span className="font-mono font-bold text-slate-900">
                {inspectingWebhookReport.ticketNumber}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Target Department:</span>
              <span className="font-semibold text-blue-700">
                {routing?.targetDepartment || inspectingWebhookReport.assignedDepartment || 'Municipal Works Bureau'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Geotag Jurisdiction Zone:</span>
              <span className="text-slate-700 font-medium">
                {routing?.municipalZone || 'Zone 1: Downtown Metro Center'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Delivery Status:</span>
              <span className="inline-flex items-center space-x-1 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>200 OK • Delivered</span>
              </span>
            </div>
          </div>

          {/* Webhook Endpoint Banner */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Dispatched REST Webhook Endpoint
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-800 break-all flex items-center justify-between">
              <span>{routing?.endpoint || 'https://api.civicgov.city/v1/work-orders/dispatch'}</span>
              <span className="ml-2 text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded flex-shrink-0">
                POST
              </span>
            </div>
          </div>

          {/* Live JSON Payload */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                <Code2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Synchronized JSON Dispatch Payload</span>
              </span>
              <button
                type="button"
                onClick={handleCopyPayload}
                className="text-[11px] text-slate-600 hover:text-slate-900 flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors font-sans font-medium"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 font-mono text-[11px] overflow-x-auto leading-relaxed max-h-56">
              {routing?.payloadSnippet ||
                JSON.stringify(
                  {
                    event: 'civic.report.routed',
                    ticketNumber: inspectingWebhookReport.ticketNumber,
                    category: inspectingWebhookReport.categoryName,
                    department: inspectingWebhookReport.assignedDepartment,
                    location: inspectingWebhookReport.location,
                    timestamp: inspectingWebhookReport.createdAt
                  },
                  null,
                  2
                )}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={() => setIsWebhookModalOpen(false)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors border border-slate-200 shadow-xs"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

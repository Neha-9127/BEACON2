import React from 'react';
import {
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Building2,
  ShieldAlert,
  MapPin,
  Flame,
  GitMerge,
  BarChart3,
  Percent,
  Truck
} from 'lucide-react';
import { useIncidents } from '../../context/IncidentContext';
import {
  calculateExecutiveKpis,
  calculateZoneBottlenecks,
  calculateDepartmentPerformances
} from '../../utils/analytics';

export const AnalyticsDashboardView: React.FC = () => {
  const { reports } = useIncidents();

  const kpis = calculateExecutiveKpis(reports);
  const zoneBottlenecks = calculateZoneBottlenecks(reports);
  const deptPerformances = calculateDepartmentPerformances(reports);

  return (
    <div className="space-y-4">
      {/* Executive KPI Metric Banner - Beige Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#fbf9f4] p-3.5 rounded-xl border border-[#ded1be] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-600 text-[11px] font-semibold">
            <span>TOTAL INCIDENTS</span>
            <BarChart3 className="w-3.5 h-3.5 text-purple-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{kpis.totalReports}</div>
          <div className="text-[10px] text-slate-600 font-mono">
            {kpis.activeCount} active • {kpis.resolvedCount} closed
          </div>
        </div>

        <div className="bg-[#fbf9f4] p-3.5 rounded-xl border border-[#ded1be] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-600 text-[11px] font-semibold">
            <span>RESOLUTION RATE</span>
            <Percent className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{kpis.overallResolutionRate}%</div>
          <div className="text-[10px] text-emerald-800 font-medium">
            +4.2% higher than municipal SLA
          </div>
        </div>

        <div className="bg-[#fbf9f4] p-3.5 rounded-xl border border-[#ded1be] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-600 text-[11px] font-semibold">
            <span>AVG RESPONSE TIME</span>
            <Clock className="w-3.5 h-3.5 text-purple-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{kpis.civicAvgHours}h</div>
          <div className="text-[10px] text-slate-600 font-mono">
            Safety Emergency: <strong className="text-slate-800">{kpis.safetyAvgMinutes}m</strong>
          </div>
        </div>

        <div className="bg-[#fbf9f4] p-3.5 rounded-xl border border-[#ded1be] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-600 text-[11px] font-semibold">
            <span>DUPLICATES MERGED</span>
            <GitMerge className="w-3.5 h-3.5 text-purple-700" />
          </div>
          <div className="text-2xl font-bold text-purple-900">{kpis.duplicatesConsolidated}</div>
          <div className="text-[10px] text-slate-600">
            Consolidated into single work orders
          </div>
        </div>
      </div>

      {/* Frequent Bottleneck Areas & Zone Heatmap Ratings */}
      <div className="bg-[#fbf9f4] rounded-xl border border-[#ded1be] shadow-xs overflow-hidden">
        <div className="p-4 bg-[#f4ebe0] border-b border-[#ded1be] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-700 border border-red-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Frequent Bottleneck Areas & Zone Vulnerability
              </h3>
              <p className="text-[11px] text-slate-600">
                Identifies districts with highest active backlog, response lag, and recurring issues
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-semibold text-slate-600">
            5 Geographic Sectors
          </span>
        </div>

        <div className="divide-y divide-[#ded1be]">
          {zoneBottlenecks.map((zone) => (
            <div
              key={zone.zoneName}
              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#f4ebe0]/60 transition-colors"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-slate-900 text-xs">{zone.zoneName}</span>
                  <span
                    className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      zone.bottleneckLevel === 'critical'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : zone.bottleneckLevel === 'moderate'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {zone.bottleneckLevel} Bottleneck
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 flex items-center space-x-2">
                  <span>Dominant: <strong className="text-slate-800">{zone.dominantCategory}</strong></span>
                  <span>•</span>
                  <span>Avg Response: <strong className="text-slate-800">{zone.avgResponseMinutes} mins</strong></span>
                </div>
              </div>

              {/* Progress & Stat pill */}
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-800">
                    {zone.resolvedIncidents}/{zone.totalIncidents} Resolved
                  </div>
                  <div className="w-28 bg-[#ede4d4] h-2 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full ${
                        zone.resolutionRatePercent > 70
                          ? 'bg-emerald-500'
                          : zone.resolutionRatePercent > 40
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${zone.resolutionRatePercent}%` }}
                    />
                  </div>
                </div>
                <div className="font-mono text-xs font-bold text-slate-800 w-10 text-right">
                  {zone.resolutionRatePercent}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-Agency Historical Resolution Rates & Field Crews */}
      <div className="bg-[#fbf9f4] rounded-xl border border-[#ded1be] shadow-xs overflow-hidden">
        <div className="p-4 bg-[#f4ebe0] border-b border-[#ded1be] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 border border-purple-200 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Departmental Historical Resolution Rates & Field Crew Load
              </h3>
              <p className="text-[11px] text-slate-600">
                Cross-agency service level tracking across municipal utilities and safety squads
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-semibold text-purple-900 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">
            Active Multi-Agency Mesh
          </span>
        </div>

        <div className="divide-y divide-[#ded1be]">
          {deptPerformances.map((dept) => (
            <div
              key={dept.department}
              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#f4ebe0]/60 transition-colors text-xs"
            >
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="font-semibold text-slate-900 text-xs">
                  {dept.department}
                </div>
                <div className="text-[11px] text-slate-600 flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <Truck className="w-3 h-3 text-purple-700" />
                    <span>{dept.activeFieldCrews} Crews Deployed</span>
                  </span>
                  <span>•</span>
                  <span>Avg Turnaround: <strong className="text-slate-800">{dept.avgResolutionHours} hrs</strong></span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-800">
                    {dept.resolvedCount}/{dept.totalAssigned} Work Orders
                  </div>
                  <div className="w-32 bg-[#ede4d4] h-2 rounded-full overflow-hidden mt-1">
                    <div
                      className="bg-purple-600 h-full rounded-full"
                      style={{ width: `${dept.resolutionRatePercent}%` }}
                    />
                  </div>
                </div>
                <div className="font-mono text-xs font-bold text-purple-900 w-10 text-right">
                  {dept.resolutionRatePercent}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

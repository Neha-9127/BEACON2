import React, { useMemo } from 'react';
import {
  ShieldAlert,
  Building2,
  Construction,
  Trash2,
  Lightbulb,
  Droplet,
  Eye,
  AlertTriangle,
  UserX,
  Lock,
  Zap,
  Info,
  Sliders
} from 'lucide-react';
import { IncidentDomain, SeverityLevel } from '../../types';
import {
  INCIDENT_CATEGORIES,
  getCategoriesByDomain,
  getCategoryById,
  computeSmartSeverity
} from '../../config/categories';

interface CategorySelectorProps {
  selectedDomain: IncidentDomain;
  onDomainChange: (domain: IncidentDomain) => void;
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  selectedSubcategory: string;
  onSubcategoryChange: (subcategory: string) => void;
  isAnonymous: boolean;
  onAnonymousChange: (anonymous: boolean) => void;
  proximityZone: string;
  severity: SeverityLevel;
  onSeverityChange: (severity: SeverityLevel, reason: string) => void;
  isImmediateDanger: boolean;
  onImmediateDangerChange: (danger: boolean) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedDomain,
  onDomainChange,
  selectedCategoryId,
  onCategoryChange,
  selectedSubcategory,
  onSubcategoryChange,
  isAnonymous,
  onAnonymousChange,
  proximityZone,
  severity,
  onSeverityChange,
  isImmediateDanger,
  onImmediateDangerChange
}) => {
  const currentCategory = useMemo(() => getCategoryById(selectedCategoryId), [selectedCategoryId]);

  // Compute smart recommendation automatically
  const smartRecommendation = useMemo(() => {
    return computeSmartSeverity(
      selectedCategoryId,
      selectedSubcategory,
      proximityZone,
      isImmediateDanger
    );
  }, [selectedCategoryId, selectedSubcategory, proximityZone, isImmediateDanger]);

  const domainCategories = useMemo(
    () => getCategoriesByDomain(selectedDomain),
    [selectedDomain]
  );

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Construction':
        return <Construction className="w-5 h-5" />;
      case 'Trash2':
        return <Trash2 className="w-5 h-5" />;
      case 'Lightbulb':
        return <Lightbulb className="w-5 h-5" />;
      case 'Droplet':
        return <Droplet className="w-5 h-5" />;
      case 'Eye':
        return <Eye className="w-5 h-5" />;
      case 'AlertTriangle':
        return <AlertTriangle className="w-5 h-5" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-5 h-5" />;
      case 'UserX':
        return <UserX className="w-5 h-5" />;
      default:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getSeverityBadgeColor = (lvl: SeverityLevel) => {
    switch (lvl) {
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'emergency':
        return 'bg-red-100 text-red-800 border-red-300 animate-pulse';
    }
  };

  return (
    <div id="category-and-severity-engine" className="space-y-4">
      {/* Primary Domain Switcher: Civic vs Safety */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-stone-700 block mb-1.5">
          Incident Classification Domain
        </label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl border border-stone-200">
          <button
            type="button"
            id="btn-select-civic-domain"
            onClick={() => {
              onDomainChange('civic');
              const firstCivic = getCategoriesByDomain('civic')[0];
              onCategoryChange(firstCivic.id);
              onSubcategoryChange(firstCivic.subcategories[0]);
            }}
            className={`py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
              selectedDomain === 'civic'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-200/80'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Building2 className={`w-4 h-4 ${selectedDomain === 'civic' ? 'text-blue-600' : 'text-stone-500'}`} />
            <span>Civic Infrastructure</span>
          </button>

          <button
            type="button"
            id="btn-select-safety-domain"
            onClick={() => {
              onDomainChange('safety');
              const firstSafety = getCategoriesByDomain('safety')[0];
              onCategoryChange(firstSafety.id);
              onSubcategoryChange(firstSafety.subcategories[0]);
              // Auto-enable anonymity prompt for safety
              onAnonymousChange(true);
            }}
            className={`py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
              selectedDomain === 'safety'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-inherit" />
            <span>Safety & Hazard Alert</span>
          </button>
        </div>
      </div>

      {/* Dynamic Category Tiles */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-stone-700 block mb-1.5">
          Select Specific Category ({selectedDomain.toUpperCase()})
        </label>
        <div className="grid grid-cols-2 gap-2">
          {domainCategories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onCategoryChange(cat.id);
                  onSubcategoryChange(cat.subcategories[0]);
                  // Recompute and notify severity
                  const updated = computeSmartSeverity(
                    cat.id,
                    cat.subcategories[0],
                    proximityZone,
                    isImmediateDanger
                  );
                  onSeverityChange(updated.level, updated.explanation);
                }}
                className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
                  isSelected
                    ? selectedDomain === 'safety'
                      ? 'border-red-600 bg-red-50/70 text-red-950 shadow-xs ring-1 ring-red-500'
                      : 'border-blue-600 bg-blue-50/70 text-blue-950 shadow-xs ring-1 ring-blue-500'
                    : 'border-stone-200 hover:border-stone-300 bg-white text-stone-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isSelected
                        ? selectedDomain === 'safety'
                          ? 'bg-red-600 text-white'
                          : 'bg-blue-600 text-white'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {getCategoryIcon(cat.iconName)}
                  </div>
                  <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${getSeverityBadgeColor(
                      cat.suggestedSeverity
                    )}`}
                  >
                    {cat.suggestedSeverity}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold leading-snug">{cat.name}</div>
                  <div className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">
                    {cat.departmentTarget}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Subcategory Dropdown */}
      {currentCategory && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-700 block mb-1">
            Subcategory / Specific Condition
          </label>
          <select
            value={selectedSubcategory}
            onChange={(e) => {
              const sub = e.target.value;
              onSubcategoryChange(sub);
              const updated = computeSmartSeverity(
                selectedCategoryId,
                sub,
                proximityZone,
                isImmediateDanger
              );
              onSeverityChange(updated.level, updated.explanation);
            }}
            className="w-full text-xs font-medium bg-white border border-stone-300 rounded-lg p-2.5 text-stone-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {currentCategory.subcategories.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Privacy Controls: Anonymity Toggle */}
      <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-stone-700" />
            <span className="text-xs font-bold text-stone-900">
              Privacy Control: Anonymity Shield
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="toggle-anonymity"
              checked={isAnonymous}
              onChange={(e) => onAnonymousChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-stone-900"></div>
          </label>
        </div>

        <p className="text-[11px] text-stone-600 leading-relaxed">
          {isAnonymous ? (
            <span className="text-emerald-800 font-medium">
              ✓ Citizen Identity Masked: Your name and contact will be kept strictly private from public and municipal staff. Certified GPS EXIF coordinates remain embedded for responders.
            </span>
          ) : (
            <span>
              Citizen Identity Visible: Your verified profile name will appear on the dispatch ticket and community feed.
            </span>
          )}
        </p>
      </div>

      {/* Smart Severity Tagging Engine Card */}
      <div className="bg-stone-900 text-stone-100 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold tracking-wide uppercase text-stone-200">
              Smart Severity Tagging Engine
            </span>
          </div>
          <span
            className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full ${
              severity === 'emergency'
                ? 'bg-red-500 text-white animate-pulse'
                : severity === 'high'
                ? 'bg-orange-500 text-white'
                : severity === 'medium'
                ? 'bg-amber-500 text-stone-950'
                : 'bg-blue-500 text-white'
            }`}
          >
            {severity} Priority
          </span>
        </div>

        {/* Engine algorithmic reasoning */}
        <div className="bg-stone-800/80 border border-stone-700 rounded-lg p-2.5 text-[11px] space-y-1">
          <div className="text-stone-400 font-medium">Algorithmic Recommendation:</div>
          <div className="text-stone-200">{smartRecommendation.explanation}</div>
        </div>

        {/* Immediate Danger Checkbox */}
        <label className="flex items-start space-x-2 pt-1 cursor-pointer">
          <input
            type="checkbox"
            checked={isImmediateDanger}
            onChange={(e) => {
              const checked = e.target.checked;
              onImmediateDangerChange(checked);
              const updated = computeSmartSeverity(
                selectedCategoryId,
                selectedSubcategory,
                proximityZone,
                checked
              );
              onSeverityChange(updated.level, updated.explanation);
            }}
            className="mt-0.5 rounded border-stone-700 bg-stone-800 text-red-600 focus:ring-red-500"
          />
          <span className="text-xs text-stone-300">
            <strong>Active Danger Alert:</strong> Incident is currently endangering lives, active traffic, or critical structures (auto-escalates to Emergency).
          </span>
        </label>

        {/* Manual Severity Override Buttons */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1.5">
            <span className="flex items-center space-x-1">
              <Sliders className="w-3 h-3" />
              <span>Manual Severity Override</span>
            </span>
            <span>{severity !== smartRecommendation.level ? '(User Adjusted)' : '(Auto Engine)'}</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {(['low', 'medium', 'high', 'emergency'] as SeverityLevel[]).map((lvl) => {
              const isActive = severity === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() =>
                    onSeverityChange(
                      lvl,
                      `User manually designated ${lvl.toUpperCase()} priority.`
                    )
                  }
                  className={`py-1.5 rounded text-[11px] font-bold uppercase transition-colors ${
                    isActive
                      ? lvl === 'emergency'
                        ? 'bg-red-600 text-white'
                        : lvl === 'high'
                        ? 'bg-orange-500 text-white'
                        : lvl === 'medium'
                        ? 'bg-amber-400 text-black'
                        : 'bg-blue-500 text-white'
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                  }`}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

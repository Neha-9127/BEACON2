import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  AlertTriangle,
  MapPin,
  Compass,
  Layers,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Flame,
  Volume2,
  VolumeX,
  List,
  Map as MapIcon,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  CheckCircle2,
  ThumbsUp,
  ExternalLink,
  PlusCircle,
  FileText,
  Activity,
  Radio,
  Clock,
  ArrowRight,
  Filter
} from 'lucide-react';
import { useIncidents } from '../../context/IncidentContext';
import { useAuth } from '../../context/AuthContext';
import { IncidentReport, SeverityLevel, IncidentDomain } from '../../types';
import { INCIDENT_CATEGORIES, getCategoryById } from '../../config/categories';
import { calculateDistanceKm } from '../../utils/geoRouting';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionType?:
    | 'report_prompt'
    | 'report_draft'
    | 'ticket_results'
    | 'safe_route_prompt'
    | 'emergency_prompt'
    | 'cluster_prompt'
    | 'integrity_prompt'
    | 'view_switched'
    | 'filter_applied';
  draftReport?: {
    domain: IncidentDomain;
    categoryId: string;
    categoryName: string;
    subcategory: string;
    title: string;
    description: string;
    severity: SeverityLevel;
    address: string;
    lat: number;
    lng: number;
  };
  matchedReports?: IncidentReport[];
  infoCards?: Array<{
    title: string;
    description: string;
    badge?: string;
    actionLabel?: string;
    onClick?: () => void;
  }>;
}

interface CitizenChatbotProps {
  onSelectReport: (report: IncidentReport) => void;
  activeTab?: 'feed' | 'my_reports';
  onTabChange?: (tab: 'feed' | 'my_reports') => void;
}

export const CitizenChatbot: React.FC<CitizenChatbotProps> = ({
  onSelectReport,
  activeTab = 'feed',
  onTabChange
}) => {
  const {
    reports,
    addReport,
    toggleUpvote,
    setIsReportingModalOpen,
    isSafeRouteModalOpen,
    setIsSafeRouteModalOpen,
    isIntegrityModalOpen,
    setIsIntegrityModalOpen,
    feedViewMode,
    setFeedViewMode,
    testLoudAlertSound,
    triggerDemoSafetyAlert,
    alertRadiusKm,
    setAlertRadiusKm,
    isSoundMuted,
    setIsSoundMuted,
    runClusterDetection,
    simulateClusterReports,
    activeFilterDomain,
    setActiveFilterDomain,
    activeFilterSeverity,
    setActiveFilterSeverity,
    activeFilterStatus,
    setActiveFilterStatus,
    sortMode,
    setSortMode,
    searchQuery,
    setSearchQuery
  } = useIncidents();

  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [hasUnread, setHasUnread] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const userLat = currentUser?.anchorLocation?.lat && currentUser.anchorLocation.lat > 8 && currentUser.anchorLocation.lat < 36
    ? currentUser.anchorLocation.lat
    : 13.0827;
  const userLng = currentUser?.anchorLocation?.lng && currentUser.anchorLocation.lng > 68 && currentUser.anchorLocation.lng < 98
    ? currentUser.anchorLocation.lng
    : 80.2707;
  const userDistrict = currentUser?.anchorLocation?.districtName || 'Central Chennai';

  const emergencyCount = useMemo(
    () => reports.filter((r) => r.severity === 'emergency' && r.status !== 'resolved').length,
    [reports]
  );

  // Initial greeting message explaining full capability access
  const initialMessages: ChatMessage[] = [
    {
      id: 'msg-welcome-1',
      sender: 'assistant',
      text: `Hello ${currentUser.name}! I am your **BEACON Civic Copilot**. I provide 24/7 intelligent access to **every feature** of this application.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    {
      id: 'msg-welcome-2',
      sender: 'assistant',
      text: `What would you like to do today? You can command any action using plain language, or tap one of the quick shortcuts below:`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      infoCards: [
        {
          title: '📝 Report a Civic or Safety Issue',
          description: 'Submit potholes, water leaks, unlit streets, or active hazards with photos & GPS.',
          badge: 'Reporting Wizard',
          actionLabel: 'Launch Report Wizard',
          onClick: () => setIsReportingModalOpen(true)
        },
        {
          title: '🗺️ Safe Route Navigation',
          description: 'Plan safe walking and commute corridors avoiding reported hotspots.',
          badge: 'Safe Navigation',
          actionLabel: 'Open Safe Routes',
          onClick: () => setIsSafeRouteModalOpen(true)
        },
        {
          title: '🚨 Emergency Buzzer & Push Alerts',
          description: 'Test emergency warning sirens and geo-fenced APNs/FCM broadcasts.',
          badge: 'Alert Engine',
          actionLabel: 'Sound Siren Buzzer',
          onClick: () => testLoudAlertSound()
        },
        {
          title: '⚡ Cluster Detection & Hotspot Merging',
          description: 'Analyze 5-report local density clusters merged into high-priority tickets.',
          badge: 'Hotspot Triage',
          actionLabel: 'Run Cluster Check',
          onClick: () => {
            const res = runClusterDetection();
            handleSystemActionReply(`⚡ **Cluster Detection Result**: ${res.message}`);
          }
        }
      ]
    }
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSystemActionReply = (text: string, actionType?: ChatMessage['actionType'], extra?: Partial<ChatMessage>) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sender: 'assistant',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionType,
        ...extra
      }
    ]);
  };

  // Conversational Quick Report Submission
  const handleQuickSubmitDraft = async (draft: NonNullable<ChatMessage['draftReport']>) => {
    try {
      const newReport = await addReport({
        domain: draft.domain,
        categoryId: draft.categoryId,
        categoryName: draft.categoryName,
        subcategory: draft.subcategory,
        title: draft.title,
        description: draft.description,
        severity: draft.severity,
        severityReason: `Citizen reported via BEACON Chatbot Copilot • Automated Chennai zone classification`,
        autoSeveritySuggested: draft.severity,
        status: 'reported',
        location: {
          lat: draft.lat,
          lng: draft.lng,
          address: draft.address,
          neighborhood: userDistrict,
          proximityZone: 'transit_hub'
        },
        isAnonymous: false,
        reporterId: currentUser.id,
        reporterName: currentUser.name,
        reporterPhoneMasked: 'Verified Citizen ID'
      });

      handleSystemActionReply(
        `✅ **Report Successfully Dispatched!**\n\nTicket Number: **${newReport.ticketNumber}**\nAssigned to: **${newReport.assignedDepartment || 'Chennai Municipal Authority'}**.\nYour report has been saved to the shared database and broadcasted across city systems.`,
        undefined,
        {
          infoCards: [
            {
              title: `Ticket: ${newReport.ticketNumber}`,
              description: `${newReport.title} • ${newReport.location.address}`,
              badge: 'Created & Dispatched',
              actionLabel: 'Inspect Incident Details',
              onClick: () => onSelectReport(newReport)
            }
          ]
        }
      );
    } catch (err: any) {
      handleSystemActionReply(`❌ Failed to dispatch report: ${err?.message || 'Database error'}`);
    }
  };

  // Smart Intent Detection & Execution
  const processUserMessage = async (userText: string) => {
    const textLower = userText.toLowerCase().trim();

    // 1. Check for Emergency / Buzzer / Siren Intent
    if (
      textLower.includes('emergency') ||
      textLower.includes('buzzer') ||
      textLower.includes('siren') ||
      textLower.includes('alarm') ||
      textLower.includes('sos') ||
      textLower.includes('danger')
    ) {
      testLoudAlertSound();
      handleSystemActionReply(
        `🚨 **Emergency Buzzer Activated!**\n\nI have sounded the emergency siren buzzer and verified the audio alert channel. In a real life-threatening emergency, please also dial **100** (Police) or **101** (Fire & Rescue) immediately.`,
        'emergency_prompt',
        {
          infoCards: [
            {
              title: 'Emergency Sound Channel Active',
              description: `Alert Geo-Fence: ${alertRadiusKm} km • Siren Sound: ${isSoundMuted ? 'Muted' : 'Armed'}`,
              badge: 'Life-Safety Protocol',
              actionLabel: 'Simulate Push Broadcast',
              onClick: () => triggerDemoSafetyAlert()
            },
            {
              title: 'View Emergency Hazards Only',
              description: `Currently ${emergencyCount} active emergency item(s) in Chennai.`,
              badge: 'Filter Priority',
              actionLabel: 'Filter Emergencies',
              onClick: () => {
                setActiveFilterSeverity('emergency');
                setFeedViewMode('feed');
              }
            }
          ]
        }
      );
      return;
    }

    // 2. Check for Safe Route / Avoid Hazards Intent
    if (
      textLower.includes('safe route') ||
      textLower.includes('route') ||
      textLower.includes('avoid') ||
      textLower.includes('navigation') ||
      textLower.includes('directions') ||
      textLower.includes('path') ||
      textLower.includes('corridor')
    ) {
      setIsSafeRouteModalOpen(true);
      handleSystemActionReply(
        `🗺️ **Safe Route Navigation Opened!**\n\nI have launched the **Safe-Route Bypass Engine**. It analyzes active potholes, dark streetlights, and hazardous hotspots across Chennai to calculate the safest route for your commute.`,
        'safe_route_prompt',
        {
          infoCards: [
            {
              title: 'Safe Route Bypass Active',
              description: 'Avoiding active street craters, flooded corridors, and unlit lanes.',
              badge: 'Route Engine',
              actionLabel: 'Re-open Safe Route Modal',
              onClick: () => setIsSafeRouteModalOpen(true)
            }
          ]
        }
      );
      return;
    }

    // 3. Check for Duplicate / Fake Report Integrity Check Intent
    if (
      textLower.includes('duplicate') ||
      textLower.includes('fake') ||
      textLower.includes('integrity') ||
      textLower.includes('tamper') ||
      textLower.includes('hash') ||
      textLower.includes('audit')
    ) {
      setIsIntegrityModalOpen(true);
      handleSystemActionReply(
        `🛡️ **Report Integrity & Anti-Duplicate Scanner Launched!**\n\nBEACON uses multi-vector perceptual image hashing (pHash) and EXIF tamper verification to prevent duplicate submissions and spot synthetic or copied images.`,
        'integrity_prompt',
        {
          infoCards: [
            {
              title: 'Report Integrity Auditor',
              description: 'Audits community reports for image re-use and cross-zone duplicates.',
              badge: 'Integrity Shield',
              actionLabel: 'Open Scanner Modal',
              onClick: () => setIsIntegrityModalOpen(true)
            }
          ]
        }
      );
      return;
    }

    // 4. Check for Cluster Detection Intent
    if (
      textLower.includes('cluster') ||
      textLower.includes('hotspot') ||
      textLower.includes('5 report') ||
      textLower.includes('density')
    ) {
      const clusterResult = runClusterDetection();
      setActiveFilterDomain('cluster');
      handleSystemActionReply(
        `⚡ **Cluster Detection Triggered!**\n\n${clusterResult.message}\n\nI have filtered your feed to display cluster hotspot candidates and merged priority issues.`,
        'cluster_prompt',
        {
          infoCards: [
            {
              title: 'Simulate Pothole Cluster',
              description: 'Generate 5 synthetic reports near Gemini Flyover to test auto-merge.',
              badge: 'Simulation',
              actionLabel: 'Simulate Pothole Hotspot',
              onClick: () => {
                const res = simulateClusterReports('potholes');
                runClusterDetection();
                handleSystemActionReply(res.message);
              }
            },
            {
              title: 'Simulate Streetlight Outage Cluster',
              description: 'Generate 5 reports in T. Nagar to trigger municipal emergency escalation.',
              badge: 'Simulation',
              actionLabel: 'Simulate Blackout Hotspot',
              onClick: () => {
                const res = simulateClusterReports('streetlights');
                runClusterDetection();
                handleSystemActionReply(res.message);
              }
            }
          ]
        }
      );
      return;
    }

    // 5. Check for View Switching (Map vs Feed)
    if (textLower.includes('map') || textLower.includes('gis') || textLower.includes('pin')) {
      setFeedViewMode('map');
      if (activeTab !== 'feed' && onTabChange) onTabChange('feed');
      handleSystemActionReply(
        `📍 **Switched to Interactive GIS Map View!**\n\nYou can now explore all reported incidents, safety pins, and hot zones geographically across Chennai.`,
        'view_switched'
      );
      return;
    }

    if (textLower.includes('feed') || textLower.includes('list') || textLower.includes('cards')) {
      setFeedViewMode('feed');
      if (activeTab !== 'feed' && onTabChange) onTabChange('feed');
      handleSystemActionReply(
        `📋 **Switched to Feed Card View!**\n\nAll community reports are listed in order of priority and proximity.`,
        'view_switched'
      );
      return;
    }

    // 6. Check for My Submissions Tab
    if (
      textLower.includes('my report') ||
      textLower.includes('my submission') ||
      textLower.includes('my ticket') ||
      textLower.includes('reported by me')
    ) {
      if (onTabChange) onTabChange('my_reports');
      const myCount = reports.filter(
        (r) => r.reporterId === currentUser.id || (!r.isAnonymous && r.reporterName === currentUser.name)
      ).length;
      handleSystemActionReply(
        `📂 **Switched to 'My Submissions' Tab!**\n\nYou have submitted **${myCount} incident report(s)**. Here you can track their verification and resolution progress.`,
        'view_switched'
      );
      return;
    }

    // 7. Check for Filters & Sorting Commands
    if (textLower.includes('civic issue') || textLower.includes('civic only')) {
      setActiveFilterDomain('civic');
      handleSystemActionReply(`🏛️ Filter applied: **Civic Issues Only** (potholes, water leaks, waste, lighting).`, 'filter_applied');
      return;
    }
    if (textLower.includes('safety') && !textLower.includes('safe route')) {
      setActiveFilterDomain('safety');
      handleSystemActionReply(`🛡️ Filter applied: **Safety & Hazards Only** (fires, gas leaks, crimes, structural hazards).`, 'filter_applied');
      return;
    }
    if (textLower.includes('sort distance') || textLower.includes('nearest')) {
      setSortMode('distance');
      handleSystemActionReply(`🧭 Feed sorted by: **Nearest Distance from your anchor location**.`, 'filter_applied');
      return;
    }
    if (textLower.includes('sort upvote') || textLower.includes('popular') || textLower.includes('most voted')) {
      setSortMode('upvotes');
      handleSystemActionReply(`👍 Feed sorted by: **Most Community Upvotes & Urgency**.`, 'filter_applied');
      return;
    }
    if (textLower.includes('reset filter') || textLower.includes('show all')) {
      setActiveFilterDomain('all');
      setActiveFilterSeverity('all');
      setActiveFilterStatus('all');
      setSearchQuery('');
      if (onTabChange) onTabChange('feed');
      handleSystemActionReply(`🔄 All filters have been reset. Showing all active reports.`, 'filter_applied');
      return;
    }

    // 8. Check for Incident Reporting Intent
    if (
      textLower.includes('report') ||
      textLower.includes('file a') ||
      textLower.includes('submit') ||
      textLower.includes('complain') ||
      textLower.includes('pothole') ||
      textLower.includes('leak') ||
      textLower.includes('garbage') ||
      textLower.includes('street light') ||
      textLower.includes('fire') ||
      textLower.includes('hazard')
    ) {
      // Determine probable category
      let matchedCategory = INCIDENT_CATEGORIES[0]; // default pothole
      let domain: IncidentDomain = 'civic';
      let subcategory = 'Deep Pothole (>15cm)';
      let severity: SeverityLevel = 'medium';

      if (textLower.includes('fire') || textLower.includes('gas') || textLower.includes('crime') || textLower.includes('accident')) {
        domain = 'safety';
        severity = 'emergency';
        const found = INCIDENT_CATEGORIES.find((c) => c.domain === 'safety');
        if (found) matchedCategory = found;
        subcategory = 'Immediate Hazard / Danger';
      } else if (textLower.includes('water') || textLower.includes('pipe')) {
        const found = INCIDENT_CATEGORIES.find((c) => c.id === 'water_leakage');
        if (found) matchedCategory = found;
        subcategory = 'Burst Water Main';
        severity = 'high';
      } else if (textLower.includes('light') || textLower.includes('dark') || textLower.includes('lamp') || textLower.includes('pole')) {
        const found = INCIDENT_CATEGORIES.find((c) => c.id === 'streetlights');
        if (found) matchedCategory = found;
        subcategory = 'Complete Street Blackout';
        severity = 'medium';
      } else if (textLower.includes('garbage') || textLower.includes('waste') || textLower.includes('trash') || textLower.includes('dump')) {
        const found = INCIDENT_CATEGORIES.find((c) => c.id === 'waste_management');
        if (found) matchedCategory = found;
        subcategory = 'Overflowing Public Bin';
        severity = 'low';
      }

      // Title estimation
      let derivedTitle = userText;
      if (userText.length > 50) {
        derivedTitle = userText.substring(0, 48) + '...';
      }

      const draft = {
        domain,
        categoryId: matchedCategory.id,
        categoryName: matchedCategory.name,
        subcategory,
        title: derivedTitle,
        description: `Citizen report initiated via BEACON AI Copilot: "${userText}"`,
        severity,
        address: `${currentUser?.anchorLocation?.districtName || 'Anna Salai'}, Chennai`,
        lat: userLat,
        lng: userLng
      };

      handleSystemActionReply(
        `📝 **I've prepared an incident report draft for you!**\n\nYou can submit this ticket directly with one tap, or open the full 4-step wizard to attach photos, voice notes, and adjust your GPS map pin:`,
        'report_draft',
        {
          draftReport: draft,
          infoCards: [
            {
              title: draft.title,
              description: `Category: ${draft.categoryName} • Severity: ${draft.severity.toUpperCase()} • Location: ${draft.address}`,
              badge: 'Draft Ready',
              actionLabel: 'Launch Full Wizard With Camera',
              onClick: () => setIsReportingModalOpen(true)
            }
          ]
        }
      );
      return;
    }

    // 9. Search Reports by Ticket Number or Keyword
    const ticketMatch = userText.match(/CHN-2026-[A-Za-z0-9]+/i);
    const searchMatches = reports.filter((r) => {
      if (ticketMatch && r.ticketNumber.toLowerCase().includes(ticketMatch[0].toLowerCase())) return true;
      const q = textLower;
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.categoryName.toLowerCase().includes(q) ||
        r.location.address.toLowerCase().includes(q)
      );
    });

    if (searchMatches.length > 0) {
      handleSystemActionReply(
        `🔍 **Found ${searchMatches.length} matching incident(s)** in Chennai database:`,
        'ticket_results',
        {
          matchedReports: searchMatches.slice(0, 4)
        }
      );
      return;
    }

    // 10. Fallback to Server-Side Gemini API or Conversational Help
    try {
      setIsTyping(true);
      const res = await fetch('/api/citizen-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: messages.slice(-4).map((m) => ({
            role: m.sender,
            content: m.text
          })),
          context: {
            reportsCount: reports.length,
            emergencyCount,
            userDistrict,
            recentReports: reports.slice(0, 3).map((r) => ({
              ticketNumber: r.ticketNumber,
              title: r.title,
              categoryName: r.categoryName,
              severity: r.severity,
              status: r.status,
              address: r.location.address
            }))
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          handleSystemActionReply(data.reply);
          return;
        }
      }
    } catch {
      // Offline fallback
    } finally {
      setIsTyping(false);
    }

    // Offline rule-based default fallback
    handleSystemActionReply(
      `I understand! You can ask me to **report an incident**, **check ticket status** (e.g. CHN-2026-...), **find a safe route**, **sound the emergency buzzer**, **detect problem clusters**, or **switch views between Map and Feed**. How can I help?`,
      undefined,
      {
        infoCards: [
          {
            title: 'Report Incident',
            description: 'Capture photo evidence & submit issue',
            badge: 'Create',
            actionLabel: 'Report Issue',
            onClick: () => setIsReportingModalOpen(true)
          },
          {
            title: 'Safe Route Bypass',
            description: 'Navigate avoiding road hazards',
            badge: 'Navigate',
            actionLabel: 'Safe Route',
            onClick: () => setIsSafeRouteModalOpen(true)
          }
        ]
      }
    );
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');

    // Process intention
    processUserMessage(trimmed);
  };

  return (
    <>
      {/* Floating Action Trigger Button (Bottom-Right) - Visible strictly in Citizen Portal */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end">
        {/* Unread hint speech bubble (shown when collapsed) */}
        {!isOpen && hasUnread && (
          <div
            onClick={() => setIsOpen(true)}
            className="mb-2 bg-purple-950 text-white text-xs px-3 py-1.5 rounded-xl shadow-lg border border-purple-500/40 flex items-center space-x-1.5 cursor-pointer animate-bounce select-none"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span className="font-semibold text-[11px]">Civic Copilot Online</span>
          </div>
        )}

        <button
          type="button"
          id="btn-floating-citizen-chatbot"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 relative active:scale-95 border-2 ${
            isOpen
              ? 'bg-purple-950 text-white border-purple-400 rotate-90 shadow-purple-950/40'
              : 'bg-purple-900 hover:bg-purple-950 text-white border-purple-300 shadow-xl'
          }`}
          title={isOpen ? 'Close Civic Chatbot' : 'Open BEACON Civic Assistant Chatbot'}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <>
              <Bot className="w-7 h-7 text-white" />
              {/* Pulsing online status orb */}
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-purple-950 rounded-full animate-ping" />
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-purple-950 rounded-full" />
            </>
          )}
        </button>
      </div>

      {/* Expanded Floating Chatbot Window */}
      {isOpen && (
        <div
          id="citizen-chatbot-window"
          className="fixed bottom-22 right-4 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-[420px] h-[580px] max-h-[82vh] bg-[#fbf9f4] rounded-2xl shadow-2xl border border-[#ded1be] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200 text-slate-900"
        >
          {/* Chatbot Header */}
          <div className="bg-[#ede4d4] px-4 py-3 border-b border-[#ded1be] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-900 text-white flex items-center justify-center shadow-xs border border-purple-800">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-xs font-bold text-slate-900">BEACON Civic Copilot</h3>
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded border border-emerald-300 flex items-center space-x-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse inline-block" />
                    <span>Active</span>
                  </span>
                </div>
                <p className="text-[10px] text-slate-600">Full Access to All Portal Capabilities</p>
              </div>
            </div>

            {/* Quick Header Controls */}
            <div className="flex items-center space-x-1">
              {/* Emergency Buzzer in Header */}
              <button
                type="button"
                onClick={testLoudAlertSound}
                className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg border border-red-200 transition-colors"
                title="Test emergency buzzer"
              >
                <AlertTriangle className="w-4 h-4" />
              </button>

              {/* Reset / Clear Chat */}
              <button
                type="button"
                onClick={() => setMessages(initialMessages)}
                className="p-1.5 text-slate-600 hover:bg-[#ded1be]/60 rounded-lg transition-colors"
                title="Reset chat conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Close / Minimize */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-600 hover:bg-[#ded1be]/60 rounded-lg transition-colors"
                title="Minimize chat"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#f7f4ed]/50 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                <div
                  className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                    msg.sender === 'user'
                      ? 'bg-purple-900 text-white rounded-tr-xs'
                      : 'bg-[#fdfbf7] text-slate-900 border border-[#ded1be] rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>

                {/* Interactive Action Cards */}
                {msg.infoCards && msg.infoCards.length > 0 && (
                  <div className="w-full space-y-1.5 pl-2 max-w-[95%]">
                    {msg.infoCards.map((card, idx) => (
                      <div
                        key={idx}
                        className="bg-[#fdfbf7] border border-[#ded1be] rounded-xl p-2.5 shadow-2xs hover:border-purple-400 transition-all space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-900">{card.title}</span>
                          {card.badge && (
                            <span className="text-[9px] bg-purple-100 text-purple-900 font-bold px-1.5 py-0.2 rounded border border-purple-200">
                              {card.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-600 leading-snug">{card.description}</p>
                        {card.actionLabel && card.onClick && (
                          <button
                            type="button"
                            onClick={card.onClick}
                            className="w-full mt-1 px-2.5 py-1 bg-purple-200 hover:bg-purple-300 text-purple-950 text-[11px] font-bold rounded-lg border border-purple-300 flex items-center justify-center space-x-1.5 transition-colors"
                          >
                            <span>{card.actionLabel}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Conversational Draft Review Card */}
                {msg.draftReport && (
                  <div className="w-full bg-[#fdfbf7] border-2 border-purple-300 rounded-xl p-3 shadow-xs space-y-2 max-w-[95%] pl-2">
                    <div className="flex items-center justify-between border-b border-[#ded1be] pb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900">
                        Incident Draft Ready
                      </span>
                      <span className="text-[9px] bg-purple-100 text-purple-950 font-bold px-1.5 py-0.5 rounded">
                        {msg.draftReport.domain.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-900">{msg.draftReport.title}</div>
                      <div className="text-[10px] text-slate-600 flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-red-600 flex-shrink-0" />
                        <span className="truncate">{msg.draftReport.address}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleQuickSubmitDraft(msg.draftReport!)}
                        className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] rounded-lg shadow-xs flex items-center justify-center space-x-1 transition-all active:scale-95"
                      >
                        <Send className="w-3 h-3" />
                        <span>Dispatch Now</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsReportingModalOpen(true)}
                        className="px-2.5 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-950 font-bold text-[11px] rounded-lg border border-purple-300 flex items-center justify-center space-x-1 transition-colors"
                      >
                        <PlusCircle className="w-3 h-3" />
                        <span>Full Wizard</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Matched Incident Result Cards */}
                {msg.matchedReports && msg.matchedReports.length > 0 && (
                  <div className="w-full space-y-1.5 max-w-[95%] pl-2">
                    {msg.matchedReports.map((rep) => (
                      <div
                        key={rep.id}
                        className="bg-[#fdfbf7] border border-[#ded1be] rounded-xl p-2.5 shadow-2xs space-y-1.5 hover:border-purple-300 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-purple-900 bg-purple-100 px-1.5 py-0.2 rounded border border-purple-200">
                            {rep.ticketNumber}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                              rep.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rep.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {rep.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="text-xs font-semibold text-slate-900 line-clamp-1">{rep.title}</div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                          <span className="truncate max-w-[140px]">{rep.location.address}</span>
                          <span className="font-bold text-slate-700">👍 {rep.upvotesCount || 0}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => onSelectReport(rep)}
                            className="px-2 py-1 bg-purple-200 hover:bg-purple-300 text-purple-950 font-bold text-[10px] rounded-md border border-purple-300 flex items-center justify-center space-x-1"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span>View Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleUpvote(rep.id, currentUser.id)}
                            className="px-2 py-1 bg-[#ede4d4] hover:bg-purple-100 text-slate-800 font-semibold text-[10px] rounded-md border border-[#d8cdbc] flex items-center justify-center space-x-1"
                          >
                            <ThumbsUp className="w-2.5 h-2.5 text-purple-800" />
                            <span>Upvote (+1)</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <span className="text-[9px] text-slate-600 px-1 font-mono">{msg.timestamp}</span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center space-x-2 text-slate-500 text-xs p-2">
                <Bot className="w-4 h-4 text-purple-700 animate-spin" />
                <span className="italic">BEACON Copilot is analyzing Chennai database...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Suggestion Chips Bar */}
          <div className="px-3 py-2 bg-[#ede4d4]/60 border-t border-[#ded1be] flex items-center space-x-1.5 overflow-x-auto no-scrollbar text-[11px]">
            <button
              type="button"
              onClick={() => setIsReportingModalOpen(true)}
              className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-950 border border-purple-300 rounded-lg font-bold flex-shrink-0 flex items-center space-x-1 transition-colors"
            >
              <span>📝 Report</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSafeRouteModalOpen(true)}
              className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-950 border border-purple-300 rounded-lg font-bold flex-shrink-0 flex items-center space-x-1 transition-colors"
            >
              <span>🗺️ Safe Routes</span>
            </button>
            <button
              type="button"
              onClick={testLoudAlertSound}
              className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-900 border border-red-300 rounded-lg font-bold flex-shrink-0 flex items-center space-x-1 transition-colors"
            >
              <span>🚨 Buzzer</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFeedViewMode(feedViewMode === 'feed' ? 'map' : 'feed');
                handleSystemActionReply(
                  `Switched view to **${feedViewMode === 'feed' ? 'Interactive GIS Map' : 'Incident Feed'}**.`
                );
              }}
              className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-950 border border-purple-300 rounded-lg font-bold flex-shrink-0 flex items-center space-x-1 transition-colors"
            >
              <span>{feedViewMode === 'feed' ? '📍 Map View' : '📋 Feed View'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const res = runClusterDetection();
                handleSystemActionReply(`⚡ **Cluster Check**: ${res.message}`);
              }}
              className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-950 border border-purple-300 rounded-lg font-bold flex-shrink-0 flex items-center space-x-1 transition-colors"
            >
              <span>⚡ Clusters</span>
            </button>
            <button
              type="button"
              onClick={() => setIsIntegrityModalOpen(true)}
              className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-950 border border-purple-300 rounded-lg font-bold flex-shrink-0 flex items-center space-x-1 transition-colors"
            >
              <span>🛡️ Duplicate Check</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onTabChange) onTabChange(activeTab === 'feed' ? 'my_reports' : 'feed');
                handleSystemActionReply(
                  `Switched tab to **${activeTab === 'feed' ? 'My Submissions' : 'All Community Reports'}**.`
                );
              }}
              className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-950 border border-purple-300 rounded-lg font-bold flex-shrink-0 flex items-center space-x-1 transition-colors"
            >
              <span>📂 My Reports</span>
            </button>
          </div>

          {/* User Input Form */}
          <form onSubmit={handleSendMessage} className="p-2.5 bg-[#ede4d4] border-t border-[#ded1be] flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask anything or command any feature..."
              className="flex-1 bg-[#fdfbf7] border border-[#ded1be] rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim()}
              className={`p-2 rounded-xl transition-all flex items-center justify-center ${
                inputMessage.trim()
                  ? 'bg-purple-900 hover:bg-purple-950 text-white shadow-xs cursor-pointer active:scale-95'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

import React, { useState, useEffect } from "react";
import { 
  BarChart3, Users, Globe, Play, Save, RefreshCw, 
  Trash2, Calendar, AlertTriangle, CheckCircle2, Clock, MapPin, Compass
} from "lucide-react";
import { 
  fetchAnalyticsData, 
  resetAnalyticsData, 
  AnalyticsDashboardData,
  getTodayDateString 
} from "../lib/analytics";

interface AnalyticsDashboardProps {
  onRefreshTrigger?: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = () => {
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState("");
  const [lastRefreshedTime, setLastRefreshedTime] = useState<string>("");
  const [locationViewTab, setLocationViewTab] = useState<"cities" | "countries">("cities");

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchAnalyticsData();
      setData(result);
      setLastRefreshedTime(new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (err) {
      console.error("Failed to load analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetAnalyticsData();
      setShowResetConfirm(false);
      setResetSuccessMessage("Counters and location statistics have been reset successfully.");
      setTimeout(() => setResetSuccessMessage(""), 4000);
      await loadData();
    } catch (err) {
      console.error("Failed to reset analytics:", err);
    } finally {
      setIsResetting(false);
    }
  };

  const todayStr = getTodayDateString(0);
  const yesterdayStr = getTodayDateString(1);

  const formatDayLabel = (dateStr: string) => {
    if (dateStr === todayStr) return "היום (Today)";
    if (dateStr === yesterdayStr) return "אתמול (Yesterday)";
    
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}`;
      }
    } catch {
      // ignore
    }
    return dateStr;
  };

  const maxVisitsInRecentDays = Math.max(
    ...(data?.recentDays.map((d) => d.visits) || [1]),
    1
  );

  const maxCityVisits = Math.max(
    ...(data?.topCities.map((c) => c.visits) || [1]),
    1
  );

  const maxCountryVisits = Math.max(
    ...(data?.topCountries.map((c) => c.visits) || [1]),
    1
  );

  return (
    <div className="space-y-4 text-gray-800 dir-ltr select-text">
      {/* Top action bar */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 leading-tight">Site Analytics & Engagement</h3>
            <p className="text-[11px] text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <span>Last updated: {lastRefreshedTime || "Loading..."}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-2.5 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="px-2.5 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            title="Reset counters"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {resetSuccessMessage && (
        <div className="p-2.5 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span>{resetSuccessMessage}</span>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-in fade-in">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <p className="font-bold">Reset Analytics & Location Counters?</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Are you sure you want to reset all site visits, code runs, and geographic city statistics to 0? This action cannot be reversed.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowResetConfirm(false)}
              disabled={isResetting}
              className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 bg-white border border-gray-200 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={isResetting}
              className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"
            >
              {isResetting ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
              <span>Confirm Reset</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-400">
          <RefreshCw className="w-7 h-7 animate-spin text-blue-600" />
          <p className="text-xs font-medium">Fetching real-time stats from Firestore...</p>
        </div>
      )}

      {/* Main Stats Cards Grid */}
      {data && (
        <div className="space-y-4">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {/* Total Visits */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-3 rounded-xl border border-blue-100/80 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-blue-700">Total Visits</span>
                <Globe className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight">
                {data.summary.totalVisits.toLocaleString()}
              </div>
              <div className="text-[10px] text-blue-600/80 mt-0.5 flex items-center gap-1">
                <span>All-time visits</span>
              </div>
            </div>

            {/* Today's Visits */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 p-3 rounded-xl border border-emerald-100/80 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-emerald-700">Today's Visits</span>
                <span className="px-1.5 py-0.2 bg-emerald-200 text-emerald-800 text-[9px] font-bold rounded">Today</span>
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight">
                {data.todayStats.visits.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-600/80 mt-0.5">
                <span>Unique visits today</span>
              </div>
            </div>

            {/* Unique Devices */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50/50 p-3 rounded-xl border border-purple-100/80 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-purple-700">Unique Devices</span>
                <Users className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight">
                {data.summary.uniqueVisitors.toLocaleString()}
              </div>
              <div className="text-[10px] text-purple-600/80 mt-0.5">
                <span>Distinct browsers</span>
              </div>
            </div>

            {/* Green Flag Runs */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-3 rounded-xl border border-amber-100/80 relative overflow-hidden">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-amber-700">Code Runs (Flag)</span>
                <Play className="w-4 h-4 text-amber-500 fill-amber-500" />
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight">
                {data.summary.totalRuns.toLocaleString()}
              </div>
              <div className="text-[10px] text-amber-600/80 mt-0.5">
                <span>{data.todayStats.runs} executed today</span>
              </div>
            </div>

            {/* Projects Saved */}
            <div className="bg-gradient-to-br from-rose-50 to-orange-50/50 p-3 rounded-xl border border-rose-100/80 relative overflow-hidden col-span-2 sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-rose-700">Projects Saved (.sjr)</span>
                <Save className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-black text-gray-900 tracking-tight">
                {data.summary.totalSaves.toLocaleString()}
              </div>
              <div className="text-[10px] text-rose-600/80 mt-0.5">
                <span>{data.todayStats.saves} saved today</span>
              </div>
            </div>
          </div>

          {/* User Geographic Locations (Cities & Countries) */}
          <div className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-800">User Geographic Origins</h4>
                  <p className="text-[10px] text-gray-400">Anonymous IP-based city detection</p>
                </div>
              </div>

              {/* View Switcher: Cities vs Countries */}
              <div className="flex items-center p-0.5 bg-gray-100 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => setLocationViewTab("cities")}
                  className={`px-2.5 py-1 font-medium rounded-md transition-all cursor-pointer ${
                    locationViewTab === "cities"
                      ? "bg-white text-emerald-700 shadow-xs font-bold"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Top Cities ({data.topCities.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLocationViewTab("countries")}
                  className={`px-2.5 py-1 font-medium rounded-md transition-all cursor-pointer ${
                    locationViewTab === "countries"
                      ? "bg-white text-emerald-700 shadow-xs font-bold"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Countries ({data.topCountries.length})
                </button>
              </div>
            </div>

            {/* Cities View */}
            {locationViewTab === "cities" && (
              <div>
                {data.topCities.length === 0 ? (
                  <div className="py-6 text-center text-gray-400 text-xs bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                    <Compass className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-emerald-500" />
                    <span>No city records yet. New visitor visits will register their city here.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {data.topCities.map((item, index) => {
                      const percentage = Math.min(100, Math.round((item.visits / maxCityVisits) * 100));
                      return (
                        <div
                          key={`${item.city}-${item.country}-${index}`}
                          className="p-2 rounded-lg bg-gray-50/80 hover:bg-gray-100/80 border border-gray-100 flex items-center justify-between gap-3 text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 text-[10px] font-bold text-gray-400 shrink-0 text-center">
                              #{index + 1}
                            </span>
                            <div className="truncate">
                              <span className="font-bold text-gray-900">{item.city}</span>
                              {item.country && (
                                <span className="text-[10px] text-gray-400 ml-1.5 font-normal">
                                  ({item.country})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {/* Proportional visual bar */}
                            <div className="w-20 sm:w-28 h-2 bg-gray-200/80 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.max(percentage, 8)}%` }}
                              />
                            </div>
                            <span className="font-bold text-emerald-700 text-xs min-w-12 text-right">
                              {item.visits} <span className="text-[10px] font-normal text-gray-400">visits</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Countries View */}
            {locationViewTab === "countries" && (
              <div>
                {data.topCountries.length === 0 ? (
                  <div className="py-6 text-center text-gray-400 text-xs bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                    <Globe className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-blue-500" />
                    <span>No country records yet.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {data.topCountries.map((item, index) => {
                      const percentage = Math.min(100, Math.round((item.visits / maxCountryVisits) * 100));
                      return (
                        <div
                          key={`${item.country}-${index}`}
                          className="p-2 rounded-lg bg-gray-50/80 hover:bg-gray-100/80 border border-gray-100 flex items-center justify-between gap-3 text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 text-[10px] font-bold text-gray-400 shrink-0 text-center">
                              #{index + 1}
                            </span>
                            <span className="font-bold text-gray-900 truncate">{item.country}</span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="w-20 sm:w-28 h-2 bg-gray-200/80 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${Math.max(percentage, 8)}%` }}
                              />
                            </div>
                            <span className="font-bold text-blue-700 text-xs min-w-12 text-right">
                              {item.visits} <span className="text-[10px] font-normal text-gray-400">visits</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 7-Days Activity Breakdown */}
          <div className="bg-gray-50/90 rounded-xl p-3.5 border border-gray-200">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Last 7 Days Activity</span>
              </h4>
              <span className="text-[10px] text-gray-500 font-medium">Visits & Executions</span>
            </div>

            <div className="space-y-2">
              {data.recentDays.map((day) => {
                const isToday = day.date === todayStr;
                const percentage = Math.min(100, Math.round((day.visits / maxVisitsInRecentDays) * 100));

                return (
                  <div 
                    key={day.date} 
                    className={`p-2 rounded-lg border text-xs transition-colors flex items-center justify-between gap-3 ${
                      isToday 
                        ? "bg-blue-50/60 border-blue-200 font-medium text-blue-950" 
                        : "bg-white border-gray-100 text-gray-700"
                    }`}
                  >
                    <div className="w-24 shrink-0 font-medium flex items-center gap-1">
                      {isToday && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />}
                      <span className="text-[11px]">{formatDayLabel(day.date)}</span>
                    </div>

                    {/* Progress visual bar */}
                    <div className="flex-1 max-w-xs h-2 bg-gray-100 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full rounded-full ${isToday ? "bg-blue-600" : "bg-indigo-400"}`}
                        style={{ width: `${Math.max(percentage, day.visits > 0 ? 8 : 0)}%` }}
                        title={`${day.visits} visits`}
                      />
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-[11px]">
                      <span title="Visits" className="font-bold text-gray-800">
                        {day.visits} <span className="font-normal text-gray-400 text-[10px]">visits</span>
                      </span>
                      <span title="Code Runs" className="text-amber-600">
                        {day.runs} <span className="text-gray-400 text-[10px]">runs</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Privacy & Information Note */}
          <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 text-[11px] text-gray-500 flex items-center justify-between">
            <span>🔒 Internal metric tracking: No personal data, IPs, or cookies are stored.</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Live Firestore
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

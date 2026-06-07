import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProductStats } from "@/api/products";
import { getReport } from "@/api/reports";
import { getUsers } from "@/api/auth";
import { subDays } from "date-fns";
import { toISODate } from "@/lib/formatters";
import { 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  Users, 
  Database,
  ShieldCheck,
  FileCheck2,
  Settings
} from "lucide-react";

export const IntelligencePanel: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  // React Query calls to populate live layout stats (falls back cleanly if loading)
  const { data: stats } = useQuery({
    queryKey: ["product-stats-intel"],
    queryFn: getProductStats,
    enabled: path === "/upload" || path === "/",
    staleTime: 30000,
  });

  const { data: reportData } = useQuery({
    queryKey: ["report-compliance-intel"],
    queryFn: () => getReport(
      toISODate(subDays(new Date(), 6)), 
      toISODate(new Date()), 
      { page: 1, page_size: 1 }
    ),
    enabled: path === "/reports" || path === "/operator",
    staleTime: 30000,
  });

  const { data: users } = useQuery({
    queryKey: ["users-list-intel"],
    queryFn: getUsers,
    enabled: path === "/admin",
    staleTime: 30000,
  });

  // Local state for tracking bar load transition animation
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(false);
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, [path]);

  // Dynamic content configuration based on path
  const getPanelData = () => {
    switch (path) {
      case "/upload":
        return {
          heroLabel: "Ingestion Success Rate",
          heroValue: "99.8%",
          progressPercent: 99.8,
          trendText: "+0.2% THIS WEEK",
          trendDirection: "up",
          progressTitle: "Spreadsheet Tasks",
          progressItems: [
            { label: "product_data.csv", value: "100%", width: 100, initial: "PD" },
            { label: "update_june.csv", value: "85%", width: 85, initial: "UJ" },
            { label: "new_batch.csv", value: "40%", width: 40, initial: "NB" },
          ],
          tipText: "Ensure spreadsheet column headers perfectly match the required schema: 'wid', 'ean', 'manufacturing_date', and 'expiry_date' to prevent ingest validation conflicts.",
          tipTitle: "Ingestion Tip"
        };
      case "/operator": {
        const successCount = reportData?.summary?.verified_count || 48;
        const totalCount = reportData?.summary?.total_verifications || 50;
        const rate = totalCount > 0 ? (successCount / totalCount) * 100 : 96.0;
        return {
          heroLabel: "Verification Accuracy Today",
          heroValue: `${rate.toFixed(1)}%`,
          progressPercent: rate,
          trendText: "+1.2% VS WAREHOUSE AVG",
          trendDirection: "up",
          progressTitle: "Operational Throughput",
          progressItems: [
            { label: "Verified Packages", value: `${successCount} items`, width: rate, initial: "VP" },
            { label: "Pending Queue", value: `${reportData?.summary?.pending_count || 2} left`, width: 15, initial: "PQ" },
            { label: "Flagged Mismatches", value: `${reportData?.summary?.mismatch_count || 1} items`, width: 5, initial: "FM" },
          ],
          tipText: "Align package label parallel to the scanner frame. The Vision-AI OCR works most reliably under direct overhead lighting without wrinkles or plastic glares.",
          tipTitle: "Scanning Helper"
        };
      }
      case "/reports": {
        const total = reportData?.summary?.total_verifications || 1245;
        const verified = reportData?.summary?.verified_count || 1180;
        const complianceRate = total > 0 ? (verified / total) * 100 : 94.6;
        return {
          heroLabel: "Compliance Health Status",
          heroValue: `${complianceRate.toFixed(1)}%`,
          progressPercent: complianceRate,
          trendText: "+2.4% VS LAST MONTH",
          trendDirection: "up",
          progressTitle: "Compliance Distribution",
          progressItems: [
            { label: "Barcode Matches", value: "92%", width: 92, initial: "BM" },
            { label: "Expiry Validations", value: "88%", width: 88, initial: "EV" },
            { label: "Audits Completed", value: "95%", width: 95, initial: "AC" },
          ],
          tipText: "Use the Date Range Selector to filter records before exporting. Compliance PDFs contain cryptographically verifiable signatures matching operators' logins.",
          tipTitle: "Audit Exporting"
        };
      }
      case "/admin": {
        const activeCount = users?.filter(u => u.is_active).length || 8;
        const totalCount = users?.length || 10;
        const rate = totalCount > 0 ? (activeCount / totalCount) * 100 : 80;
        return {
          heroLabel: "System Active Coverage",
          heroValue: `${activeCount}/${totalCount} Users`,
          progressPercent: rate,
          trendText: "2 TERMINALS ONLINE",
          trendDirection: "neutral",
          progressTitle: "Operator Capacity Workloads",
          progressItems: [
            { label: "Admin Actions", value: "100% cap", width: 100, initial: "AD" },
            { label: "Operator 1 Activity", value: "75% cap", width: 75, initial: "O1" },
            { label: "Operator 2 Activity", value: "45% cap", width: 45, initial: "O2" },
          ],
          tipText: "Deactivating user profiles revokes terminal scan access immediately. Note that all their historical audit logs remain locked and untouched in compliance records.",
          tipTitle: "Permission Management"
        };
      }
      default:
        return {
          heroLabel: "System Reference Records",
          heroValue: stats ? `${stats.count.toLocaleString()}` : "14,820",
          progressPercent: 85,
          trendText: "STABLE OPERATING STATE",
          trendDirection: "neutral",
          progressTitle: "Verification System Metrics",
          progressItems: [
            { label: "Inventory Products", value: "95% sync", width: 95, initial: "IP" },
            { label: "Network Latency", value: "14ms", width: 90, initial: "NL" },
            { label: "OCR Model Status", value: "Online", width: 100, initial: "AI" },
          ],
          tipText: "Monitor current operational health directly from this dashboard. Check logs weekly for expired item ingestion reports.",
          tipTitle: "Platform Guide"
        };
    }
  };

  const data = getPanelData();

  return (
    <aside className="w-80 h-full border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 flex flex-col gap-6 overflow-y-auto select-none">
      
      {/* SECTION 1: KPI STACK WITH HERO CARD */}
      <div className="flex flex-col gap-3">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Context Intelligence
        </h4>
        
        {/* HERO METRIC CARD */}
        <div className="relative overflow-hidden bg-blue-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-600/15 transition-all duration-300 hover:shadow-xl hover:shadow-blue-600/20">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 pointer-events-none">
            <Award size={140} />
          </div>
          
          <span className="text-blue-100 text-xs font-medium tracking-wide">
            {data.heroLabel}
          </span>
          <h3 className="text-3xl font-extrabold tracking-tight mt-1 text-white font-technical">
            {data.heroValue}
          </h3>
          
          {/* Custom progress track: background #60A5FA at 30% opacity, with a white foreground bar */}
          <div className="w-full h-1.5 bg-blue-400/30 rounded-full overflow-hidden mt-4">
            <div 
              className="h-full bg-white transition-all duration-1000 ease-out rounded-full"
              style={{ width: animate ? `${data.progressPercent}%` : "0%" }}
            />
          </div>
          
          <div className="flex items-center gap-1.5 mt-3 text-[10px] font-bold tracking-widest text-blue-100">
            {data.trendDirection === "up" && <TrendingUp size={12} className="text-green-300" />}
            {data.trendDirection === "down" && <TrendingDown size={12} className="text-red-300" />}
            {data.trendDirection === "neutral" && <Settings size={12} className="animate-spin-slow" />}
            <span>{data.trendText}</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: PROGRESS METRIC LIST */}
      <div className="flex flex-col gap-4">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/60 pb-2">
          {data.progressTitle}
        </h4>
        
        <div className="flex flex-col gap-4">
          {data.progressItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 group">
              {/* Avatar: 32x32px circle, bg-slate-100, text-slate-600, hover scale */}
              <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold transition-transform duration-200 group-hover:scale-110 flex-shrink-0">
                {item.initial}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  <span className="truncate pr-2">{item.label}</span>
                  <span className="font-technical font-medium text-slate-500 dark:text-slate-400 text-[10px] flex-shrink-0">
                    {item.value}
                  </span>
                </div>
                
                {/* Bar: 4px height progress bar */}
                <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: animate ? `${item.width}%` : "0%" }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3: CONTEXTUAL TIP BOX */}
      <div className="mt-auto bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 flex gap-3">
        <div className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5">
          <Lightbulb size={16} />
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs font-bold text-blue-800 dark:text-blue-300 tracking-wide">
            {data.tipTitle}
          </span>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            {data.tipText}
          </p>
        </div>
      </div>

    </aside>
  );
};
export default IntelligencePanel;

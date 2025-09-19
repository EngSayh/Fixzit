"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "../../../contexts/I18nContext";
import { i18n } from "../../lib/i18n";

interface Activity {
  id: string;
  type: "maintenance" | "payment" | "tenant" | "inspection" | "system";
  title: string;
  description: string;
  timestamp: string;
  status: "new" | "pending" | "completed" | "failed";
  user?: string;
  location?: string;
}

const activityIcons = {
  maintenance: "🔧",
  payment: "💳",
  tenant: "👤", 
  inspection: "🔍",
  system: "⚙️"
};

const statusColors = {
  new: "bg-red-100 text-red-800 border-red-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200", 
  completed: "bg-green-100 text-green-800 border-green-200",
  failed: "bg-red-100 text-red-800 border-red-200"
};

interface ActivityFeedProps {
  maxItems?: number;
  autoRefresh?: boolean;
}

export default function ActivityFeed({ maxItems = 10, autoRefresh = true }: ActivityFeedProps) {
  const { t, isRTL } = useTranslation();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data for now - replace with API call
  useEffect(() => {
    const mockActivities: Activity[] = [
      {
        id: "1",
        type: "maintenance",
        title: "Emergency plumbing repair",
        description: "Water leak in bathroom - Unit 204",
        timestamp: "2 minutes ago",
        status: "new",
        user: "Ahmed Al-Rashid",
        location: "Building A, Unit 204"
      },
      {
        id: "2", 
        type: "payment",
        title: "Rent payment received",
        description: "Monthly rent payment processed",
        timestamp: "15 minutes ago",
        status: "completed",
        user: "Sara Mohammed",
        location: "Tower B, Unit 512"
      },
      {
        id: "3",
        type: "tenant",
        title: "New tenant onboarded", 
        description: "Lease agreement signed and keys handed over",
        timestamp: "1 hour ago",
        status: "completed",
        user: "Khalid Al-Otaibi",
        location: "Villa Complex C, Unit 15"
      },
      {
        id: "4",
        type: "inspection",
        title: "HVAC maintenance scheduled",
        description: "Quarterly HVAC system inspection",
        timestamp: "2 hours ago", 
        status: "pending",
        location: "Office Building D"
      },
      {
        id: "5",
        type: "system",
        title: "Backup completed successfully",
        description: "Daily database backup completed",
        timestamp: "3 hours ago",
        status: "completed"
      }
    ];

    setTimeout(() => {
      setActivities(mockActivities.slice(0, maxItems));
      setLoading(false);
    }, 1000);
  }, [maxItems]);

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-start gap-4 p-4 animate-pulse">
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h3 className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>Recent Activities</h3>
        </div>
        <div className="p-6">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="p-6 border-b border-gray-100">
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h3 className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
            {isRTL ? 'الأنشطة الحديثة' : 'Recent Activities'}
          </h3>
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            {isRTL ? 'عرض الكل' : 'View All'}
          </button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No recent activities</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors duration-150">
                <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm">
                    {activityIcons[activity.type]}
                  </div>
                  <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.title}
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[activity.status]}`}>
                        {activity.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{activity.description}</p>
                    <div className={`flex items-center gap-4 text-xs text-gray-500 ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
                      <span>{activity.timestamp}</span>
                      {activity.user && <span>{isRTL ? `بواسطة ${activity.user}` : `by ${activity.user}`}</span>}
                      {activity.location && <span>📍 {activity.location}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
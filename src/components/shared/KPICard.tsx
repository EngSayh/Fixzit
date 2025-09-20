"use client";

import { ReactNode } from "react";
import { useTranslation } from "../../../contexts/I18nContext";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease";
    period: string;
  };
  icon: ReactNode;
  color: "blue" | "orange" | "green" | "yellow" | "red";
  loading?: boolean;
}

const colorMap = {
  blue: {
    bg: "bg-blue-50",
    icon: "text-blue-600",
    value: "text-blue-900",
    border: "border-blue-200"
  },
  orange: {
    bg: "bg-orange-50", 
    icon: "text-orange-600",
    value: "text-orange-900",
    border: "border-orange-200"
  },
  green: {
    bg: "bg-green-50",
    icon: "text-green-600", 
    value: "text-green-900",
    border: "border-green-200"
  },
  yellow: {
    bg: "bg-yellow-50",
    icon: "text-yellow-600",
    value: "text-yellow-900", 
    border: "border-yellow-200"
  },
  red: {
    bg: "bg-red-50",
    icon: "text-red-600",
    value: "text-red-900",
    border: "border-red-200"
  }
};

export default function KPICard({ title, value, change, icon, color, loading = false }: KPICardProps) {
  const colors = colorMap[color];
  const { isRTL, t } = useTranslation();

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
          <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border ${colors.border} p-6 shadow-sm hover:shadow-md transition-shadow duration-200`}>
      <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${colors.value} mb-2 arabic-numbers`}>{value}</p>
          {change && (
            <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse justify-end' : 'justify-start'}`}>
              <span className={`text-xs font-medium ${
                change.type === "increase" ? "text-green-600" : "text-red-600"
              }`}>
                {change.type === "increase" ? (isRTL ? "↖" : "↗") : (isRTL ? "↙" : "↘")} {change.value}%
              </span>
              <span className="text-xs text-gray-500">{change.period}</span>
            </div>
          )}
        </div>
        <div className={`${colors.bg} ${colors.icon} p-3 rounded-lg ${isRTL ? 'rtl-mirror' : ''}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
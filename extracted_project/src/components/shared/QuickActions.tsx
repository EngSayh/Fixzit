"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "../../../contexts/I18nContext";

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: "blue" | "orange" | "green" | "purple";
  href?: string;
  onClick?: () => void;
}

const colorMap = {
  blue: "bg-blue-600 hover:bg-blue-700 text-white",
  orange: "bg-orange-600 hover:bg-orange-700 text-white", 
  green: "bg-green-600 hover:bg-green-700 text-white",
  purple: "bg-purple-600 hover:bg-purple-700 text-white"
};

export default function QuickActions() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const [loading, setLoading] = useState<string | null>(null);

  const quickActions: QuickAction[] = [
    {
      id: "create-work-order",
      title: isRTL ? "إنشاء أمر عمل" : "Create Work Order",
      description: isRTL ? "طلب صيانة جديد" : "New maintenance request",
      icon: "🔧",
      color: "blue",
      href: "/work-orders/create"
    },
    {
      id: "add-property", 
      title: isRTL ? "إضافة عقار" : "Add Property",
      description: isRTL ? "تسجيل عقار جديد" : "Register new property",
      icon: "🏢",
      color: "green",
      href: "/properties/add"
    },
    {
      id: "process-payment",
      title: isRTL ? "معالجة دفعة" : "Process Payment", 
      description: isRTL ? "التعامل مع دفعة المستأجر" : "Handle tenant payment",
      icon: "💳",
      color: "orange",
      href: "/finance/payments"
    },
    {
      id: "schedule-inspection",
      title: isRTL ? "جدولة فحص" : "Schedule Inspection",
      description: isRTL ? "فحص العقار" : "Property inspection",
      icon: "🔍", 
      color: "purple",
      href: "/compliance/inspections"
    }
  ];

  const handleAction = async (action: QuickAction) => {
    if (action.onClick) {
      setLoading(action.id);
      try {
        await action.onClick();
      } finally {
        setLoading(null);
      }
    } else if (action.href) {
      setLoading(action.id);
      router.push(action.href);
      // Reset loading after navigation
      setTimeout(() => setLoading(null), 1000);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="p-6 border-b border-gray-100">
        <h3 className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
          {isRTL ? 'الإجراءات السريعة' : 'Quick Actions'}
        </h3>
        <p className={`text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
          {isRTL ? 'الإجراءات شائعة الاستخدام' : 'Commonly used actions'}
        </p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              disabled={loading === action.id}
              className={`${colorMap[action.color]} p-4 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
            >
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-2xl">{action.icon}</span>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <div className="font-medium">
                    {loading === action.id ? (
                      <span className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        {isRTL ? 'جارٍ التحميل...' : 'Loading...'}
                      </span>
                    ) : (
                      action.title
                    )}
                  </div>
                  <div className="text-sm opacity-90">{action.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
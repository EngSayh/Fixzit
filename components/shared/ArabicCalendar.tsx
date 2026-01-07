/**
 * ArabicCalendar - Hijri/Gregorian date picker
 * 
 * @description Calendar component supporting both Hijri and Gregorian
 * calendars for Saudi Arabian property contracts and scheduling.
 * 
 * @features
 * - Hijri (Islamic) calendar support
 * - Gregorian calendar support
 * - Toggle between calendars
 * - RTL-first layout
 * - Date range selection
 * - Disabled dates
 */
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "@/components/ui/icons";

// ============================================================================
// TYPES
// ============================================================================

export type CalendarType = "gregorian" | "hijri";

export interface ArabicCalendarProps {
  /** Selected date */
  value?: Date | null;
  /** Callback when date is selected */
  onChange?: (date: Date) => void;
  /** Initial calendar type */
  calendarType?: CalendarType;
  /** Allow calendar type toggle */
  allowToggle?: boolean;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Disabled specific dates */
  disabledDates?: Date[];
  /** Current locale */
  locale?: "ar" | "en";
  /** Custom class name */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const WEEKDAYS_AR = ["أحد", "إثن", "ثلا", "أرب", "خمس", "جمع", "سبت"];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];
const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const HIJRI_MONTHS_AR = [
  "محرم", "صفر", "ربيع الأول", "ربيع الثاني",
  "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
  "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
];
const HIJRI_MONTHS_EN = [
  "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani",
  "Jumada al-Ula", "Jumada al-Thani", "Rajab", "Sha'ban",
  "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
];

// ============================================================================
// HIJRI CONVERSION (Simplified Umm al-Qura approximation)
// For production, use a proper library like hijri-converter
// ============================================================================

interface HijriDate {
  year: number;
  month: number;
  day: number;
}

const gregorianToHijri = (date: Date): HijriDate => {
  // Simplified conversion using Intl API
  const hijriFormatter = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = hijriFormatter.formatToParts(date);
  
  const year = parseInt(parts.find(p => p.type === "year")?.value || "1446");
  const month = parseInt(parts.find(p => p.type === "month")?.value || "1");
  const day = parseInt(parts.find(p => p.type === "day")?.value || "1");
  
  return { year, month, day };
};

const _getHijriMonthDays = (year: number, month: number): number => {
  // Hijri months alternate 30/29 days (simplified)
  return month % 2 === 1 ? 30 : 29;
};

// ============================================================================
// COMPONENT
// ============================================================================

export function ArabicCalendar({
  value,
  onChange,
  calendarType: initialType = "gregorian",
  allowToggle = true,
  minDate,
  maxDate,
  disabledDates = [],
  locale = "ar",
  className,
  placeholder,
}: ArabicCalendarProps) {
  const isRTL = locale === "ar";
  const [calendarType, setCalendarType] = useState<CalendarType>(initialType);
  // Use value prop or null initially to avoid hydration mismatch from new Date()
  const [viewDate, setViewDate] = useState<Date | null>(value || null);
  const [isOpen, setIsOpen] = useState(false);

  // Set viewDate to current date on client mount if not provided via value prop
  useEffect(() => {
    if (!viewDate && !value) {
      setViewDate(new Date());
    }
  }, [viewDate, value]);

  const weekdays = isRTL ? WEEKDAYS_AR : WEEKDAYS_EN;
  const months = calendarType === "hijri"
    ? (isRTL ? HIJRI_MONTHS_AR : HIJRI_MONTHS_EN)
    : (isRTL ? MONTHS_AR : MONTHS_EN);

  // Use a default date for calculations when viewDate is null (during SSR)
  const effectiveViewDate = viewDate || new Date(2020, 0, 1); // Safe fallback for SSR

  // Calculate calendar grid
  const calendarDays = useMemo(() => {
    const days: Array<{ date: Date; isCurrentMonth: boolean; hijri?: HijriDate }> = [];
    const year = effectiveViewDate.getFullYear();
    const month = effectiveViewDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    
    // Add days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false, hijri: gregorianToHijri(date) });
    }
    
    // Add days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      days.push({ date, isCurrentMonth: true, hijri: gregorianToHijri(date) });
    }
    
    // Add days from next month to complete grid (6 rows x 7 days)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false, hijri: gregorianToHijri(date) });
    }
    
    return days;
  }, [effectiveViewDate]);

  const currentHijri = gregorianToHijri(effectiveViewDate);

  const isDateDisabled = (date: Date): boolean => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return disabledDates.some(d => 
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    );
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const isSelected = (date: Date): boolean => {
    if (!value) return false;
    return (
      date.getFullYear() === value.getFullYear() &&
      date.getMonth() === value.getMonth() &&
      date.getDate() === value.getDate()
    );
  };

  const navigateMonth = (delta: number) => {
    setViewDate(prev => {
      const current = prev || new Date();
      return new Date(current.getFullYear(), current.getMonth() + delta, 1);
    });
  };

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return;
    onChange?.(date);
    setIsOpen(false);
  };

  const formatDisplayDate = (date: Date): string => {
    if (calendarType === "hijri") {
      const hijri = gregorianToHijri(date);
      return isRTL
        ? `${hijri.day} ${HIJRI_MONTHS_AR[hijri.month - 1]} ${hijri.year}`
        : `${hijri.day} ${HIJRI_MONTHS_EN[hijri.month - 1]} ${hijri.year}`;
    }
    return date.toLocaleDateString(isRTL ? "ar-SA" : "en-SA");
  };

  return (
    <div className={cn("relative inline-block w-full", className)} dir={isRTL ? "rtl" : "ltr"}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 border rounded-lg",
          "bg-white hover:bg-neutral-50 focus:ring-2 focus:ring-primary-200",
          "text-start"
        )}
      >
        <span className={cn(!value && "text-neutral-400")}>
          {value ? formatDisplayDate(value) : (placeholder || (isRTL ? "اختر التاريخ" : "Select date"))}
        </span>
        <CalendarIcon className="w-5 h-5 text-neutral-400" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 p-4 bg-white border rounded-lg shadow-lg w-full min-w-[300px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => navigateMonth(isRTL ? 1 : -1)}
              className="p-1 hover:bg-neutral-100 rounded"
            >
              {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>

            <div className="text-center">
              <p className="font-semibold text-neutral-800">
                {calendarType === "hijri"
                  ? `${months[currentHijri.month - 1]} ${currentHijri.year}`
                  : `${months[effectiveViewDate.getMonth()]} ${effectiveViewDate.getFullYear()}`}
              </p>
              {calendarType === "hijri" && (
                <p className="text-xs text-neutral-500">
                  {MONTHS_AR[effectiveViewDate.getMonth()]} {effectiveViewDate.getFullYear()}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => navigateMonth(isRTL ? -1 : 1)}
              className="p-1 hover:bg-neutral-100 rounded"
            >
              {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>

          {/* Calendar type toggle */}
          {allowToggle && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => setCalendarType("gregorian")}
                className={cn(
                  "px-3 py-1 text-sm rounded-full transition-colors",
                  calendarType === "gregorian"
                    ? "bg-primary-500 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                )}
              >
                {isRTL ? "ميلادي" : "Gregorian"}
              </button>
              <button
                type="button"
                onClick={() => setCalendarType("hijri")}
                className={cn(
                  "px-3 py-1 text-sm rounded-full transition-colors",
                  calendarType === "hijri"
                    ? "bg-primary-500 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                )}
              >
                {isRTL ? "هجري" : "Hijri"}
              </button>
            </div>
          )}

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekdays.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-neutral-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map(({ date, isCurrentMonth, hijri }, index) => {
              const disabled = isDateDisabled(date);
              const selected = isSelected(date);
              const today = isToday(date);

              return (
                <button
                  key={index}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleDateClick(date)}
                  className={cn(
                    "relative p-2 text-center rounded-lg transition-colors",
                    "hover:bg-primary-50",
                    !isCurrentMonth && "text-neutral-300",
                    isCurrentMonth && "text-neutral-700",
                    disabled && "opacity-30 cursor-not-allowed",
                    selected && "bg-primary-500 text-white hover:bg-primary-600",
                    today && !selected && "ring-1 ring-primary-500"
                  )}
                >
                  <span className="text-sm">
                    {calendarType === "hijri" ? hijri?.day : date.getDate()}
                  </span>
                  {calendarType === "hijri" && (
                    <span className="block text-[10px] text-neutral-400">
                      {date.getDate()}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Today button */}
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                setViewDate(today);
                handleDateClick(today);
              }}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              {isRTL ? "اليوم" : "Today"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArabicCalendar;

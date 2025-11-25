"use client";

import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  title: string;
  value: number;
  count: number;
  target: number;
  format: "percentage" | "number";
  tooltip: string;
}

export default function MetricCard({
  title,
  value,
  count,
  target,
  format,
  tooltip,
}: Props) {
  const isGood = value <= target;
  const isWarning = value > target && value <= target * 1.5;

  const getColor = () => {
    if (isGood) return "text-green-600";
    if (isWarning) return "text-yellow-600";
    return "text-red-600";
  };

  const getBgColor = () => {
    if (isGood) return "bg-green-50";
    if (isWarning) return "bg-yellow-50";
    return "bg-red-50";
  };

  const formatValue = (val: number) => {
    if (format === "percentage") {
      return `${val.toFixed(2)}%`;
    }
    return val.toLocaleString();
  };

  return (
    <Card className={`p-6 ${getBgColor()}`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-gray-400" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className={`text-3xl font-bold ${getColor()} mb-2`}>
        {formatValue(value)}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{count} of orders</span>
        <span className={`font-medium ${getColor()}`}>
          Target: {formatValue(target)}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            isGood ? "bg-green-500" : isWarning ? "bg-yellow-500" : "bg-red-500"
          }`}
          style={{ width: `${Math.min(100, (value / (target * 2)) * 100)}%` }}
        />
      </div>
    </Card>
  );
}

"use client";

import { useTranslation } from "../../../contexts/I18nContext";

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface SimpleChartProps {
  data: ChartData[];
  type: "bar" | "line" | "donut";
  title: string;
  height?: number;
  showValues?: boolean;
}

export default function SimpleChart({ data, type, title, height = 300, showValues = true }: SimpleChartProps) {
  const { isRTL } = useTranslation();
  const maxValue = Math.max(...data.map(d => d.value));
  const colors = ["#0078D4", "#F6851F", "#00A859", "#FFB400", "#E74C3C", "#9B59B6"];

  const BarChart = () => (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="w-20 text-xs text-gray-600 truncate">{item.label}</div>
          <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
            <div 
              className="h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2"
              style={{
                width: `${(item.value / maxValue) * 100}%`,
                backgroundColor: item.color || colors[index % colors.length]
              }}
            >
              {showValues && (
                <span className="text-xs text-white font-medium">
                  {item.value}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const LineChart = () => {
    const points = data.map((item, index) => ({
      x: (index / (data.length - 1)) * 100,
      y: 100 - ((item.value / maxValue) * 80)
    }));
    
    const pathData = points.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ');

    return (
      <div className="relative">
        <svg width="100%" height={height} className="overflow-visible">
          {/* Grid lines */}
          {[...Array(5)].map((_, i) => (
            <line
              key={i}
              x1="0"
              y1={20 + (i * (height - 40) / 4)}
              x2="100%"
              y2={20 + (i * (height - 40) / 4)}
              stroke="#f3f4f6"
              strokeWidth="1"
            />
          ))}
          
          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke={colors[0]}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Points */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={`${point.x}%`}
                cy={point.y}
                r="4"
                fill={colors[0]}
                stroke="white"
                strokeWidth="2"
              />
              {showValues && (
                <text
                  x={`${point.x}%`}
                  y={point.y - 10}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                >
                  {data[index].value}
                </text>
              )}
            </g>
          ))}
        </svg>
        
        {/* X-axis labels */}
        <div className="flex justify-between mt-2">
          {data.map((item, index) => (
            <span key={index} className="text-xs text-gray-600">
              {item.label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const DonutChart = () => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativePercentage = 0;

    const radius = 80;
    const strokeWidth = 20;
    const normalizedRadius = radius - strokeWidth * 2;
    const circumference = normalizedRadius * 2 * Math.PI;

    return (
      <div className="flex items-center gap-6">
        <div className="relative">
          <svg width={radius * 2} height={radius * 2}>
            <circle
              stroke="#f3f4f6"
              fill="transparent"
              strokeWidth={strokeWidth}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
              const strokeDashoffset = -((cumulativePercentage / 100) * circumference);
              
              cumulativePercentage += percentage;
              
              return (
                <circle
                  key={item.label}
                  stroke={item.color || colors[index % colors.length]}
                  fill="transparent"
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  r={normalizedRadius}
                  cx={radius}
                  cy={radius}
                  className="transition-all duration-1000 ease-out"
                  style={{ transformOrigin: '50% 50%', transform: 'rotate(-90deg)' }}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{total}</div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={item.label} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color || colors[index % colors.length] }}
              />
              <span className="text-sm text-gray-700">{item.label}</span>
              {showValues && (
                <span className="text-sm font-medium text-gray-900">
                  {item.value} ({Math.round((item.value / total) * 100)}%)
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="p-6 border-b border-gray-100">
        <h3 className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>{title}</h3>
      </div>
      <div className="p-6">
        {type === "bar" && <BarChart />}
        {type === "line" && <LineChart />}
        {type === "donut" && <DonutChart />}
      </div>
    </div>
  );
}
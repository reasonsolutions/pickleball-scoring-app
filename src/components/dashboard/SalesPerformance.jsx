import React from 'react';

export default function SalesPerformance() {
  const percentage = 17.9;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Sales Performance</h3>
        <svg className="w-5 h-5 text-gray-400 cursor-pointer" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </div>

      {/* Circular Progress Chart */}
      <div className="flex flex-col items-center justify-center py-8">
        <div className="relative w-40 h-40">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#f97316"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
            {/* Inner circle for donut effect */}
            <circle
              cx="50"
              cy="50"
              r="35"
              fill="white"
            />
          </svg>
          
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-gray-900">{percentage}%</span>
            <span className="text-xs text-gray-500 mt-1">Since yesterday</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-3 mt-8 border-t border-gray-100 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-sm text-gray-700">Total Sales per day</span>
          </div>
          <span className="text-xs text-gray-500">For week</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-orange-200 rounded-full"></div>
            <span className="text-sm text-gray-700">Average Sales</span>
          </div>
          <span className="text-xs text-gray-500">For today</span>
        </div>
      </div>

      {/* See Details Link */}
      <button className="w-full mt-6 text-center text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center justify-center gap-2">
        See Details
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

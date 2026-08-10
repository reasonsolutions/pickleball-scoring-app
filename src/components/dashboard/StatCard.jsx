import React from 'react';

export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  trendValue, 
  trendColor = 'text-green-500',
  backgroundColor = 'bg-white',
  accentColor = 'text-orange-500'
}) {
  return (
    <div className={`${backgroundColor} rounded-lg p-6 shadow-sm border border-gray-100`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-gray-600 text-sm font-medium mb-2">{title}</p>
          <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
          {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <div className={`${accentColor} text-2xl`}>
            {icon}
          </div>
        )}
      </div>
      
      {trend && (
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${trendColor}`}>
            {trend === 'up' ? '↑' : '↓'} {trendValue}
          </span>
          <span className="text-gray-500 text-xs">vs last month</span>
        </div>
      )}
    </div>
  );
}

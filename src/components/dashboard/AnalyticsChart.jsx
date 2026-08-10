import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function AnalyticsChart() {
  const { currentUser, isTeamAdmin } = useAuth();
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    changePercent: 0,
    conversionRate: 0
  });

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        // Fetch fixtures data to build analytics
        const fixturesRef = collection(db, 'fixtures');
        let fixturesQuery = fixturesRef;
        
        if (isTeamAdmin() && currentUser?.tournamentId) {
          fixturesQuery = query(fixturesRef, where('tournamentId', '==', currentUser.tournamentId));
        }
        
        const fixturesSnapshot = await getDocs(fixturesQuery);
        const fixtures = fixturesSnapshot.docs.map(doc => doc.data());

        // Group fixtures by month
        const monthlyData = {};
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG'];
        
        months.forEach(month => {
          monthlyData[month] = 0;
        });

        // Count fixtures per month (simulated data based on fixture count)
        fixtures.forEach(fixture => {
          const monthIndex = Math.floor(Math.random() * 8);
          const month = months[monthIndex];
          monthlyData[month] += Math.floor(Math.random() * 100) + 50;
        });

        // Convert to chart format
        const chartDataPoints = months.map(month => ({
          month,
          value: monthlyData[month] * 50 // Multiply to get realistic sales numbers
        }));

        setChartData(chartDataPoints);

        // Calculate stats
        const totalValue = chartDataPoints.reduce((sum, item) => sum + item.value, 0);
        setStats({
          totalSales: totalValue,
          changePercent: -0.4,
          conversionRate: 0.73
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [currentUser, isTeamAdmin]);

  const maxValue = Math.max(...chartData.map(d => d.value), 5000);
  
  const getHeight = (value) => (value / maxValue) * 200;

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
          <p className="text-gray-500 text-sm mt-1">
            <span className="text-red-500 font-medium">${stats.totalSales.toLocaleString()}</span>
            <span className="text-gray-500 ml-2">total sales</span>
            <span className="text-red-500 ml-2 text-xs">{stats.changePercent > 0 ? '+' : ''}{stats.changePercent}%</span>
          </p>
        </div>
        <select className="text-sm border border-gray-300 rounded px-3 py-1 text-gray-700">
          <option>This year</option>
          <option>Last year</option>
          <option>Last 6 months</option>
        </select>
      </div>

      {/* Chart Container */}
      <div className="relative h-64 flex items-end justify-between gap-2 px-4 py-8 bg-gradient-to-b from-orange-50 to-transparent rounded-lg">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 py-8">
          <span>${(maxValue / 1000).toFixed(0)}K</span>
          <span>${(maxValue * 0.8 / 1000).toFixed(0)}K</span>
          <span>${(maxValue * 0.6 / 1000).toFixed(0)}K</span>
          <span>${(maxValue * 0.4 / 1000).toFixed(0)}K</span>
          <span>${(maxValue * 0.2 / 1000).toFixed(0)}K</span>
          <span>$0K</span>
        </div>

        {/* Bars */}
        <div className="flex items-end justify-between gap-2 w-full ml-8">
          {chartData.map((point, idx) => (
            <div key={idx} className="flex flex-col items-center flex-1">
              <div className="relative w-full flex justify-center">
                {/* Bar with gradient */}
                <div
                  className="w-8 bg-gradient-to-t from-orange-500 to-orange-400 rounded-t-lg transition-all duration-300 hover:from-orange-600 hover:to-orange-500 relative group"
                  style={{ height: `${getHeight(point.value)}px` }}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    ${(point.value / 1000).toFixed(1)}K
                  </div>
                </div>
              </div>
              <span className="text-xs text-gray-500 mt-2">{point.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-6 mt-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
          <span className="text-gray-600">Total Sales per day</span>
          <span className="text-gray-400">For week</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-200 rounded-full"></div>
          <span className="text-gray-600">Average Sales</span>
          <span className="text-gray-400">For today</span>
        </div>
      </div>
    </div>
  );
}

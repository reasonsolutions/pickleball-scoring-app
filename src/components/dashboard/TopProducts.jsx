import React from 'react';

export default function TopProducts() {
  const products = [
    {
      id: 1,
      name: 'Blid Shorts',
      category: 'Product',
      sales: '127 pcs',
      revenue: '$1,890',
      stock: '120',
      status: 'In Stock'
    },
    {
      id: 2,
      name: 'T-Shirts_Mid',
      category: 'Product',
      sales: '540 pcs',
      revenue: '$2,889',
      stock: '100',
      status: 'Out of stock'
    }
  ];

  const getStatusColor = (status) => {
    return status === 'In Stock' 
      ? 'text-green-600 bg-green-50' 
      : 'text-red-600 bg-red-50';
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Top Products</h3>
        <a href="#" className="text-orange-500 hover:text-orange-600 text-sm font-medium flex items-center gap-2">
          See Details
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border border-gray-300 rounded"></div>
                  Blid Shorts
                </div>
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Product</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Sales</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Revenue</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Stock</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border border-gray-300 rounded"></div>
                    <span className="font-medium text-gray-900">{product.name}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-gray-600">{product.category}</td>
                <td className="py-4 px-4 text-gray-600">{product.sales}</td>
                <td className="py-4 px-4 font-semibold text-gray-900">{product.revenue}</td>
                <td className="py-4 px-4 text-gray-600">{product.stock}</td>
                <td className="py-4 px-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                    {product.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

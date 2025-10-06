import React, { useState } from 'react';
import MainLayout from '../components/MainLayout';
import HomePageVideos from '../components/HomePageVideos';
import NewsManagement from '../components/NewsManagement';

export default function ContentManagement() {
  const [activeTab, setActiveTab] = useState('home-videos');

  const tabs = [
    {
      id: 'home-videos',
      name: 'Home Page Videos',
      component: HomePageVideos
    },
    {
      id: 'news',
      name: 'News',
      component: NewsManagement
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || HomePageVideos;

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Management</h1>
          <p className="text-gray-600">Manage website content and featured media</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm">
          <ActiveComponent />
        </div>
      </div>
    </MainLayout>
  );
}
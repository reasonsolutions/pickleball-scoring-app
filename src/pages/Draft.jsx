import React, { useState } from 'react';
import MainLayout from '../components/MainLayout';
import DraftSettings from '../components/DraftSettings';
import DraftPlayers from '../components/DraftPlayers';
import DraftTeams from '../components/DraftTeams';

export default function Draft() {
  const [activeTab, setActiveTab] = useState('settings');

  const tabs = [
    { id: 'settings', name: 'Draft Settings', component: DraftSettings },
    { id: 'players', name: 'Players', component: DraftPlayers },
    { id: 'teams', name: 'Teams', component: DraftTeams }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Draft Management
            </h1>
            <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
              Manage draft settings and player assignments
            </p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => window.open('/admin-draft-view', '_blank')}
              className="btn btn-secondary px-6 py-3 text-black font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
              style={{ backgroundColor: 'var(--primary-purple)', borderColor: 'var(--primary-purple)' }}
            >
              Admin View
            </button>
            <button
              onClick={() => window.open('/draft-main-screen-display', '_blank')}
              className="btn btn-secondary px-6 py-3 text-black font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
              style={{ backgroundColor: 'var(--primary-green)', borderColor: 'var(--primary-green)' }}
            >
              Main Screen Display
            </button>
            <button
              onClick={() => window.open('/team-draft-room', '_blank')}
              className="btn btn-primary px-6 py-3 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
              style={{ backgroundColor: 'var(--primary-blue)', borderColor: 'var(--primary-blue)' }}
            >
              Team Draft Room
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="card shadow-xl mb-6" style={{ backgroundColor: 'var(--bg-card)' }}>
          <div className="card-body p-0">
            <div className="flex justify-center border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex space-x-12 px-8 py-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`relative px-4 py-2 text-lg font-medium transition-colors duration-200 ${
                      activeTab === tab.id ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                    style={activeTab === tab.id ? {
                      color: 'var(--primary-blue)'
                    } : {
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {tab.name}
                    {activeTab === tab.id && (
                      <div
                        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                        style={{ backgroundColor: 'var(--primary-blue)' }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {ActiveComponent && <ActiveComponent setActiveTab={setActiveTab} />}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

import React from 'react';
import PublicLogosViewer from '../components/PublicLogosViewer';
import MainLayout from '../components/MainLayout';

const LogosManager = () => {
  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PublicLogosViewer />
      </div>
    </MainLayout>
  );
};

export default LogosManager;
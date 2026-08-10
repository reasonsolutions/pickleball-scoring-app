import React, { lazy, Suspense } from 'react';

const AdsController = lazy(() => import('./AdsController'));

export default function AdsControllerWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="loading loading-spinner loading-lg"></div></div>}>
      <AdsController />
    </Suspense>
  );
}

import React, { useState } from 'react';
import { deleteAllFixtures } from '../utils/cleanup';
import MainLayout from '../components/MainLayout';

export default function AdminCleanup() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [result, setResult] = useState(null);

  const handleDeleteAllFixtures = async () => {
    if (!window.confirm('Are you sure you want to delete ALL fixtures? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setResult(null);

    try {
      const deleteResult = await deleteAllFixtures();
      setResult(deleteResult);
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Admin Cleanup</h1>
          <p className="text-base-content/70 text-lg">Database maintenance tools</p>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-4">Delete All Fixtures</h2>
            
            <div className="alert alert-warning mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h3 className="font-bold">Warning!</h3>
                <div className="text-sm">This will permanently delete all fixtures from the database. This action cannot be undone.</div>
              </div>
            </div>

            <p className="mb-6">
              Use this tool to clean up all existing fixtures from the database. This is useful when you want to start fresh with the new fixture structure.
            </p>

            <div className="card-actions">
              <button 
                className={`btn btn-error ${isDeleting ? 'loading' : ''}`}
                onClick={handleDeleteAllFixtures}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete All Fixtures'}
              </button>
            </div>

            {result && (
              <div className={`alert ${result.success ? 'alert-success' : 'alert-error'} mt-6`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  {result.success ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
                <div>
                  {result.success ? (
                    <div>
                      <h3 className="font-bold">Success!</h3>
                      <div className="text-sm">Deleted {result.deletedCount} fixtures successfully.</div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="font-bold">Error!</h3>
                      <div className="text-sm">{result.error}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
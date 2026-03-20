import React, { useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import NewHomeNavbar from '../components/NewHomeNavbar';
import Footer from '../components/Footer';

export default function AddVenueScript() {
  const [output, setOutput] = useState([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  // Venue mapping
  const venueMapping = {
    '48': '48 PicklePark',
    'The Build Crew': 'Pro-touch Manikonda',
    'FALCONS': 'House of Play (HOP)',
    'Bend it Club': 'Bend it BNR Hills',
    'DRC Sports Foundation': 'Ready Set Pickle',
    'Jubilee Hills Pickleball Club': 'Pickleball Collective - DMart',
    'Penguin': 'Vanam',
    'TRP': 'The Rooftop Pickle (TRP)',
    'Racket Garden Academy': 'Racket Garden',
    'Paddock': 'Paddock - Rooftop Pickle',
    'Ye': 'Vanam',
    'Courtyard Crusaders': 'The Pickleball Courtyard',
    'Vikings Pickleball club': 'House of Play (HOP)',
    'SOO Collective': 'SOO Coffee and Pickleball',
    'Gladiators PC': 'Pick Paddlers',
    'Badgers': 'Softserve',
    'Deccan collective': 'Olympians arena , apollo hospital',
    'The PB Social': 'The Pickleball Social',
    'Pro-touch': 'Pro-touch Manikonda',
    'BELLEZZA': 'Lodha Bellezza'
  };

  const log = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setOutput(prev => [...prev, { message, type, timestamp }]);
  };

  const clearOutput = () => {
    setOutput([]);
    setSummary(null);
  };

  const runScript = async () => {
    setLoading(true);
    clearOutput();

    try {
      log('Starting to add venue field to teams...', 'info');
      
      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      let updatedCount = 0;
      let notFoundCount = 0;

      for (const docSnapshot of teamsSnapshot.docs) {
        const team = docSnapshot.data();
        const teamName = team.name;
        const venue = venueMapping[teamName];

        if (venue) {
          await updateDoc(doc(db, 'teams', docSnapshot.id), {
            venue: venue
          });
          log(`✓ Updated ${teamName} with venue: ${venue}`, 'success');
          updatedCount++;
        } else {
          log(`✗ No venue found for team: ${teamName}`, 'error');
          notFoundCount++;
        }
      }

      setSummary({
        updated: updatedCount,
        notFound: notFoundCount,
        total: teamsSnapshot.docs.length
      });

      log('Done!', 'success');
    } catch (error) {
      log(`Error: ${error.message}`, 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#212121' }}>
      <NewHomeNavbar />
      
      <div className="py-8 sm:py-12">
        <div className="mx-auto px-4 max-w-2xl">
          <div className="bg-gray-800 rounded-lg p-6 sm:p-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Add Venue Field to Teams
            </h1>
            <p className="text-gray-300 mb-6">
              This script will add the venue field to all teams in the database.
            </p>

            <div className="flex gap-4 mb-6">
              <button
                onClick={runScript}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white font-bold py-2 px-6 rounded transition-colors"
              >
                {loading ? 'Running...' : 'Run Script'}
              </button>
              <button
                onClick={clearOutput}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded transition-colors"
              >
                Clear Output
              </button>
            </div>

            {/* Output */}
            <div className="bg-gray-900 rounded p-4 mb-6 max-h-96 overflow-y-auto font-mono text-sm">
              {output.length === 0 ? (
                <p className="text-gray-500">Output will appear here...</p>
              ) : (
                output.map((item, idx) => (
                  <div
                    key={idx}
                    className={`${
                      item.type === 'success'
                        ? 'text-green-400'
                        : item.type === 'error'
                        ? 'text-red-400'
                        : 'text-blue-400'
                    }`}
                  >
                    [{item.timestamp}] {item.message}
                  </div>
                ))
              )}
            </div>

            {/* Summary */}
            {summary && (
              <div className="bg-green-900 bg-opacity-30 border border-green-500 rounded p-4">
                <h3 className="text-lg font-bold text-green-400 mb-2">Summary</h3>
                <p className="text-gray-300">
                  <strong>Updated:</strong> {summary.updated} teams
                </p>
                <p className="text-gray-300">
                  <strong>Not found:</strong> {summary.notFound} teams
                </p>
                <p className="text-gray-300">
                  <strong>Total:</strong> {summary.total} teams
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

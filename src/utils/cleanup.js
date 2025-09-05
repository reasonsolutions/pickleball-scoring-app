// Cleanup utility to delete all fixtures from Firestore
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

export async function deleteAllFixtures() {
  try {
    console.log('Starting to delete all fixtures...');
    
    // Get all fixtures
    const fixturesSnapshot = await getDocs(collection(db, 'fixtures'));
    
    console.log(`Found ${fixturesSnapshot.docs.length} fixtures to delete`);
    
    if (fixturesSnapshot.docs.length === 0) {
      console.log('No fixtures found to delete');
      return;
    }
    
    // Delete each fixture
    const deletePromises = fixturesSnapshot.docs.map(async (fixtureDoc) => {
      await deleteDoc(doc(db, 'fixtures', fixtureDoc.id));
      console.log(`Deleted fixture: ${fixtureDoc.id}`);
    });
    
    await Promise.all(deletePromises);
    
    console.log('All fixtures deleted successfully!');
    return { success: true, deletedCount: fixturesSnapshot.docs.length };
  } catch (error) {
    console.error('Error deleting fixtures:', error);
    return { success: false, error: error.message };
  }
}

// You can call this function from the browser console:
// import { deleteAllFixtures } from './src/utils/cleanup.js';
// deleteAllFixtures();
#!/usr/bin/env node

import readline from 'readline';
import { spawn } from 'child_process';
import fs from 'fs';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function clearScreen() {
  console.clear();
}

function showHeader() {
  log('cyan', '\n╔════════════════════════════════════════════════════════╗');
  log('cyan', '║     Fixture Venues Update - Interactive Menu           ║');
  log('cyan', '╚════════════════════════════════════════════════════════╝\n');
}

function showMenu() {
  showHeader();
  log('blue', '📋 Select an option:\n');
  log('green', '  1) Verify Setup');
  log('green', '  2) Run Update');
  log('green', '  3) View Documentation');
  log('green', '  4) Check Service Account');
  log('green', '  5) Exit\n');
}

function runCommand(command, args = []) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      resolve(code);
    });
  });
}

async function verifySetup() {
  clearScreen();
  log('blue', '🔍 Running setup verification...\n');
  
  if (!fs.existsSync('firebase-service-account.json')) {
    log('red', '❌ Service account file not found!\n');
    log('yellow', 'Please download firebase-service-account.json from Firebase Console:');
    log('yellow', '1. Go to https://console.firebase.google.com/');
    log('yellow', '2. Select project: pickleball-app-9ccf7');
    log('yellow', '3. Click ⚙️ → Project Settings → Service Accounts');
    log('yellow', '4. Click "Generate New Private Key"');
    log('yellow', '5. Save as firebase-service-account.json in project root\n');
    
    rl.question('Press Enter to continue...', () => {
      showMenu();
      promptUser();
    });
    return;
  }

  const exitCode = await runCommand('node', ['verify-fixture-venues-setup.mjs']);
  
  rl.question('\nPress Enter to continue...', () => {
    showMenu();
    promptUser();
  });
}

async function runUpdate() {
  clearScreen();
  log('cyan', '════════════════════════════════════════════════════════');
  log('yellow', '⚠️  This will update venue information in your fixtures');
  log('cyan', '════════════════════════════════════════════════════════\n');
  
  rl.question('Do you want to proceed? (yes/no): ', async (answer) => {
    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      log('yellow', '\nCancelled\n');
      rl.question('Press Enter to continue...', () => {
        showMenu();
        promptUser();
      });
      return;
    }

    clearScreen();
    log('blue', '🚀 Starting fixture venue update...\n');
    
    const exitCode = await runCommand('node', ['update-fixture-venues.mjs']);
    
    if (exitCode === 0) {
      log('green', '\n✅ Update completed successfully');
    } else {
      log('red', '\n❌ Update failed');
    }
    
    rl.question('\nPress Enter to continue...', () => {
      showMenu();
      promptUser();
    });
  });
}

function viewDocumentation() {
  clearScreen();
  log('blue', '📚 Documentation Files:\n');
  
  const docs = [
    { name: 'FIXTURE_VENUES_QUICK_START.md', desc: 'Quick start guide (5 minutes)' },
    { name: 'UPDATE_FIXTURE_VENUES_SCRIPT.md', desc: 'Detailed documentation' }
  ];
  
  docs.forEach((doc, index) => {
    log('green', `  ${index + 1}) ${doc.name}`);
    log('cyan', `     ${doc.desc}`);
  });
  
  log('green', `  ${docs.length + 1}) Back to menu\n`);
  
  rl.question('Select an option: ', (choice) => {
    if (choice === '1') {
      log('blue', '\n📖 Opening FIXTURE_VENUES_QUICK_START.md...\n');
      const content = fs.readFileSync('FIXTURE_VENUES_QUICK_START.md', 'utf8');
      console.log(content);
      rl.question('\nPress Enter to continue...', () => {
        showMenu();
        promptUser();
      });
    } else if (choice === '2') {
      log('blue', '\n📖 Opening UPDATE_FIXTURE_VENUES_SCRIPT.md...\n');
      const content = fs.readFileSync('UPDATE_FIXTURE_VENUES_SCRIPT.md', 'utf8');
      console.log(content);
      rl.question('\nPress Enter to continue...', () => {
        showMenu();
        promptUser();
      });
    } else {
      showMenu();
      promptUser();
    }
  });
}

function checkServiceAccount() {
  clearScreen();
  log('blue', '🔐 Service Account Status:\n');
  
  if (fs.existsSync('firebase-service-account.json')) {
    log('green', '✅ firebase-service-account.json found\n');
    
    try {
      const content = JSON.parse(fs.readFileSync('firebase-service-account.json', 'utf8'));
      log('cyan', `   Project ID: ${content.project_id}`);
      log('cyan', `   Service Account Email: ${content.client_email}`);
      log('cyan', `   Private Key ID: ${content.private_key_id}`);
      log('green', '\n✅ File is valid JSON');
    } catch (error) {
      log('red', '❌ File is not valid JSON');
      log('yellow', `   Error: ${error.message}`);
    }
  } else {
    log('red', '❌ firebase-service-account.json not found\n');
    log('yellow', 'To download:');
    log('yellow', '1. Go to https://console.firebase.google.com/');
    log('yellow', '2. Select project: pickleball-app-9ccf7');
    log('yellow', '3. Click ⚙️ → Project Settings → Service Accounts');
    log('yellow', '4. Click "Generate New Private Key"');
    log('yellow', '5. Save as firebase-service-account.json in project root');
  }
  
  log('yellow', '\n⚠️  Never commit this file to version control!');
  log('yellow', '   Add to .gitignore: firebase-service-account.json\n');
  
  rl.question('Press Enter to continue...', () => {
    showMenu();
    promptUser();
  });
}

function promptUser() {
  rl.question('Enter your choice (1-5): ', async (choice) => {
    switch (choice) {
      case '1':
        await verifySetup();
        break;
      case '2':
        await runUpdate();
        break;
      case '3':
        viewDocumentation();
        break;
      case '4':
        checkServiceAccount();
        break;
      case '5':
        log('green', '\n👋 Goodbye!\n');
        rl.close();
        process.exit(0);
        break;
      default:
        log('red', '\n❌ Invalid choice. Please try again.\n');
        showMenu();
        promptUser();
    }
  });
}

// Start the menu
clearScreen();
showMenu();
promptUser();

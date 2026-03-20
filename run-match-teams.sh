#!/bin/bash

# This script runs the team matching script using Firebase CLI authentication

# First, ensure we're using the correct Firebase project
firebase use pickleball-app-9ccf7

# Export the Firebase token for the Node script
export FIREBASE_TOKEN=$(firebase auth:export --format=json 2>/dev/null | head -1)

# Run the Node script
node match-teams-with-hpl-clubs.js

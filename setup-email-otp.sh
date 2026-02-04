#!/bin/bash

echo "🚀 HPL Email OTP Setup Script"
echo "=============================="

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Get current project ID
PROJECT_ID=$(firebase use --project 2>/dev/null | grep "Now using project" | awk '{print $4}' || cat .firebaserc 2>/dev/null | grep -o '"default": "[^"]*"' | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ No Firebase project found. Please run 'firebase use --add' first."
    exit 1
fi

echo "✅ Found Firebase project: $PROJECT_ID"

# Install dependencies
echo "📦 Installing dependencies..."
cd functions
npm install

# Check if email config exists
EMAIL_CONFIG=$(firebase functions:config:get email 2>/dev/null)

if [ "$EMAIL_CONFIG" = "{}" ] || [ -z "$EMAIL_CONFIG" ]; then
    echo ""
    echo "📧 Email Configuration Required"
    echo "==============================="
    echo "To send real OTP emails, you need to configure email credentials."
    echo ""
    echo "Option 1: Gmail (Quick Setup)"
    echo "1. Enable 2FA on your Gmail account"
    echo "2. Generate App Password: Google Account → Security → 2-Step Verification → App passwords"
    echo "3. Run these commands:"
    echo "   firebase functions:config:set email.user=\"your-email@gmail.com\""
    echo "   firebase functions:config:set email.pass=\"your-16-char-app-password\""
    echo ""
    echo "Option 2: SendGrid (Production)"
    echo "1. Sign up at sendgrid.com (100 free emails/day)"
    echo "2. Get API key from dashboard"
    echo "3. Update functions/index.js to use SendGrid"
    echo ""
    echo "For now, the system will work with fallback OTP (shown in alert)."
else
    echo "✅ Email configuration found"
fi

# Update project ID in frontend
echo ""
echo "🔧 Updating project ID in frontend..."

# Update the project ID in the React component
sed -i.bak "s/your-project-id/$PROJECT_ID/g" ../src/pages/HplPlayerRegistration.jsx

if [ $? -eq 0 ]; then
    echo "✅ Updated project ID to: $PROJECT_ID"
    rm ../src/pages/HplPlayerRegistration.jsx.bak 2>/dev/null
else
    echo "⚠️  Could not auto-update project ID. Please manually replace 'your-project-id' with '$PROJECT_ID' in src/pages/HplPlayerRegistration.jsx"
fi

# Deploy functions
echo ""
echo "🚀 Deploying Firebase Functions..."
firebase deploy --only functions

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Setup Complete!"
    echo "=================="
    echo "✅ Dependencies installed"
    echo "✅ Project ID updated: $PROJECT_ID"
    echo "✅ Functions deployed"
    echo ""
    echo "📧 Email OTP Status:"
    if [ "$EMAIL_CONFIG" = "{}" ] || [ -z "$EMAIL_CONFIG" ]; then
        echo "⚠️  Using fallback mode (OTP shown in alert)"
        echo "   Configure email credentials to send real emails"
    else
        echo "✅ Real email sending enabled"
    fi
    echo ""
    echo "🔗 Function URLs:"
    echo "   Send OTP: https://us-central1-$PROJECT_ID.cloudfunctions.net/sendOtpEmail"
    echo "   Verify OTP: https://us-central1-$PROJECT_ID.cloudfunctions.net/verifyOtp"
    echo ""
    echo "📖 Next Steps:"
    echo "1. Test the email verification on your registration form"
    echo "2. Configure email credentials for real email sending"
    echo "3. See EMAIL_OTP_SETUP.md for detailed instructions"
else
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi
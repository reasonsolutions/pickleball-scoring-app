import React from 'react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing and using the Hyderabad Pickleball League website and services ("Service"), 
                you accept and agree to be bound by the terms and provision of this agreement. 
                If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                Hyderabad Pickleball League provides an online platform for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Tournament registration and management</li>
                <li>Player rankings and statistics</li>
                <li>Match scheduling and results</li>
                <li>News and updates about pickleball events</li>
                <li>Payment processing for tournament fees</li>
                <li>Community features and networking</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">3.1 Registration</h3>
              <p className="text-gray-700 mb-4">
                To access certain features of our Service, you must register for an account. 
                You agree to provide accurate, current, and complete information during registration 
                and to update such information to keep it accurate, current, and complete.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">3.2 Account Security</h3>
              <p className="text-gray-700 mb-4">
                You are responsible for safeguarding the password and for maintaining the confidentiality 
                of your account. You agree not to disclose your password to any third party and to take 
                sole responsibility for activities that occur under your account.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">3.3 Account Termination</h3>
              <p className="text-gray-700 mb-4">
                We reserve the right to terminate or suspend your account at any time for violations 
                of these Terms of Service or for any other reason at our sole discretion.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Tournament Registration and Payments</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">4.1 Registration</h3>
              <p className="text-gray-700 mb-4">
                Tournament registration is subject to availability and payment of applicable fees. 
                Registration is not confirmed until payment is successfully processed.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">4.2 Payment Processing</h3>
              <p className="text-gray-700 mb-4">
                All payments are processed securely through Razorpay. By making a payment, 
                you agree to Razorpay's terms and conditions. We do not store your payment information.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">4.3 Fees and Charges</h3>
              <p className="text-gray-700 mb-4">
                Tournament fees are clearly displayed during registration. All fees are in Indian Rupees (INR) 
                unless otherwise specified. Additional charges may apply for payment processing.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. User Conduct</h2>
              <p className="text-gray-700 mb-4">
                You agree not to use the Service to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon the rights of others</li>
                <li>Upload or transmit harmful, offensive, or inappropriate content</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with the proper functioning of the Service</li>
                <li>Engage in any form of harassment or discrimination</li>
                <li>Use the Service for commercial purposes without authorization</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Intellectual Property</h2>
              <p className="text-gray-700 mb-4">
                The Service and its original content, features, and functionality are and will remain 
                the exclusive property of Hyderabad Pickleball League and its licensors. 
                The Service is protected by copyright, trademark, and other laws.
              </p>
              <p className="text-gray-700 mb-4">
                You may not reproduce, distribute, modify, create derivative works of, publicly display, 
                publicly perform, republish, download, store, or transmit any of the material on our Service 
                without prior written consent.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Tournament Rules and Regulations</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">7.1 Participation</h3>
              <p className="text-gray-700 mb-4">
                By registering for tournaments, you agree to abide by all tournament rules, 
                regulations, and codes of conduct as specified by the organizers.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">7.2 Eligibility</h3>
              <p className="text-gray-700 mb-4">
                Participants must meet age, skill level, and other eligibility requirements 
                as specified for each tournament.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">7.3 Conduct During Events</h3>
              <p className="text-gray-700 mb-4">
                Participants are expected to maintain sportsmanlike conduct during all events. 
                Unsportsmanlike behavior may result in disqualification and future event bans.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Cancellation and Refund Policy</h2>
              <p className="text-gray-700 mb-4">
                Please refer to our separate Refund Policy for detailed information about 
                cancellations, refunds, and related procedures.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Disclaimer of Warranties</h2>
              <p className="text-gray-700 mb-4">
                The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no representations 
                or warranties of any kind, express or implied, as to the operation of the Service or the 
                information, content, materials, or products included on the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                In no event shall Hyderabad Pickleball League, its directors, employees, partners, 
                agents, suppliers, or affiliates be liable for any indirect, incidental, punitive, 
                consequential, or similar damages arising out of or related to your use of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Indemnification</h2>
              <p className="text-gray-700 mb-4">
                You agree to defend, indemnify, and hold harmless Hyderabad Pickleball League and its 
                licensee and licensors, and their employees, contractors, agents, officers and directors, 
                from and against any and all claims, damages, obligations, losses, liabilities, costs 
                or debt, and expenses (including but not limited to attorney's fees).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Privacy Policy</h2>
              <p className="text-gray-700 mb-4">
                Your privacy is important to us. Please review our Privacy Policy, which also governs 
                your use of the Service, to understand our practices.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Governing Law</h2>
              <p className="text-gray-700 mb-4">
                These Terms shall be interpreted and governed by the laws of India. 
                Any disputes arising from these Terms shall be subject to the exclusive 
                jurisdiction of the courts in Hyderabad, India.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Changes to Terms</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to modify or replace these Terms at any time. 
                If a revision is material, we will try to provide at least 30 days notice 
                prior to any new terms taking effect.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Severability</h2>
              <p className="text-gray-700 mb-4">
                If any provision of these Terms is held to be unenforceable or invalid, 
                such provision will be changed and interpreted to accomplish the objectives 
                of such provision to the greatest extent possible under applicable law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Hyderabad Pickleball League</strong><br />
                  Email: hpl@centrecourt.ventures<br />
                  Address: Hyderabad, India
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
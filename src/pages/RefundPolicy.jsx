import React from 'react';

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Refund and Cancellation Policy</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Overview</h2>
              <p className="text-gray-700 mb-4">
                This Refund and Cancellation Policy outlines the terms and conditions for refunds 
                and cancellations for services provided by Hyderabad Pickleball League. 
                We are committed to providing fair and transparent refund policies for all our customers.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Tournament Registration Refunds</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">2.1 Cancellation by Participant</h3>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <div className="text-gray-700">
                  <p className="mb-2"><strong>More than 7 days before tournament:</strong> 100% refund (minus processing fees)</p>
                  <p className="mb-2"><strong>3-7 days before tournament:</strong> 75% refund</p>
                  <p className="mb-2"><strong>1-2 days before tournament:</strong> 50% refund</p>
                  <p><strong>Day of tournament or no-show:</strong> No refund</p>
                </div>
              </div>

              <h3 className="text-xl font-medium text-gray-800 mb-3">2.2 Cancellation by Organizer</h3>
              <p className="text-gray-700 mb-4">
                If we cancel a tournament due to unforeseen circumstances such as:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Weather conditions</li>
                <li>Insufficient registrations</li>
                <li>Venue unavailability</li>
                <li>Government restrictions or health concerns</li>
              </ul>
              <p className="text-gray-700 mb-4">
                Participants will receive a <strong>100% full refund</strong> including all processing fees, 
                or the option to transfer their registration to a future tournament.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">2.3 Medical Emergency</h3>
              <p className="text-gray-700 mb-4">
                In case of medical emergencies preventing participation, we offer:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>100% refund with valid medical certificate</li>
                <li>Option to transfer registration to future tournament</li>
                <li>Medical documentation must be provided within 48 hours of the tournament</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Membership and Subscription Refunds</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">3.1 Annual Memberships</h3>
              <p className="text-gray-700 mb-4">
                Annual membership fees are non-refundable after 30 days from the date of purchase. 
                Within the first 30 days, members may request a full refund if no services have been utilized.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">3.2 Monthly Subscriptions</h3>
              <p className="text-gray-700 mb-4">
                Monthly subscriptions can be cancelled at any time. Refunds for the current month 
                will be prorated based on unused days, minus a processing fee of ₹50.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Processing Fees</h2>
              <p className="text-gray-700 mb-4">
                Payment processing fees charged by Razorpay (typically 2-3% of transaction amount) 
                are non-refundable except in cases where the tournament is cancelled by the organizer.
              </p>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <p className="text-gray-700">
                  <strong>Note:</strong> Processing fees will be deducted from refund amounts unless 
                  the cancellation is due to organizer fault or medical emergency.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Refund Process</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">5.1 How to Request a Refund</h3>
              <ol className="list-decimal pl-6 text-gray-700 mb-4">
                <li>Contact us via email at hpl@centrecourt.ventures</li>
                <li>Include your registration/transaction ID</li>
                <li>Provide reason for cancellation</li>
                <li>Submit any required documentation (medical certificates, etc.)</li>
              </ol>

              <h3 className="text-xl font-medium text-gray-800 mb-3">5.2 Processing Time</h3>
              <p className="text-gray-700 mb-4">
                Refunds will be processed within:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li><strong>Credit/Debit Cards:</strong> 5-7 business days</li>
                <li><strong>Net Banking:</strong> 3-5 business days</li>
                <li><strong>UPI/Wallets:</strong> 1-3 business days</li>
              </ul>
              <p className="text-gray-700 mb-4">
                Refunds will be credited to the same payment method used for the original transaction.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">5.3 Refund Confirmation</h3>
              <p className="text-gray-700 mb-4">
                You will receive an email confirmation once your refund has been processed. 
                If you don't receive your refund within the specified timeframe, please contact 
                your bank or payment provider.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Non-Refundable Items</h2>
              <p className="text-gray-700 mb-4">
                The following items are non-refundable:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Digital content and downloads</li>
                <li>Personalized or customized items</li>
                <li>Gift certificates and vouchers</li>
                <li>Administrative and processing fees (except in organizer cancellations)</li>
                <li>Late registration fees</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Transfer Policy</h2>
              <p className="text-gray-700 mb-4">
                As an alternative to refunds, we offer registration transfers:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Transfer to another participant (subject to ₹100 administrative fee)</li>
                <li>Transfer to future tournament (subject to price difference, if any)</li>
                <li>Transfer requests must be made at least 48 hours before the tournament</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Dispute Resolution</h2>
              <p className="text-gray-700 mb-4">
                If you are not satisfied with our refund decision, you may:
              </p>
              <ol className="list-decimal pl-6 text-gray-700 mb-4">
                <li>Contact our customer service team for review</li>
                <li>Escalate to management within 30 days of the original decision</li>
                <li>Seek resolution through consumer protection forums if applicable</li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Force Majeure</h2>
              <p className="text-gray-700 mb-4">
                In cases of force majeure events (natural disasters, pandemics, government orders, etc.), 
                we will work with participants to provide fair solutions, which may include:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Full refunds</li>
                <li>Credit for future events</li>
                <li>Rescheduling of tournaments</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to Refund Policy</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to modify this refund policy at any time. 
                Changes will be effective immediately upon posting on our website. 
                Continued use of our services after changes constitutes acceptance of the new policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                For refund requests or questions about this policy, please contact us:
              </p>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Hyderabad Pickleball League</strong><br />
                  Email: hpl@centrecourt.ventures<br />
                  Phone: +91-XXXX-XXXXXX<br />
                  Address: Hyderabad, India<br />
                  <br />
                  <strong>Business Hours:</strong><br />
                  Monday - Friday: 9:00 AM - 6:00 PM IST<br />
                  Saturday: 10:00 AM - 4:00 PM IST<br />
                  Sunday: Closed
                </p>
              </div>
            </section>

            <div className="bg-green-50 border-l-4 border-green-400 p-4 mt-8">
              <p className="text-gray-700">
                <strong>Important:</strong> This refund policy is designed to be fair to both our customers 
                and our organization. We encourage participants to carefully review tournament details 
                and their schedules before registering to minimize the need for cancellations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
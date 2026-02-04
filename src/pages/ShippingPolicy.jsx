import React from 'react';

export default function ShippingPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Shipping and Delivery Policy</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Overview</h2>
              <p className="text-gray-700 mb-4">
                This Shipping and Delivery Policy applies to physical products sold through the 
                Hyderabad Pickleball League platform, including merchandise, equipment, and tournament materials. 
                Most of our services are digital (tournament registrations, memberships), but this policy 
                covers any physical items we may offer.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Shipping Coverage</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">2.1 Domestic Shipping (India)</h3>
              <p className="text-gray-700 mb-4">
                We currently ship to all major cities and towns across India. Shipping is available to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>All metro cities (Delhi, Mumbai, Bangalore, Chennai, Kolkata, Hyderabad)</li>
                <li>Tier 2 and Tier 3 cities</li>
                <li>Rural areas (subject to courier serviceability)</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">2.2 International Shipping</h3>
              <p className="text-gray-700 mb-4">
                International shipping is currently not available. We only ship within India at this time.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Shipping Methods and Timeframes</h2>
              
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <h3 className="text-xl font-medium text-gray-800 mb-3">Standard Shipping</h3>
                <ul className="list-disc pl-6 text-gray-700">
                  <li><strong>Metro Cities:</strong> 3-5 business days</li>
                  <li><strong>Other Cities:</strong> 5-7 business days</li>
                  <li><strong>Rural Areas:</strong> 7-10 business days</li>
                  <li><strong>Cost:</strong> ₹50 for orders under ₹500, Free for orders above ₹500</li>
                </ul>
              </div>

              <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
                <h3 className="text-xl font-medium text-gray-800 mb-3">Express Shipping</h3>
                <ul className="list-disc pl-6 text-gray-700">
                  <li><strong>Metro Cities:</strong> 1-2 business days</li>
                  <li><strong>Other Cities:</strong> 2-3 business days</li>
                  <li><strong>Cost:</strong> ₹150 (available for orders above ₹200)</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <h3 className="text-xl font-medium text-gray-800 mb-3">Same Day Delivery (Hyderabad Only)</h3>
                <ul className="list-disc pl-6 text-gray-700">
                  <li><strong>Coverage:</strong> Within Hyderabad city limits</li>
                  <li><strong>Timeframe:</strong> Same day if ordered before 2:00 PM</li>
                  <li><strong>Cost:</strong> ₹200</li>
                  <li><strong>Availability:</strong> Monday to Saturday</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Order Processing</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">4.1 Processing Time</h3>
              <p className="text-gray-700 mb-4">
                Orders are typically processed within 1-2 business days after payment confirmation. 
                During peak tournament seasons or sale periods, processing may take up to 3 business days.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">4.2 Order Confirmation</h3>
              <p className="text-gray-700 mb-4">
                You will receive an order confirmation email immediately after placing your order, 
                followed by a shipping confirmation with tracking details once your order is dispatched.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">4.3 Business Days</h3>
              <p className="text-gray-700 mb-4">
                Business days are Monday through Saturday, excluding national holidays and Sundays. 
                Orders placed on weekends or holidays will be processed on the next business day.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Shipping Costs</h2>
              
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 border-b text-left">Order Value</th>
                      <th className="px-4 py-2 border-b text-left">Standard Shipping</th>
                      <th className="px-4 py-2 border-b text-left">Express Shipping</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-2 border-b">Under ₹500</td>
                      <td className="px-4 py-2 border-b">₹50</td>
                      <td className="px-4 py-2 border-b">₹150</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b">₹500 - ₹1000</td>
                      <td className="px-4 py-2 border-b">Free</td>
                      <td className="px-4 py-2 border-b">₹100</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 border-b">Above ₹1000</td>
                      <td className="px-4 py-2 border-b">Free</td>
                      <td className="px-4 py-2 border-b">₹75</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Order Tracking</h2>
              <p className="text-gray-700 mb-4">
                Once your order is shipped, you will receive:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Email notification with tracking number</li>
                <li>SMS updates on delivery status</li>
                <li>Real-time tracking through our website</li>
                <li>Delivery confirmation once the package is delivered</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Delivery Information</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">7.1 Delivery Address</h3>
              <p className="text-gray-700 mb-4">
                Please ensure that the delivery address is complete and accurate. 
                We are not responsible for delays or non-delivery due to incorrect addresses.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">7.2 Delivery Attempts</h3>
              <p className="text-gray-700 mb-4">
                Our courier partners will make up to 3 delivery attempts. If delivery is unsuccessful 
                after 3 attempts, the package will be returned to us, and you may be charged for 
                re-shipping costs.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">7.3 Signature Required</h3>
              <p className="text-gray-700 mb-4">
                For orders above ₹2000, signature confirmation is required upon delivery. 
                Please ensure someone is available to receive the package.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Special Circumstances</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">8.1 Tournament Merchandise</h3>
              <p className="text-gray-700 mb-4">
                Tournament-specific merchandise ordered close to event dates will be available 
                for pickup at the venue to ensure timely delivery.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">8.2 Bulk Orders</h3>
              <p className="text-gray-700 mb-4">
                For bulk orders (10+ items), please contact us directly for special shipping 
                arrangements and potential discounts.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">8.3 Fragile Items</h3>
              <p className="text-gray-700 mb-4">
                Equipment and fragile items are packed with extra care and may require 
                additional processing time.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Delays and Issues</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">9.1 Weather and Natural Disasters</h3>
              <p className="text-gray-700 mb-4">
                Shipping may be delayed due to weather conditions, natural disasters, 
                or other circumstances beyond our control.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">9.2 Lost or Damaged Packages</h3>
              <p className="text-gray-700 mb-4">
                If your package is lost or damaged during shipping, please contact us within 
                48 hours of the expected delivery date. We will investigate and provide 
                a replacement or refund as appropriate.
              </p>

              <h3 className="text-xl font-medium text-gray-800 mb-3">9.3 Address Changes</h3>
              <p className="text-gray-700 mb-4">
                Address changes are possible only before the order is shipped. 
                Once shipped, address changes may incur additional charges.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Returns and Exchanges</h2>
              <p className="text-gray-700 mb-4">
                For information about returns and exchanges, please refer to our 
                separate Return Policy. Return shipping costs are typically borne by the customer 
                unless the return is due to our error.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                For shipping-related queries, please contact us:
              </p>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Hyderabad Pickleball League</strong><br />
                  Email: hpl@centrecourt.ventures<br />
                  Phone: +91-XXXX-XXXXXX<br />
                  WhatsApp: +91-XXXX-XXXXXX<br />
                  Address: Hyderabad, India<br />
                  <br />
                  <strong>Customer Service Hours:</strong><br />
                  Monday - Friday: 9:00 AM - 6:00 PM IST<br />
                  Saturday: 10:00 AM - 4:00 PM IST<br />
                  Sunday: Closed
                </p>
              </div>
            </section>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-8">
              <p className="text-gray-700">
                <strong>Note:</strong> This shipping policy applies only to physical products. 
                Digital services such as tournament registrations, memberships, and online content 
                are delivered electronically and do not require shipping.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
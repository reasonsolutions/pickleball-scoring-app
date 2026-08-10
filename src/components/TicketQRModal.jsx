import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function TicketQRModal({ tickets, onClose, orderInfo }) {
  const [qrCodes, setQrCodes] = useState({});
  const canvasRefs = useRef({});

  useEffect(() => {
    generateQRCodes();
  }, [tickets]);

  const generateQRCodes = async () => {
    const codes = {};
    for (const ticket of tickets) {
      try {
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, ticket.qrData, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        codes[ticket.id] = canvas.toDataURL();
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }
    setQrCodes(codes);
  };

  const downloadQR = (ticketId, ticketNumber) => {
    const link = document.createElement('a');
    link.download = `ticket-${ticketNumber}.png`;
    link.href = qrCodes[ticketId];
    link.click();
  };

  const downloadAllQRs = () => {
    tickets.forEach((ticket) => {
      if (qrCodes[ticket.id]) {
        setTimeout(() => {
          downloadQR(ticket.id, ticket.ticketNumber);
        }, ticket.ticketNumber * 100); // Stagger downloads
      }
    });
  };

  const printTickets = () => {
    const printWindow = window.open('', '_blank');
    const ticketsHTML = tickets.map((ticket, index) => `
      <div style="page-break-after: always; padding: 20px; text-align: center;">
        <h2>${orderInfo.matchDayName}</h2>
        <p><strong>Ticket #${ticket.ticketNumber}</strong></p>
        <p>${ticket.ticketTypeName}</p>
        <img src="${qrCodes[ticket.id]}" style="width: 300px; height: 300px;" />
        <p style="font-size: 12px; color: #666;">
          ${ticket.email}<br/>
          ${ticket.phoneNumber}
        </p>
        <p style="font-size: 10px; color: #999;">
          Ticket ID: ${ticket.ticketId.substring(0, 8)}...
        </p>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Tickets - ${orderInfo.matchDayName}</title>
          <style>
            body { font-family: Arial, sans-serif; }
            @media print {
              @page { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${ticketsHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Ticket QR Codes</h2>
            <p className="text-sm text-gray-600 mt-1">
              {tickets.length} ticket(s) for {orderInfo.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-b border-gray-200 flex gap-3">
          <button
            onClick={downloadAllQRs}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download All
          </button>
          <button
            onClick={printTickets}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print All
          </button>
        </div>

        {/* Tickets Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Ticket #{ticket.ticketNumber}
                </h3>
                <p className="text-sm text-gray-600 mb-4">{ticket.ticketTypeName}</p>
                
                {/* QR Code */}
                {qrCodes[ticket.id] ? (
                  <div className="bg-white p-4 rounded-lg inline-block mb-4">
                    <img 
                      src={qrCodes[ticket.id]} 
                      alt={`QR Code for Ticket ${ticket.ticketNumber}`}
                      className="w-64 h-64"
                    />
                  </div>
                ) : (
                  <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                  </div>
                )}

                {/* Ticket Info */}
                <div className="text-xs text-gray-500 space-y-1 mb-4">
                  <p>{ticket.email}</p>
                  <p>{ticket.phoneNumber}</p>
                  <p className="font-mono">ID: {ticket.ticketId.substring(0, 12)}...</p>
                </div>

                {/* Status Badge */}
                <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                  ticket.status === 'valid' 
                    ? 'bg-green-100 text-green-800'
                    : ticket.status === 'used'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {ticket.status.toUpperCase()}
                </span>

                {/* Download Button */}
                {qrCodes[ticket.id] && (
                  <button
                    onClick={() => downloadQR(ticket.id, ticket.ticketNumber)}
                    className="mt-4 w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
                  >
                    Download QR
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

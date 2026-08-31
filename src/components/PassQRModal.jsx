import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';

export default function PassQRModal({ pass, matchDayName, onClose }) {
  const [qrCodes, setQrCodes] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const passRefs = useRef([]);

  useEffect(() => {
    generateQRCodes();
  }, [pass]);

  const generateQRCodes = async () => {
    const codes = [];
    const numPasses = pass.numPasses || 1;
    
    for (let i = 0; i < numPasses; i++) {
      try {
        // Generate QR data for each pass
        const qrData = JSON.stringify({
          passId: pass.id,
          passNumber: i + 1,
          matchDayName: matchDayName,
          name: pass.name,
          team: pass.team,
          phoneNumber: pass.phoneNumber,
          status: pass.status,
          createdAt: pass.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });

        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, qrData, {
          width: 300,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        codes.push({
          number: i + 1,
          dataUrl: canvas.toDataURL()
        });
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }
    setQrCodes(codes);
  };

  const downloadPass = async (passNumber, passElement) => {
    if (!passElement) return;
    
    try {
      const canvas = await html2canvas(passElement, {
        scale: 2,
        backgroundColor: '#f5f5f5',
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      
      const link = document.createElement('a');
      link.download = `CCPL-Pass-${pass.name.replace(/\s+/g, '-')}-${passNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error downloading pass:', error);
    }
  };

  const downloadCurrentPass = () => {
    const passElement = passRefs.current[currentPage];
    downloadPass(qrCodes[currentPage].number, passElement);
  };

  const downloadAllPasses = () => {
    qrCodes.forEach((qr, index) => {
      setTimeout(() => {
        const passElement = passRefs.current[index];
        downloadPass(qr.number, passElement);
      }, index * 500); // Stagger downloads
    });
  };

  const printCurrentPass = () => {
    if (qrCodes.length === 0) return;
    
    const qr = qrCodes[currentPage];
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Pass ${qr.number} - ${pass.name}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Inter', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              background: #f5f5f5;
            }
            .pass-wrapper {
              width: 920px;
              height: 440px;
              display: flex;
              border-radius: 22px;
              overflow: hidden;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }
            .pass-left {
              flex: 1;
              background: #232323;
              padding: 38px 44px 34px;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              position: relative;
            }
            .pass-header {
              position: relative;
            }
            .pass-type-bar {
              background: #d97b3f;
              color: white;
              padding: 8px 16px;
              border-radius: 6px;
              font-size: 13px;
              font-weight: 600;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              display: inline-block;
            }
            .pass-logo-section {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-top: 8px;
            }
            .pass-logo {
              width: 120px;
              height: auto;
              filter: brightness(0) invert(1);
            }
            .pass-number {
              text-align: right;
              color: rgba(255,255,255,0.6);
              font-size: 12px;
              font-weight: 500;
            }
            .pass-name-section {
              margin-top: 30px;
            }
            .pass-name-label {
              color: rgba(255,255,255,0.6);
              font-size: 13px;
              font-weight: 500;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .pass-name {
              font-family: 'Anton', sans-serif;
              font-size: 48px;
              color: white;
              line-height: 1;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .pass-details {
              display: flex;
              gap: 48px;
              margin-top: 34px;
              padding-top: 22px;
              border-top: 1px dashed rgba(255,255,255,0.18);
            }
            .pass-detail-item {
              flex: 1;
            }
            .pass-detail-label {
              color: rgba(255,255,255,0.5);
              font-size: 11px;
              font-weight: 500;
              margin-bottom: 6px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .pass-detail-value {
              color: white;
              font-size: 14px;
              font-weight: 600;
            }
            .pass-right {
              width: 300px;
              flex-shrink: 0;
              background: #d97b3f;
              padding: 34px 26px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 26px;
              position: relative;
            }
            .pass-right::before {
              content: '';
              position: absolute;
              left: 0;
              top: 50%;
              transform: translateY(-50%);
              width: 2px;
              height: 100%;
              background: repeating-linear-gradient(
                to bottom,
                transparent,
                transparent 8px,
                rgba(255,255,255,0.3) 8px,
                rgba(255,255,255,0.3) 16px
              );
            }
            .qr-container {
              background: white;
              padding: 20px;
              border-radius: 16px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .qr-container img {
              display: block;
              width: 200px;
              height: 200px;
            }
            .scan-instructions {
              text-align: center;
              display: flex;
              flex-direction: column;
              gap: 5px;
            }
            .scan-title {
              color: white;
              font-size: 16px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .scan-subtitle {
              color: rgba(255,255,255,0.9);
              font-size: 12px;
              font-weight: 500;
            }
            .pass-id {
              color: rgba(255,255,255,0.8);
              font-size: 10px;
              font-family: monospace;
              margin-top: 8px;
            }
            @media print {
              @page {
                margin: 0;
                size: landscape;
              }
              body {
                padding: 0;
                background: white;
              }
              .pass-wrapper {
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="pass-wrapper">
            <div class="pass-left">
              <div class="pass-header">
                <div class="pass-type-bar">Match Pass</div>
                <div class="pass-logo-section">
                  <img src="/ccpl-logo.png" alt="CCPL Logo" class="pass-logo" />
                  <div class="pass-number">Pass #${qr.number}/${qrCodes.length}</div>
                </div>
              </div>
              
              <div class="pass-name-section">
                <div class="pass-name-label">Pass Holder</div>
                <div class="pass-name">${pass.name}</div>
              </div>
              
              <div class="pass-details">
                <div class="pass-detail-item">
                  <div class="pass-detail-label">Match Day</div>
                  <div class="pass-detail-value">${matchDayName}</div>
                </div>
                <div class="pass-detail-item">
                  <div class="pass-detail-label">Team</div>
                  <div class="pass-detail-value">${pass.team || 'N/A'}</div>
                </div>
              </div>
            </div>
            
            <div class="pass-right">
              <div class="qr-container">
                <img src="${qr.dataUrl}" alt="Pass QR Code" />
              </div>
              <div class="scan-instructions">
                <div class="scan-title">Scan to Verify</div>
                <div class="scan-subtitle">Present this pass at the venue</div>
                <div class="pass-id">ID: ${pass.id.substring(0, 12)}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const printAllPasses = () => {
    if (qrCodes.length === 0) return;
    
    const printWindow = window.open('', '_blank');
    const passesHTML = qrCodes.map((qr) => `
      <div style="page-break-after: always; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; background: #f5f5f5;">
        <div style="width: 920px; height: 440px; display: flex; border-radius: 22px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
          <div style="flex: 1; background: #232323; padding: 38px 44px 34px; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
            <div>
              <div style="background: #d97b3f; color: white; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; display: inline-block;">Match Pass</div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px;">
                <img src="/ccpl-logo.png" alt="CCPL Logo" style="width: 120px; height: auto; filter: brightness(0) invert(1);" />
                <div style="text-align: right; color: rgba(255,255,255,0.6); font-size: 12px; font-weight: 500;">Pass #${qr.number}/${qrCodes.length}</div>
              </div>
            </div>
            
            <div style="margin-top: 30px;">
              <div style="color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 500; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Pass Holder</div>
              <div style="font-family: 'Anton', sans-serif; font-size: 48px; color: white; line-height: 1; text-transform: uppercase; letter-spacing: 1px;">${pass.name}</div>
            </div>
            
            <div style="display: flex; gap: 48px; margin-top: 34px; padding-top: 22px; border-top: 1px dashed rgba(255,255,255,0.18);">
              <div style="flex: 1;">
                <div style="color: rgba(255,255,255,0.5); font-size: 11px; font-weight: 500; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Match Day</div>
                <div style="color: white; font-size: 14px; font-weight: 600;">${matchDayName}</div>
              </div>
              <div style="flex: 1;">
                <div style="color: rgba(255,255,255,0.5); font-size: 11px; font-weight: 500; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Team</div>
                <div style="color: white; font-size: 14px; font-weight: 600;">${pass.team || 'N/A'}</div>
              </div>
            </div>
          </div>
          
          <div style="width: 300px; flex-shrink: 0; background: #d97b3f; padding: 34px 26px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 26px; position: relative;">
            <div style="position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 2px; height: 100%; background: repeating-linear-gradient(to bottom, transparent, transparent 8px, rgba(255,255,255,0.3) 8px, rgba(255,255,255,0.3) 16px);"></div>
            <div style="background: white; padding: 20px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
              <img src="${qr.dataUrl}" style="display: block; width: 200px; height: 200px;" />
            </div>
            <div style="text-align: center; display: flex; flex-direction: column; gap: 5px;">
              <div style="color: white; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Scan to Verify</div>
              <div style="color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 500;">Present this pass at the venue</div>
              <div style="color: rgba(255,255,255,0.8); font-size: 10px; font-family: monospace; margin-top: 8px;">ID: ${pass.id.substring(0, 12)}</div>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>All Passes - ${pass.name}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Inter', sans-serif; margin: 0; background: white; }
            @media print {
              @page { margin: 0; size: landscape; }
            }
          </style>
        </head>
        <body>
          ${passesHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Pass QR Codes</h2>
            <p className="text-sm text-gray-600 mt-1">
              {qrCodes.length} pass(es) for {pass.name}
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
        <div className="p-6 border-b border-gray-200 flex gap-3 flex-wrap">
          <button
            onClick={downloadAllPasses}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download All Passes
          </button>
          <button
            onClick={downloadCurrentPass}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Current
          </button>
          <button
            onClick={printCurrentPass}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Current
          </button>
          <button
            onClick={printAllPasses}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print All
          </button>
        </div>

        {/* Current Pass Display - Preview */}
        {qrCodes.length > 0 && (
          <div className="p-6">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Professional Pass Preview */}
              <div className="bg-gray-100 p-8 flex justify-center items-center">
                <div style={{ width: '920px', height: '440px', transform: 'scale(0.7)', transformOrigin: 'center' }}>
                  <div className="w-full h-full flex rounded-[22px] overflow-hidden shadow-2xl">
                    {/* Left Section */}
                    <div className="flex-1 bg-[#232323] p-[38px_44px_34px] flex flex-col justify-between relative">
                      <div>
                        <div className="bg-[#d97b3f] text-white px-4 py-2 rounded-md text-[13px] font-semibold tracking-wide uppercase inline-block">
                          Match Pass
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <img src="/ccpl-logo.png" alt="CCPL Logo" className="w-[120px] h-auto brightness-0 invert" />
                          <div className="text-right text-white/60 text-xs font-medium">
                            Pass #{qrCodes[currentPage].number}/{qrCodes.length}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-[30px]">
                        <div className="text-white/60 text-[13px] font-medium mb-2 uppercase tracking-wide">
                          Pass Holder
                        </div>
                        <div className="text-white text-[48px] leading-none uppercase tracking-wide" style={{ fontFamily: 'Anton, sans-serif' }}>
                          {pass.name}
                        </div>
                      </div>
                      
                      <div className="flex gap-12 mt-[34px] pt-[22px] border-t border-dashed border-white/[0.18]">
                        <div className="flex-1">
                          <div className="text-white/50 text-[11px] font-medium mb-1.5 uppercase tracking-wide">
                            Match Day
                          </div>
                          <div className="text-white text-sm font-semibold">
                            {matchDayName}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="text-white/50 text-[11px] font-medium mb-1.5 uppercase tracking-wide">
                            Team
                          </div>
                          <div className="text-white text-sm font-semibold">
                            {pass.team || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Section */}
                    <div className="w-[300px] flex-shrink-0 bg-[#d97b3f] p-[34px_26px] flex flex-col items-center justify-center gap-[26px] relative">
                      {/* Perforated edge */}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-full"
                           style={{ background: 'repeating-linear-gradient(to bottom, transparent, transparent 8px, rgba(255,255,255,0.3) 8px, rgba(255,255,255,0.3) 16px)' }}>
                      </div>
                      
                      <div className="bg-white p-5 rounded-2xl shadow-lg">
                        <img
                          src={qrCodes[currentPage].dataUrl}
                          alt={`QR Code for Pass ${qrCodes[currentPage].number}`}
                          className="w-[200px] h-[200px] block"
                        />
                      </div>
                      
                      <div className="text-center flex flex-col gap-1.5">
                        <div className="text-white text-base font-bold uppercase tracking-wide">
                          Scan to Verify
                        </div>
                        <div className="text-white/90 text-xs font-medium">
                          Present this pass at the venue
                        </div>
                        <div className="text-white/80 text-[10px] font-mono mt-2">
                          ID: {pass.id.substring(0, 12)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Additional Info Below Preview */}
              <div className="bg-white p-4 border-t border-gray-200">

                {/* Navigation */}
                {qrCodes.length > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <button
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage + 1} of {qrCodes.length}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(qrCodes.length - 1, currentPage + 1))}
                      disabled={currentPage === qrCodes.length - 1}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {qrCodes.length === 0 && (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Generating QR codes...</p>
          </div>
        )}

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

      {/* Hidden pass elements for download - render all passes */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        {qrCodes.map((qr, index) => (
          <div
            key={qr.number}
            ref={(el) => passRefs.current[index] = el}
            style={{ width: '920px', height: '440px' }}
          >
            <div className="w-full h-full flex rounded-[22px] overflow-hidden shadow-2xl">
              {/* Left Section */}
              <div className="flex-1 bg-[#232323] p-[38px_44px_34px] flex flex-col justify-between relative">
                <div>
                  <div className="bg-[#d97b3f] text-white px-4 py-2 rounded-md text-[13px] font-semibold tracking-wide uppercase inline-block">
                    Match Pass
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <img src="/ccpl-logo.png" alt="CCPL Logo" className="w-[120px] h-auto brightness-0 invert" />
                    <div className="text-right text-white/60 text-xs font-medium">
                      Pass #{qr.number}/{qrCodes.length}
                    </div>
                  </div>
                </div>
                
                <div className="mt-[30px]">
                  <div className="text-white/60 text-[13px] font-medium mb-2 uppercase tracking-wide">
                    Pass Holder
                  </div>
                  <div className="text-white text-[48px] leading-none uppercase tracking-wide" style={{ fontFamily: 'Anton, sans-serif' }}>
                    {pass.name}
                  </div>
                </div>
                
                <div className="flex gap-12 mt-[34px] pt-[22px] border-t border-dashed border-white/[0.18]">
                  <div className="flex-1">
                    <div className="text-white/50 text-[11px] font-medium mb-1.5 uppercase tracking-wide">
                      Match Day
                    </div>
                    <div className="text-white text-sm font-semibold">
                      {matchDayName}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-white/50 text-[11px] font-medium mb-1.5 uppercase tracking-wide">
                      Team
                    </div>
                    <div className="text-white text-sm font-semibold">
                      {pass.team || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right Section */}
              <div className="w-[300px] flex-shrink-0 bg-[#d97b3f] p-[34px_26px] flex flex-col items-center justify-center gap-[26px] relative">
                {/* Perforated edge */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-full"
                     style={{ background: 'repeating-linear-gradient(to bottom, transparent, transparent 8px, rgba(255,255,255,0.3) 8px, rgba(255,255,255,0.3) 16px)' }}>
                </div>
                
                <div className="bg-white p-5 rounded-2xl shadow-lg">
                  <img
                    src={qr.dataUrl}
                    alt={`QR Code for Pass ${qr.number}`}
                    className="w-[200px] h-[200px] block"
                  />
                </div>
                
                <div className="text-center flex flex-col gap-1.5">
                  <div className="text-white text-base font-bold uppercase tracking-wide">
                    Scan to Verify
                  </div>
                  <div className="text-white/90 text-xs font-medium">
                    Present this pass at the venue
                  </div>
                  <div className="text-white/80 text-[10px] font-mono mt-2">
                    ID: {pass.id.substring(0, 12)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

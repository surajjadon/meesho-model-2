'use client';
import { useState, useEffect } from 'react';
import { FaDownload } from 'react-icons/fa';

interface BackendData {
  message: string;
  labelsFound: number;
  processedLabels: {
    labelNumber: number;
    sku: string;
    orderId: string;
    quantity: number;
    deliveryPartner: string;
  }[];
}

interface ResultsDisplayProps {
  backendData: BackendData | null;
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  onDownloadCropped: () => void;
  isRendering: boolean;
}

export default function ResultsDisplay({ backendData, canvasContainerRef, onDownloadCropped, isRendering }: ResultsDisplayProps) {
  const [hasCanvases, setHasCanvases] = useState(false);

  useEffect(() => {
    // This effect handles the SSR-safety for the ref
    const observer = new MutationObserver(() => {
      if (canvasContainerRef.current) {
        setHasCanvases(canvasContainerRef.current.children.length > 0);
      }
    });

    if (canvasContainerRef.current) {
      observer.observe(canvasContainerRef.current, { childList: true });
    }

    return () => observer.disconnect();
  }, [canvasContainerRef]);

  return (
    <div className="space-y-8">
      {/* Client-Side Visual Cropper Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Visual Preview & Cropper</h2>
          {hasCanvases && (
            <button 
              onClick={onDownloadCropped}
              disabled={isRendering}
              className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
            >
              <FaDownload />
              {isRendering ? 'Generating...' : 'Download Cropped PDF'}
            </button>
          )}
        </div>
        <div 
          ref={canvasContainerRef} 
          className="flex flex-wrap gap-4 bg-gray-100 p-4 rounded-md min-h-[150px] items-center justify-center"
        >
          {!hasCanvases && <p className="text-gray-500">Previews will generate here automatically after a file is selected.</p>}
        </div>
      </div>

      {/* Backend Data Results Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">Backend Data Extraction Results</h2>
        {!backendData ? (
          <p className="text-gray-500">Data from the server will appear here after you sync the file.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Labels Found in PDF</div>
                <div className="text-lg font-bold text-blue-900">{backendData.labelsFound}</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Successfully Parsed by Backend</div>
                <div className="text-lg font-bold text-green-900">{backendData.processedLabels.length}</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {backendData.processedLabels.map((label, index) => (
                    <tr key={label.orderId + index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500">{label.labelNumber}</td>
                      <td className="px-6 py-4 text-sm font-medium text-blue-600">{label.sku}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{label.orderId}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{label.quantity}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{label.deliveryPartner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <style jsx global>{`
        .page-wrapper-style { border: 1px solid #ccc; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .page-wrapper-style canvas { max-width: 150px; height: auto; }
      `}</style>
    </div>
  );
}
'use client';
import { useState, ChangeEvent } from 'react';
import { FaSyncAlt } from 'react-icons/fa';

interface UploadFormProps {
  onFileSelect: (file: File) => void;
  onSync: () => void;
  isSyncing: boolean;
  syncMessage: string;
}

export default function UploadForm({ onFileSelect, onSync, isSyncing, syncMessage }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      onFileSelect(selectedFile);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-4">📄 Step 1: Upload Your PDF</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="pdf-upload" className="block text-sm font-medium text-gray-700 mb-2">
            Select Shipping Labels PDF
          </label>
          <input
            id="pdf-upload"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              cursor-pointer"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: <span className="font-medium">{file.name}</span>
            </p>
          )}
        </div>

        {file && (
          <div className="pt-4 border-t">
             <h2 className="text-xl font-bold mb-2">📄 Step 2: Process the File</h2>
             <p className="text-sm text-gray-500 mb-4">Sync with the backend to extract label data and update your inventory. Visual previews will generate automatically below.</p>
            <button
              onClick={onSync}
              disabled={!file || isSyncing}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
            >
              <FaSyncAlt className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Processing on Server...' : 'Extract Data & Sync Inventory'}
            </button>
            {syncMessage && (
              <p className={`text-sm mt-2 text-center ${syncMessage.includes('Error') || syncMessage.includes('failed') ? 'text-red-600' : 'text-green-600'}`}>
                {syncMessage}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
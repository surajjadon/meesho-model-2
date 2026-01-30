"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

interface DeleteModalProps {
  isOpen: boolean;
  itemName: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteModal({
  isOpen,
  itemName,
  loading = false,
  onClose,
  onConfirm,
}: DeleteModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // 🔑 Keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }

      if (e.key === "Enter") {
        e.preventDefault();
        if (!loading) {
          onConfirm();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onConfirm, loading]);

  // 🔒 Lock scroll + focus Delete button
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      confirmRef.current?.focus();
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[1000] p-4 flex items-center justify-center bg-black/50"
      onClick={onClose} // backdrop click
    >
      <div
        className="w-full max-w-md bg-white shadow-lg rounded-xl p-6 relative"
        onClick={(e) => e.stopPropagation()} // stop backdrop close
      >
        {/* Close Icon */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-3.5 h-3.5 text-gray-400 hover:text-red-500"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="mt-6">
          {/* Icon */}
          <div className="w-14 h-14 p-3.5 rounded-full bg-red-100 mx-auto">
           <svg
  xmlns="http://www.w3.org/2000/svg"
  className="w-full h-full text-red-600" // Changed fill-red-500 to text-red-600 + currentColor
  viewBox="0 0 24 24"
  fill="currentColor"
>
  <path
    fillRule="evenodd"
    d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z"
    clipRule="evenodd"
  />
</svg>
          </div>

          {/* Text */}
          <div className="mt-4 text-center">
            <p className="text-slate-600 text-sm mt-2">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-red-600 font-mono">
                {itemName}
              </span>
              ? This action cannot be undone.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-md w-full text-slate-900 text-sm font-medium bg-gray-200 hover:bg-gray-300"
            >
              No, Cancel
            </button>

            <button
              ref={confirmRef}
              onClick={onConfirm}
              disabled={loading}
              className="px-5 py-2.5 rounded-md w-full text-white text-sm font-medium bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin" size={16} />}
              Yes, Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

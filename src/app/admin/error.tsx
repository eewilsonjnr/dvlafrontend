"use client";
import { useEffect } from "react";
import Link from "next/link";
import { XCircle } from "lucide-react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[DVLA Admin Error]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5"
          style={{ background: "#dc262618" }}
        >
          <XCircle className="w-7 h-7 text-red-600" />
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-gray-500 mb-1">
          An unexpected error occurred in the DVLA administration system.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 font-mono mb-6">
            Error reference: {error.digest}
          </p>
        )}

        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "#0a1f44" }}
          >
            Try Again
          </button>
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

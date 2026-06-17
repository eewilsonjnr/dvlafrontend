"use client";
import Link from "next/link";
import Image from "next/image";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
          style={{ background: "#006B3F18" }}
        >
          <AlertTriangle className="w-8 h-8" style={{ color: "#006B3F" }} />
        </div>

        <div className="flex justify-center mb-4">
          <Image src="/logo.png" alt="DVLA Ghana" width={72} height={72} />
        </div>

        <h1 className="text-5xl font-extrabold mb-2" style={{ color: "#0a1f44" }}>
          404
        </h1>
        <p className="text-xl font-semibold text-gray-700 mb-2">Page Not Found</p>
        <p className="text-sm text-gray-500 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>

        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "#006B3F" }}
        >
          Return to Dashboard
        </Link>
      </div>

      <p className="mt-12 text-xs text-gray-400">
        Driver and Vehicle Licensing Authority — IDP/ICMV Issuance System
      </p>
    </div>
  );
}

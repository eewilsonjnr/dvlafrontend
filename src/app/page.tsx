"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FileText, Printer, CheckCircle } from "lucide-react";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* Ghana national top bar */}
      <div className="h-2 w-full" style={{ background: "linear-gradient(to right, #006B3F 33.3%, #FCD116 33.3%, #FCD116 66.6%, #CE1126 66.6%)" }} />

      {/* Official government header */}
      <header className="bg-white border-b-2 px-6 py-4" style={{ borderColor: "#006B3F" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">

          {/* Left: DVLA logo + title */}
          <div className="flex items-center gap-4">
            <Image
              src="/logo.png"
              alt="DVLA Ghana"
              width={60}
              height={60}
              priority
              className="object-contain shrink-0"
            />
            <div className="leading-tight">
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#CE1126" }}>
                Republic of Ghana
              </p>
              <h1 className="text-lg font-black tracking-tight" style={{ color: "#1a1a2e" }}>
                Driver &amp; Vehicle Licensing Authority
              </h1>
              <p className="text-xs font-medium" style={{ color: "#4a4a6a" }}>
                International Documents Issuance Platform
              </p>
            </div>
          </div>

          {/* Right: Ghana flag + operator login */}
          <div className="flex items-center gap-4">
            <Image
              src="/ghana-flag.svg"
              alt="Ghana Flag"
              width={52}
              height={34}
              className="rounded shadow-sm border border-gray-200 object-cover"
            />
            <button
              onClick={() => router.push("/admin-login")}
              className="px-5 py-2.5 rounded font-semibold text-sm text-white shadow transition hover:opacity-90 active:scale-95"
              style={{ background: "#006B3F" }}
            >
              Operator Login
            </button>
          </div>
        </div>
      </header>

      {/* Hero banner */}
      <section
        className="py-16 px-6 text-center"
        style={{ background: "linear-gradient(160deg, #0a1f44 0%, #1a3a6b 60%, #0d2d44 100%)" }}
      >
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-center mb-6">
            <Image
              src="/logo.png"
              alt="DVLA Ghana"
              width={100}
              height={100}
              className="opacity-95"
            />
          </div>

          <h2 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight">
            IDP &amp; ICMV Issuance System
          </h2>
          <p className="text-base font-medium mb-1" style={{ color: "#FCD116" }}>
            International Driving Permit &nbsp;|&nbsp; International Certificate for Motor Vehicles
          </p>
          <p className="text-sm text-white/60 max-w-xl mx-auto mt-3">
            Official platform for the production and issuance of internationally recognised
            travel documents by authorised DVLA Ghana officers.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => router.push("/admin-login")}
              className="px-8 py-3 rounded font-bold text-sm shadow-lg transition hover:opacity-90 active:scale-95"
              style={{ background: "#FCD116", color: "#1a1a2e" }}
            >
              Access Operator Portal
            </button>
          </div>
        </div>
      </section>

      {/* Green divider stripe */}
      <div className="h-1 w-full" style={{ background: "#006B3F" }} />

      {/* Features */}
      <section className="py-14 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-bold tracking-widest uppercase mb-10" style={{ color: "#006B3F" }}>
            Platform Capabilities
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: FileText,
                title: "End-to-End Workflow",
                desc: "Applicant registration, document generation, and permit issuance managed in a single integrated system.",
              },
              {
                icon: Printer,
                title: "Print &amp; RFID Management",
                desc: "Real-time print queue monitoring with RFID chip encoding and verification for issued booklets.",
              },
              {
                icon: CheckCircle,
                title: "ICAO 9303 Compliance",
                desc: "Automated MRZ generation and quality control checks to meet international travel document standards.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-white rounded border p-6 shadow-sm"
                style={{ borderColor: "#e2e8f0" }}
              >
                <div
                  className="w-10 h-10 rounded flex items-center justify-center mb-4"
                  style={{ background: "#006B3F" }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-sm mb-2 text-gray-900" dangerouslySetInnerHTML={{ __html: title }} />
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-5 px-6 border-t text-center text-xs text-gray-400" style={{ borderColor: "#e2e8f0" }}>
        <p className="font-semibold text-gray-600">Driver &amp; Vehicle Licensing Authority &mdash; Republic of Ghana</p>
        <p className="mt-1">For authorised DVLA personnel only. Unauthorised access is prohibited.</p>
      </footer>
    </div>
  );
}

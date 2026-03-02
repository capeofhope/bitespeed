"use client";

import { useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Build the payload dynamically removing empty strings
      const payload: Record<string, string> = {};
      if (email.trim()) payload.email = email.trim();
      if (phoneNumber.trim()) payload.phoneNumber = phoneNumber.trim();

      const res = await fetch("/api/identify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "An error occurred");
      } else {
        setResponse(data);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to fetch");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 font-sans text-zinc-50 p-6 selection:bg-indigo-500/30">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      <div className="absolute top-0 flex w-full justify-center">
        <div className="h-[500px] w-[500px] bg-indigo-600 rounded-full blur-[120px] opacity-20 mix-blend-screen -z-10 translate-y-[-50%]"></div>
        <div className="h-[400px] w-[600px] bg-purple-600 rounded-full blur-[120px] opacity-20 mix-blend-screen -z-10 translate-x-[20%] translate-y-[-30%]"></div>
      </div>

      <main className="z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left Side: Form */}
        <div className="flex flex-col gap-6 w-full backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="space-y-2 text-center md:text-left">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              Identity Recon
            </h1>
            <p className="text-sm text-zinc-400">
              Enter an email, phone number, or both to identify and link customer records across purchases.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium text-zinc-300">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mcfly@hillvalley.edu"
                className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="phoneNumber" className="text-sm font-medium text-zinc-300">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="123456"
                className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || (!email && !phoneNumber)}
              className="mt-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Reconciling...
                </>
              ) : (
                "Identify Contact"
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Response Output */}
        <div className="flex flex-col w-full h-full min-h-[400px] backdrop-blur-xl bg-black/40 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
          <div className="bg-white/5 border-b border-white/10 px-6 py-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
              API Response
            </h2>
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
          </div>

          <div className="p-6 overflow-auto h-full flex-grow text-sm font-mono leading-relaxed">
            {loading ? (
              <div className="flex items-center justify-center h-full text-zinc-500 animate-pulse">
                Awaiting request...
              </div>
            ) : error ? (
              <div className="text-red-400 whitespace-pre-wrap">
                <span className="text-red-500 font-bold">Error:</span> {error}
              </div>
            ) : response ? (
              <pre className="text-emerald-400/90 whitespace-pre-wrap">
                {JSON.stringify(response, null, 2)}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-zinc-600 gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <span>No payload available yet.</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

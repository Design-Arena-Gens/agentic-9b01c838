import { TetrisGame } from "@/components/TetrisGame";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-16 pt-28 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-16 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-32 top-1/3 h-[420px] w-[420px] rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute left-16 bottom-10 h-[360px] w-[360px] rounded-full bg-emerald-400/20 blur-3xl" />
      </div>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 sm:px-8">
        <header className="flex flex-col gap-6 text-center sm:text-left">
          <div className="inline-flex items-center justify-center gap-3 self-center rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs tracking-[0.3em] uppercase text-white/70 sm:self-start">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Live Arcade Build
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl">
            Hyperion Tetris // Vercel Edition
          </h1>
          <p className="max-w-2xl self-center text-base text-white/70 sm:self-start sm:text-lg">
            Dive into the most cinematic Tetris experience ever launched for the web.
            Turbocharged effects, precision handling, and pro-tier scoring modes
            crafted for esports showcases and product launches alike.
          </p>
        </header>
        <TetrisGame />
      </div>
    </main>
  );
}

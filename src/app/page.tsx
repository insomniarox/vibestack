import Link from "next/link";
import { ArrowRight, Sparkles, Zap, Layers, Cpu, Github, Twitter, MessageSquare, Check } from "lucide-react";
import SmokeRings from "@/components/SmokeRings";
import { auth } from "@clerk/nextjs/server";
import HomeSignOutButton from "@/components/HomeSignOutButton";

export default async function Home() {
  const { userId } = await auth();
  const dashboardHref = "/dashboard";
  const signInHref = "/sign-in?redirect_url=%2Fdashboard";
  const startWritingHref = userId ? dashboardHref : signInHref;
  return (
    <div className="bg-background min-h-screen text-foreground">

      {/* Top Nav */}
      <nav className="absolute top-0 w-full flex items-center p-6 z-50">
        <div className="flex items-center gap-3 w-[220px]">
          <div className="flex items-center justify-center w-7 h-7 rounded bg-primary text-black font-bold text-lg font-mono">
            V
          </div>
          <span className="font-semibold text-lg tracking-tight">VibeStack</span>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="glass px-6 py-2 rounded-full hidden md:flex items-center gap-6 text-sm text-gray-400">
            <Link href="#" className="hover:text-white transition-colors">Home</Link>
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
          </div>
        </div>
        <div className="flex items-center gap-3 w-[220px] justify-end">
          {userId ? (
            <>
              <Link href={dashboardHref} className="bg-primary text-black px-5 py-2 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors">
                Dashboard
              </Link>
              <HomeSignOutButton />
            </>
          ) : (
            <Link href={signInHref} className="glass px-5 py-2 rounded-full text-sm font-medium hover:bg-white/5 transition-colors">
              Sign In
            </Link>
          )}
        </div>
      </nav>

      <main>
        {/* HERO SECTION */}
        <section className="relative flex flex-col items-center justify-center overflow-hidden min-h-[100svh] md:min-h-screen pt-32 pb-16 md:pt-40 md:pb-20">
          {/* Horizon Stage Glow */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[800px] h-[400px] bg-horizon/40 blur-[120px] rounded-full pointer-events-none" />

          {/* Animated Morphing Smoke Rings behind the H1 (Framer Motion) */}
          <SmokeRings />

          {/* Eyebrow Badge */}
          <div className="glass flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-sm text-gray-300">
            <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs font-semibold">2026</span>
            <span>Next-Gen AI Publishing</span>
          </div>

          {/* H1 Headline */}
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-tight mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 text-center">
            Stop Writing.<br />Start Vibing.
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 font-light leading-relaxed relative z-10 text-center px-6">
            The first newsletter platform that understands your mood. AI-driven aesthetics, automated growth, and a distraction-free canvas.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
            <Link
              href={startWritingHref}
              className="group flex items-center gap-2 bg-primary text-black px-8 py-3.5 rounded-full font-semibold hover:scale-105 transition-all duration-200"
            >
              Start Writing
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/feed"
              className="glass flex items-center gap-2 px-8 py-3.5 rounded-full font-semibold hover:bg-white/5 transition-all duration-200"
            >
              <Sparkles className="w-4 h-4 text-horizon" />
              Explore the Feed
            </Link>
          </div>

          {/* Tagline */}
          <div className="mt-16 md:absolute md:bottom-12 w-full flex justify-center opacity-50 pointer-events-none px-4 text-center">
            <div className="text-sm md:text-base font-mono tracking-[0.2em] uppercase text-gray-300">
              Write in 4D. Ship at the speed of Vibe.
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="py-16 md:py-20 px-6 max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Everything you need to scale.</h2>
            <p className="text-gray-400 text-lg">Powerful features wrapped in a sleek, distraction-free interface.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Cpu,
                title: "AI Vibe Engine",
                desc: "Automatically adapts your newsletter's CSS theme and tone based on the content's mood."
              },
              {
                icon: Layers,
                title: "Bento Dashboard",
                desc: "A brutalist, high-performance analytics dashboard to track subscribers and open rates."
              },
              {
                icon: Zap,
                title: "Instant Distribution",
                desc: "Publish and send to thousands of subscribers instantly via Resend API integration."
              }
            ].map((feature, i) => (
              <div key={i} className="glass p-8 rounded-2xl hover:-translate-y-2 hover:border-primary/50 hover:bg-white/5 transition-all duration-300 group cursor-default">
                <div className="w-12 h-12 rounded-lg bg-surface border border-border flex items-center justify-center mb-6 group-hover:border-primary/50 transition-colors">
                  <feature.icon className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="py-16 md:py-20 px-6 max-w-6xl mx-auto relative z-10 border-t border-border/50">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Simple, transparent pricing.</h2>
            <p className="text-gray-400 text-lg">Start for free, upgrade when you need more power.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Hobby Tier */}
            <div className="bg-surface border border-border p-8 hover:border-gray-600 transition-colors flex flex-col">
              <h3 className="text-xl font-semibold mb-2">Hobby</h3>
              <div className="mb-6"><span className="text-4xl font-bold">$0</span><span className="text-gray-400">/mo</span></div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-gray-300"><Check className="w-5 h-5 text-primary" /> Up to 500 subscribers</li>
                <li className="flex items-center gap-3 text-gray-300"><Check className="w-5 h-5 text-primary" /> AI tools (rewrite + summarize)</li>
                <li className="flex items-center gap-3 text-gray-300"><Check className="w-5 h-5 text-primary" /> Standard support</li>
              </ul>
              <form action="/api/plans/hobby" method="POST">
                <button className="w-full py-3 rounded-full border border-border hover:bg-white/5 transition-colors font-semibold">Get Started</button>
              </form>
            </div>

            {/* Pro Tier */}
            <div className="bg-surface border-2 border-primary p-8 relative flex flex-col transform md:-translate-y-4 shadow-[0_0_30px_rgba(212,255,0,0.1)]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 translate-y-[-50%] bg-primary text-black px-4 py-1 rounded-full text-xs font-bold tracking-wide uppercase">Most Popular</div>
              <h3 className="text-xl font-semibold mb-2 text-primary">Pro</h3>
              <div className="mb-6"><span className="text-4xl font-bold">$12</span><span className="text-gray-400">/mo</span></div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-gray-300"><Check className="w-5 h-5 text-primary" /> Up to 10,000 subscribers</li>
                <li className="flex items-center gap-3 text-gray-300"><Check className="w-5 h-5 text-primary" /> Full AI Vibe Engine</li>
                <li className="flex items-center gap-3 text-gray-300"><Check className="w-5 h-5 text-primary" /> Advanced analytics</li>
                <li className="flex items-center gap-3 text-gray-300"><Check className="w-5 h-5 text-primary" /> Priority support</li>
              </ul>
              <form action="/api/plans/pro" method="POST">
                <button className="w-full py-3 rounded-full bg-primary text-black hover:bg-primary/90 transition-colors font-semibold">Go Vibe</button>
              </form>
            </div>

            {/* Enterprise Tier */}
            <div className="bg-surface border border-border p-8 hover:border-gray-600 transition-colors flex flex-col">
              <h3 className="text-xl font-semibold mb-2">Scale</h3>
              <div className="mb-6"><span className="text-4xl font-bold">$49</span><span className="text-gray-400">/mo</span></div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-gray-300"><Check className="w-5 h-5 text-primary" /> Unlimited subscribers</li>
                <li className="flex items-center gap-3 text-gray-300"><Check className="w-5 h-5 text-primary" /> Custom domains</li>
                <li className="flex items-center gap-3 text-gray-300"><Check className="w-5 h-5 text-primary" /> API access</li>
                <li className="flex items-center gap-3 text-gray-300"><Check className="w-5 h-5 text-primary" /> Dedicated account manager</li>
              </ul>
              <button className="w-full py-3 rounded-full border border-border hover:bg-white/5 transition-colors font-semibold" disabled>Coming soon</button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-border bg-surface py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-6 h-6 rounded bg-primary text-black font-bold text-sm font-mono">V</div>
            <span className="font-semibold tracking-tight">VibeStack</span>
          </div>
          <p className="text-gray-500 text-sm">© 2026 VibeStack Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="text-gray-400 hover:text-white transition-colors"><Twitter className="w-5 h-5" /></Link>
            <Link href="#" className="text-gray-400 hover:text-white transition-colors"><Github className="w-5 h-5" /></Link>
            <Link href="#" className="text-gray-400 hover:text-white transition-colors"><MessageSquare className="w-5 h-5" /></Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

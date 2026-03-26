import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ShieldAlert,
  ArrowRight,
  Layers,
  Users,
  Gauge,
  CheckCircle2,
  Sparkles,
  Star,
  type LucideIcon,
} from 'lucide-react';
import MagicBento from '../../components/MagicBento';
import LogoLoop, { type LogoItem } from '../../components/LogoLoop';
import ratingService, { type RatingTestimonial } from '../../services/ratingService';

const RED_GLOW = '220, 38, 38';

type HomeFeatureCard = {
  parallaxClass: string;
  icon: LucideIcon;
  title: string;
  body: string;
  bullets: readonly string[];
};

function testimonialInitials(name: string) {
  const parts = name.replace(/\./g, '').trim().split(/\s+/);
  const a = parts[0]?.[0] ?? '';
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? '';
  return `${a}${b}`.toUpperCase() || '?';
}

function StarRow({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${score} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={
            i < score
              ? 'h-3.5 w-3.5 fill-amber-400 text-amber-400'
              : 'h-3.5 w-3.5 fill-transparent text-white/25'
          }
          aria-hidden
        />
      ))}
    </div>
  );
}

function TestimonialRatingCard({
  score,
  feedback,
  authorName,
  authorRole,
}: {
  score: number;
  feedback: string;
  authorName: string;
  authorRole: string;
}) {
  const initials = testimonialInitials(authorName);
  return (
    <div className="w-[min(280px,85vw)] shrink-0 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left backdrop-blur-sm">
      <StarRow score={score} />
      <p className="mt-3 text-sm leading-relaxed text-white/75">&ldquo;{feedback}&rdquo;</p>
      <div className="mt-4 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600/75 text-[11px] font-semibold text-white">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-white">{authorName}</p>
          {authorRole ? <p className="truncate text-[11px] text-white/45">{authorRole}</p> : null}
        </div>
      </div>
    </div>
  );
}

function duplicateForMarquee<T>(items: readonly T[], minLength: number): T[] {
  if (items.length === 0) return [];
  const out = [...items];
  while (out.length < minLength) {
    out.push(...items);
  }
  return out;
}

const HOME_FEATURE_CARDS: HomeFeatureCard[] = [
  {
    parallaxClass: 'home-parallax-col-1',
    icon: Layers,
    title: 'Structured intake',
    body: 'Submit complaints with clarity so staff can prioritize and respond faster.',
    bullets: ['Guided submission flow', 'Priority & category signals', 'Less back-and-forth'],
  },
  {
    parallaxClass: 'home-parallax-col-2',
    icon: Users,
    title: 'Shared context',
    body: 'Threads and history stay attached to each case—no more scattered messages.',
    bullets: ['Threaded conversations', 'Full case timeline', 'Everyone sees the same story'],
  },
  {
    parallaxClass: 'home-parallax-col-3',
    icon: Gauge,
    title: 'Operational focus',
    body: 'Dashboards for each role keep queues, assignments, and outcomes in view.',
    bullets: ['Role-specific dashboards', 'Queues & assignments', 'Resolution outcomes'],
  },
];

gsap.registerPlugin(ScrollTrigger);

export function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [testimonials, setTestimonials] = useState<RatingTestimonial[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    ratingService
      .getPublicTestimonials(24)
      .then((data) => {
        if (!cancelled) setTestimonials(data);
      })
      .catch(() => {
        if (!cancelled) setTestimonials([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ratingSummary = useMemo(() => {
    if (!testimonials?.length) return null;
    const sum = testimonials.reduce((s, t) => s + t.score, 0);
    const avg = Math.round((sum / testimonials.length) * 10) / 10;
    return { avg, count: testimonials.length };
  }, [testimonials]);

  const ratingLoopItems: LogoItem[] = useMemo(() => {
    if (!testimonials?.length) return [];
    const source = duplicateForMarquee(testimonials, 8);
    return source.map((t) => ({
      node: (
        <TestimonialRatingCard
          score={t.score}
          feedback={t.feedback}
          authorName={t.authorName}
          authorRole={t.authorRole}
        />
      ),
      ariaLabel: `Rated ${t.score} out of 5 stars. ${t.feedback} — ${t.authorName}${
        t.authorRole ? `, ${t.authorRole}` : ''
      }`,
    }));
  }, [testimonials]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const ctx = gsap.context(() => {
      const scrub = 1;

      root.querySelectorAll<HTMLElement>('.home-parallax-orb').forEach((el, i) => {
        const y = [220, -160, 280][i] ?? 100;
        const x = [-40, 60, -20][i] ?? 0;
        gsap.fromTo(
          el,
          { y: 0, x: 0 },
          {
            y,
            x,
            ease: 'none',
            scrollTrigger: {
              trigger: root,
              start: 'top top',
              end: 'bottom top',
              scrub,
            },
          }
        );
      });

      gsap.fromTo(
        '.home-parallax-grid',
        { y: 0 },
        {
          y: 120,
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: 'top top',
            end: 'bottom top',
            scrub: scrub * 1.4,
          },
        }
      );

      gsap.fromTo(
        '.home-hero-inner',
        { y: 0 },
        {
          y: -100,
          ease: 'none',
          scrollTrigger: {
            trigger: '.home-hero',
            start: 'top top',
            end: 'bottom top',
            scrub,
          },
        }
      );

      gsap.fromTo(
        '.home-hero-glow',
        { scale: 1, opacity: 0.5 },
        {
          scale: 1.35,
          opacity: 0.85,
          ease: 'none',
          scrollTrigger: {
            trigger: '.home-hero',
            start: 'top top',
            end: 'bottom top',
            scrub: scrub * 0.8,
          },
        }
      );

      // Parallax translateY does not reserve layout space; on stacked (mobile) cards it causes overlap.
      const featureParallax = gsap.matchMedia();
      featureParallax.add('(min-width: 1024px)', () => {
        gsap.fromTo(
          '.home-parallax-col-1',
          { y: 0 },
          {
            y: -70,
            ease: 'none',
            scrollTrigger: {
              trigger: '.home-features',
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.15,
            },
          }
        );
        gsap.fromTo(
          '.home-parallax-col-2',
          { y: 0 },
          {
            y: 55,
            ease: 'none',
            scrollTrigger: {
              trigger: '.home-features',
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.15,
            },
          }
        );
        gsap.fromTo(
          '.home-parallax-col-3',
          { y: 0 },
          {
            y: -45,
            ease: 'none',
            scrollTrigger: {
              trigger: '.home-features',
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.15,
            },
          }
        );
      });

      gsap.fromTo(
        '.home-stats-row',
        { y: 48, opacity: 0.35 },
        {
          y: 0,
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: '.home-stats',
            start: 'top 88%',
            end: 'top 55%',
            scrub: 0.8,
          },
        }
      );

      gsap.fromTo(
        '.home-bento-intro',
        { y: 56, opacity: 0.25 },
        {
          y: 0,
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: '.home-bento',
            start: 'top 90%',
            end: 'top 50%',
            scrub: 0.9,
          },
        }
      );

      gsap.fromTo(
        '.home-bento-grid-wrap',
        { y: 36, opacity: 0.4 },
        {
          y: 0,
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: '.home-bento',
            start: 'top 85%',
            end: 'top 35%',
            scrub: 1,
          },
        }
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen overflow-x-clip bg-[#05010d] font-sans text-white antialiased selection:bg-red-500/30"
    >
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div
          className="home-parallax-grid absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(220,38,38,0.28) 1px, transparent 1px),
              linear-gradient(90deg, rgba(220,38,38,0.28) 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 20%, black 20%, transparent 70%)',
          }}
        />
        <div className="home-parallax-orb absolute -left-[20%] top-[8%] h-[min(55vw,420px)] w-[min(55vw,420px)] rounded-full bg-red-600/22 blur-[100px]" />
        <div className="home-parallax-orb absolute right-[-15%] top-[28%] h-[min(45vw,360px)] w-[min(45vw,360px)] rounded-full bg-red-500/18 blur-[90px]" />
        <div className="home-parallax-orb absolute left-[25%] bottom-[5%] h-[min(50vw,380px)] w-[min(50vw,380px)] rounded-full bg-rose-600/14 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-15%,rgba(220,38,38,0.12),transparent_50%)]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#05010d]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-[4.25rem] sm:px-6 lg:px-8">
          <Link to="/" className="cursor-target flex items-center gap-3 text-white no-underline">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 shadow-[0_0_28px_rgba(220,38,38,0.45)]">
              <ShieldAlert className="h-4 w-4 text-white" aria-hidden />
            </span>
            <span className="text-sm font-semibold tracking-tight">ResolvIQ</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/login"
              className="cursor-target rounded-full px-4 py-2 text-sm font-medium text-white/75 transition-colors hover:text-white"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="cursor-target rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_22px_rgba(220,38,38,0.35)] transition-[transform,box-shadow] hover:scale-[1.02] hover:shadow-[0_0_32px_rgba(220,38,38,0.5)]"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        <section className="home-hero relative flex min-h-[100svh] flex-col justify-center px-4 pb-24 pt-10 sm:px-6 lg:px-8">
          <div
            className="home-hero-glow pointer-events-none absolute left-1/2 top-[18%] h-[min(70vw,520px)] w-[min(90vw,720px)] -translate-x-1/2 rounded-full bg-red-600/18 blur-[120px]"
            aria-hidden
          />
          <div className="home-hero-inner relative mx-auto w-full max-w-7xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-red-300/95 backdrop-blur-sm sm:text-xs">
              <Sparkles className="h-3.5 w-3.5 text-red-400" aria-hidden />
              Issue tracking, reimagined
            </div>
            <h1 className="max-w-[18ch] text-[clamp(2.5rem,6vw+1rem,4.75rem)] font-semibold leading-[1.05] tracking-tight text-white">
              Resolve complaints{' '}
              <span className="bg-gradient-to-r from-red-200 via-white to-red-200 bg-clip-text text-transparent">
                with momentum
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/55 sm:text-xl">
              A single workspace for users, staff, and admins—submit, triage, and close cases without losing context.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/signup"
                className="cursor-target group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#05010d] transition-[transform,box-shadow] hover:scale-[1.02] hover:shadow-[0_20px_50px_rgba(255,255,255,0.12)]"
              >
                Start free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <Link
                to="/login"
                className="cursor-target inline-flex rounded-full border border-white/15 bg-white/[0.03] px-7 py-3.5 text-sm font-medium text-white/90 backdrop-blur-sm transition-colors hover:border-red-500/40 hover:bg-red-500/10"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-14 text-xs font-medium uppercase tracking-[0.25em] text-white/30">Scroll to explore</p>
          </div>
        </section>

        {testimonials !== null && testimonials.length > 0 && ratingSummary && (
          <section className="home-social-proof px-4 py-16 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="social-proof-heading">
            <div className="mx-auto max-w-7xl">
              <div className="mx-auto max-w-3xl text-center">
                <h2
                  id="social-proof-heading"
                  className="text-balance text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl"
                >
                  Trusted by teams who{' '}
                  <span className="bg-gradient-to-r from-red-200 via-white to-red-200 bg-clip-text text-transparent">
                    close the loop
                  </span>
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/50 sm:text-lg">
                  Recent ratings from users who resolved complaints through ResolvIQ (4–5 stars).
                </p>
                <p className="mt-6 text-sm tabular-nums text-white/45">
                  <span className="text-white/70">{ratingSummary.avg} average</span>
                  <span className="mx-2 text-white/25" aria-hidden>
                    ·
                  </span>
                  <span>{ratingSummary.count} ratings</span>
                </p>
              </div>

              <div className="mt-12 space-y-8 sm:mt-14 sm:space-y-10">
                <LogoLoop
                  logos={ratingLoopItems}
                  speed={100}
                  direction="right"
                  width="100%"
                  gap={24}
                  pauseOnHover
                  hoverSpeed={-20}
                  fadeOut
                  fadeOutColor="#05010d"
                  ariaLabel="Scrolling customer ratings, row one"
                  className="py-1"
                />
                <LogoLoop
                  logos={ratingLoopItems}
                  speed={100}
                  direction="left"
                  width="100%"
                  gap={24}
                  pauseOnHover
                  hoverSpeed={20}
                  fadeOut
                  fadeOutColor="#05010d"
                  ariaLabel="Scrolling customer ratings, row two"
                />
                <LogoLoop
                  logos={ratingLoopItems}
                  speed={100}
                  direction="right"
                  width="100%"
                  gap={24}
                  pauseOnHover
                  hoverSpeed={-20}
                  fadeOut
                  fadeOutColor="#05010d"
                  ariaLabel="Scrolling customer ratings, row three"
                  className="py-1"
                />
              </div>
            </div>
          </section>
        )}

        <section className="home-stats relative px-4 py-16 sm:px-6 lg:px-8">
          <div className="home-stats-row mx-auto grid max-w-7xl gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-md sm:grid-cols-3 sm:gap-6 sm:p-8">
            {[
              { k: 'Routing', v: 'Role-aware', d: 'Users, staff, and admins each see what matters.' },
              { k: 'Visibility', v: 'End-to-end', d: 'Track status from submission to resolution.' },
              { k: 'Trust', v: 'Controlled access', d: 'Protected routes aligned to your organization.' },
            ].map((item) => (
              <div key={item.k} className="border-white/5 sm:border-l sm:border-white/10 sm:pl-6 first:sm:border-l-0 first:sm:pl-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-400/90">{item.k}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{item.v}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{item.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="home-features relative px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Built for how teams actually work</h2>
              <p className="mt-4 text-base leading-relaxed text-white/50 sm:text-lg">
                Parallax depth hints at layers of responsibility—without hiding the simple path to resolution.
              </p>
            </div>
            <div className="mt-16 grid gap-6 lg:grid-cols-3 lg:gap-8">
              {HOME_FEATURE_CARDS.map(({ parallaxClass, icon: Icon, title, body, bullets }) => (
                <div
                  key={title}
                  className={`${parallaxClass} rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-transparent p-8 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.75)]`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 text-red-300 ring-1 ring-red-400/25">
                    <Icon className="h-6 w-6" aria-hidden />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold tracking-tight">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/50 sm:text-base">{body}</p>
                  <ul className="mt-6 space-y-2.5 text-sm text-white/45">
                    {bullets.map((li) => (
                      <li key={li} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-red-400/80" aria-hidden />
                        {li}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-medium text-red-300/90">One surface</p>
            <p className="mt-4 text-2xl font-semibold leading-snug tracking-tight text-white sm:text-3xl">
              From signal to resolution—see analytics, collaboration, automation, and security in a single glance.
            </p>
          </div>
        </section>

        <section className="home-bento relative w-full pb-28 pt-4 sm:pb-32 sm:pt-8">
          <div className="home-bento-intro mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">The whole product, in motion</h2>
            <p className="mt-4 text-base text-white/50 sm:text-lg">
            ResolvIQ unifies complaint tracking, collaborative chat, and role-based workflow in a single seamless platform—unlike any other.
            </p>
          </div>
          <div className="home-bento-grid-wrap mt-12 w-full px-3 sm:px-5 lg:px-10 xl:px-14 2xl:px-20">
            <MagicBento
              layout="homepage"
              glowColor={RED_GLOW}
              enableSpotlight
              enableBorderGlow
              enableStars
              enableTilt={false}
              enableMagnetism={false}
              clickEffect
              spotlightRadius={340}
              particleCount={14}
              className="w-full"
            />
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] bg-[#05010d]/80 px-4 py-12 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3 text-white/80">
            <ShieldAlert className="h-5 w-5 text-red-400" aria-hidden />
            <span className="text-sm font-medium">ResolvIQ</span>
          </div>
          <p className="text-center text-xs text-white/35 sm:text-left">
            Centralized complaint resolution for teams and users.
          </p>
          <div className="flex gap-4 text-xs text-white/45">
            <p>Gerero, Palacio, Alvasan, Pidlaoan</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

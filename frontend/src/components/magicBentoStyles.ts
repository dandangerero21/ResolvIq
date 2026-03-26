/**
 * Scoped layout CSS for MagicBento: marketing (homepage) vs compact (dashboard/embed).
 * Both blocks are always emitted; the root uses `bento-section--homepage` or `bento-section--dashboard`.
 */
export function getMagicBentoStyles(glowColor: string): string {
  return `
          .bento-section {
            --glow-x: 50%;
            --glow-y: 50%;
            --glow-intensity: 0;
            --glow-radius: 200px;
            --glow-color: ${glowColor};
            --border-color: rgba(${glowColor}, 0.15);
            --background-dark: #05010d;
            --white: hsl(0, 0%, 100%);
            --purple-primary: rgba(${glowColor}, 1);
            --purple-glow: rgba(${glowColor}, 0.2);
            --purple-border: rgba(${glowColor}, 0.8);
          }

          .bento-section .card-responsive .card {
            container-type: size;
            container-name: bento-card;
          }

          .bento-section .text-clamp-1 {
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 1;
            line-clamp: 1;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .bento-section .text-clamp-2 {
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            line-clamp: 2;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          /* Cursor-tracking border glow: radial hotspot at --glow-x/--glow-y, masked to the 2px border ring.
             GlobalSpotlight sets --glow-x/--glow-y (%) and --glow-intensity (0–1) per .card via JS. */
          .bento-section .card--border-glow::after {
            content: '';
            position: absolute;
            inset: -1px;
            padding: 2px;
            border-radius: inherit;
            background:
              radial-gradient(
                600px circle at var(--glow-x, 50%) var(--glow-y, 50%),
                rgba(${glowColor}, 1) 0%,
                rgba(${glowColor}, 0.4) 25%,
                transparent 45%
              );
            -webkit-mask:
              linear-gradient(#fff 0 0) content-box,
              linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask:
              linear-gradient(#fff 0 0) content-box,
              linear-gradient(#fff 0 0);
            mask-composite: exclude;
            pointer-events: none;
            opacity: var(--glow-intensity, 0);
            z-index: 50;
          }

          .bento-section .particle::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: rgba(${glowColor}, 0.2);
            border-radius: 50%;
            z-index: -1;
          }

          .bento-section .particle-container:hover {
            box-shadow: 0 4px 20px rgba(46, 24, 78, 0.2), 0 0 30px rgba(${glowColor}, 0.2);
          }

          /* ——— Homepage (marketing): full bento spans, large type, lift shell ——— */
          .bento-section--homepage .card-responsive {
            grid-template-columns: 1fr;
            width: 100%;
            max-width: 100%;
            margin: 0;
            padding: 0;
          }

          @media (min-width: 600px) {
            .bento-section--homepage .card-responsive {
              grid-template-columns: repeat(2, 1fr);
            }
          }

          @media (min-width: 1024px) {
            .bento-section--homepage .card-responsive {
              grid-template-columns: repeat(4, 1fr);
            }

            .bento-section--homepage .card-responsive > .bento-card-shell:nth-child(3) {
              grid-column: span 2;
              grid-row: span 2;
            }

            .bento-section--homepage .card-responsive > .bento-card-shell:nth-child(4) {
              grid-column: 1 / span 2;
              grid-row: 2 / span 2;
            }

            .bento-section--homepage .card-responsive > .bento-card-shell:nth-child(6) {
              grid-column: 4;
              grid-row: 3;
            }
          }

          .bento-section--homepage .bento-card-icon {
            width: clamp(2.5rem, 16cqw, 7rem);
            height: clamp(2.5rem, 16cqw, 7rem);
          }

          .bento-section--homepage .card__label {
            font-size: clamp(0.625rem, 0.42rem + 0.85vw, 1.08rem);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.14em;
            color: rgba(255, 255, 255, 0.52);
          }

          .bento-section--homepage .card__title {
            font-size: clamp(1.15rem, 0.72rem + 1.65vw, 3.35rem);
            font-weight: 600;
            line-height: 1.06;
          }

          .bento-section--homepage .card__description {
            font-size: clamp(0.8125rem, 0.66rem + 0.65vw, 1.38rem);
            line-height: 1.42;
          }

          @container bento-card (min-width: 320px) {
            .bento-section--homepage .card__title {
              font-size: clamp(1.25rem, 0.55rem + 5.25cqw, 4rem);
            }
            .bento-section--homepage .card__description {
              font-size: clamp(0.85rem, 0.5rem + 1.65cqw, 1.55rem);
            }
            .bento-section--homepage .card__label {
              font-size: clamp(0.68rem, 0.42rem + 1.15cqw, 1.12rem);
            }
          }

          @media (max-width: 599px) {
            .bento-section--homepage .card-responsive {
              grid-template-columns: 1fr;
              width: 100%;
              max-width: 100%;
              margin: 0;
              padding: 0;
            }

            .bento-section--homepage .card-responsive > .bento-card-shell {
              width: 100%;
            }

            .bento-section--homepage .card-responsive .card {
              min-height: 180px;
            }
          }

          .bento-section--homepage .bento-card-shell {
            transform: translate3d(0, 0, 0);
            transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
            will-change: transform;
          }

          .bento-section--homepage .bento-card-shell:hover {
            transform: translate3d(0, -10px, 0);
          }

          .bento-section--homepage .bento-card-shell .card {
            transition: box-shadow 0.5s cubic-bezier(0.22, 1, 0.36, 1),
              border-color 0.45s ease;
          }

          .bento-section--homepage .bento-card-shell:hover .card {
            box-shadow:
              0 0 0 1px rgba(${glowColor}, 0.25),
              0 22px 55px rgba(0, 0, 0, 0.48);
            border-color: rgba(${glowColor}, 0.35);
          }

          @media (prefers-reduced-motion: reduce) {
            .bento-section--homepage .bento-card-shell {
              transition: none;
            }
            .bento-section--homepage .bento-card-shell:hover {
              transform: translate3d(0, 0, 0);
            }
            .bento-section--homepage .bento-card-shell .card {
              transition: none;
            }
          }

          /* ——— Dashboard / embed: uniform grid, compact type, subtle lift ——— */
          .bento-section--dashboard .card-responsive {
            grid-template-columns: 1fr;
            width: 100%;
            max-width: 100%;
            margin: 0;
            padding: 0;
          }

          @media (min-width: 640px) {
            .bento-section--dashboard .card-responsive {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (min-width: 1024px) {
            .bento-section--dashboard .card-responsive {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }

          .bento-section--dashboard .bento-card-icon {
            width: clamp(1.5rem, 10cqw, 2.75rem);
            height: clamp(1.5rem, 10cqw, 2.75rem);
          }

          .bento-section--dashboard .card__label {
            font-size: clamp(0.55rem, 0.4rem + 0.35vw, 0.7rem);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: rgba(255, 255, 255, 0.5);
          }

          .bento-section--dashboard .card__title {
            font-size: clamp(0.9rem, 0.55rem + 0.9vw, 1.2rem);
            font-weight: 600;
            line-height: 1.15;
          }

          .bento-section--dashboard .card__description {
            font-size: clamp(0.7rem, 0.62rem + 0.25vw, 0.82rem);
            line-height: 1.35;
          }

          @media (max-width: 639px) {
            .bento-section--dashboard .card-responsive .bento-card-shell-dashboard .card {
              min-height: 120px;
            }
          }

          @media (min-width: 640px) {
            .bento-section--dashboard .card-responsive .bento-card-shell-dashboard .card {
              min-height: 140px;
            }
          }

          .bento-section--dashboard .bento-card-shell-dashboard {
            transform: translate3d(0, 0, 0);
            transition: transform 0.22s ease;
          }

          .bento-section--dashboard .bento-card-shell-dashboard:hover {
            transform: translate3d(0, -4px, 0);
          }

          .bento-section--dashboard .bento-card-shell-dashboard .card {
            transition: box-shadow 0.22s ease, border-color 0.22s ease;
          }

          .bento-section--dashboard .bento-card-shell-dashboard:hover .card {
            box-shadow:
              0 0 0 1px rgba(${glowColor}, 0.2),
              0 10px 28px rgba(0, 0, 0, 0.35);
            border-color: rgba(${glowColor}, 0.3);
          }

          @media (prefers-reduced-motion: reduce) {
            .bento-section--dashboard .bento-card-shell-dashboard {
              transition: none;
            }
            .bento-section--dashboard .bento-card-shell-dashboard:hover {
              transform: translate3d(0, 0, 0);
            }
          }
  `;
}

export type MagicBentoLayout = 'homepage' | 'dashboard';

import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';

type Props = {
  className?: string;
};

/**
 * Auth pages: navigate to marketing home with a clear, tappable control.
 */
export function BackToHomeLink({ className = '' }: Props) {
  return (
    <Link
      to="/"
      className={`cursor-target group inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-4 py-2.5 text-sm font-medium text-white/85 shadow-[0_2px_12px_rgba(0,0,0,0.2)] backdrop-blur-md transition-all duration-200 hover:border-red-400/40 hover:bg-red-500/[0.14] hover:text-white hover:shadow-[0_4px_28px_rgba(220,38,38,0.18)] active:scale-[0.98] ${className}`}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] ring-1 ring-white/10 transition-[background-color,transform] duration-200 group-hover:bg-red-600/25 group-hover:ring-red-400/30">
        <ArrowLeft
          className="h-4 w-4 shrink-0 text-white/90 transition-transform duration-200 group-hover:-translate-x-0.5"
          aria-hidden
        />
      </span>
      <span className="pr-0.5 tracking-tight">Back to home</span>
    </Link>
  );
}

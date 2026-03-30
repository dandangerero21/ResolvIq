import { ArrowUpDown } from 'lucide-react';
import type { ComplaintSortKey } from '../../utils/complaintSort';
import { cn } from '../ui/utils';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const OPTION_GROUPS: { groupLabel: string; options: { value: ComplaintSortKey; label: string }[] }[] = [
  {
    groupLabel: 'Date & activity',
    options: [
      { value: 'newest', label: 'Newest submitted first' },
      { value: 'oldest', label: 'Oldest submitted first' },
      { value: 'updated', label: 'Last updated first' },
    ],
  },
  {
    groupLabel: 'Urgency',
    options: [{ value: 'priority', label: 'Priority — high to low' }],
  },
  {
    groupLabel: 'Alphabetical',
    options: [
      { value: 'title', label: 'Title A → Z' },
      { value: 'category', label: 'Category A → Z' },
    ],
  },
];

type Variant = 'admin' | 'staff' | 'user';

const triggerVariants: Record<Variant, string> = {
  admin:
    'h-auto min-h-9 cursor-pointer border-white/20 bg-white/5 py-2 pl-2.5 pr-2 text-white shadow-none hover:bg-white/10 focus-visible:border-white/35 focus-visible:ring-2 focus-visible:ring-white/20 [&_svg]:text-white/50',
  staff:
    'h-auto min-h-9 cursor-pointer border-amber-500/25 bg-black/25 py-2 pl-2.5 pr-2 text-white shadow-none hover:bg-white/[0.06] focus-visible:border-amber-500/45 focus-visible:ring-2 focus-visible:ring-amber-500/25 [&_svg]:text-amber-400/60',
  user:
    'h-auto min-h-9 cursor-pointer border-teal-500/25 bg-black/25 py-2 pl-2.5 pr-2 text-white shadow-none hover:bg-white/[0.06] focus-visible:border-teal-500/45 focus-visible:ring-2 focus-visible:ring-teal-500/25 [&_svg]:text-teal-400/60',
};

const contentVariants: Record<Variant, string> = {
  admin:
    'border-white/15 bg-zinc-950 text-white shadow-2xl shadow-black/50 [&_[data-slot=select-label]]:text-white/45',
  staff:
    'border-amber-500/25 bg-zinc-950 text-white shadow-2xl shadow-black/50 [&_[data-slot=select-label]]:text-amber-200/50',
  user:
    'border-teal-500/25 bg-zinc-950 text-white shadow-2xl shadow-black/50 [&_[data-slot=select-label]]:text-teal-200/50',
};

/** Inset ring + scroll-margin so keyboard highlight and scroll snap align to the full row. */
const itemVariants: Record<Variant, string> = {
  admin:
    'relative scroll-my-1.5 cursor-pointer rounded-md text-white outline-none ring-2 ring-transparent ring-inset transition-[background-color,box-shadow] focus-visible:bg-red-500/25 focus-visible:text-white focus-visible:ring-red-400/70 data-[highlighted]:bg-red-500/25 data-[highlighted]:text-white data-[highlighted]:ring-red-400/70 data-[state=checked]:bg-red-500/15 data-[state=checked]:ring-red-500/35',
  staff:
    'relative scroll-my-1.5 cursor-pointer rounded-md text-white outline-none ring-2 ring-transparent ring-inset transition-[background-color,box-shadow] focus-visible:bg-amber-500/20 focus-visible:text-white focus-visible:ring-amber-400/65 data-[highlighted]:bg-amber-500/20 data-[highlighted]:text-white data-[highlighted]:ring-amber-400/65 data-[state=checked]:bg-amber-500/12 data-[state=checked]:ring-amber-500/30',
  user:
    'relative scroll-my-1.5 cursor-pointer rounded-md text-white outline-none ring-2 ring-transparent ring-inset transition-[background-color,box-shadow] focus-visible:bg-teal-500/20 focus-visible:text-white focus-visible:ring-teal-400/65 data-[highlighted]:bg-teal-500/20 data-[highlighted]:text-white data-[highlighted]:ring-teal-400/65 data-[state=checked]:bg-teal-500/12 data-[state=checked]:ring-teal-500/30',
};

const variantLabel: Record<Variant, string> = {
  admin: 'text-white/50',
  staff: 'text-white/45',
  user: 'text-white/45',
};

const variantIcon: Record<Variant, string> = {
  admin: 'text-white/45',
  staff: 'text-amber-400/55',
  user: 'text-teal-400/55',
};

type ComplaintSortSelectProps = {
  value: ComplaintSortKey;
  onChange: (key: ComplaintSortKey) => void;
  variant: Variant;
  id?: string;
  className?: string;
};

export function ComplaintSortSelect({
  value,
  onChange,
  variant,
  id = 'complaint-sort',
  className,
}: ComplaintSortSelectProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <label htmlFor={id} className={cn('shrink-0 cursor-default text-xs', variantLabel[variant])} style={{ fontWeight: 500 }}>
        Sort
      </label>
      <Select value={value} onValueChange={v => onChange(v as ComplaintSortKey)}>
        <SelectTrigger
          id={id}
          className={cn(
            'w-full min-w-0 gap-2 sm:max-w-[260px]',
            '[&_[data-slot=select-value]]:line-clamp-1 [&_[data-slot=select-value]]:text-left [&_[data-slot=select-value]]:text-xs [&_[data-slot=select-value]]:sm:text-sm',
            triggerVariants[variant]
          )}
        >
          <ArrowUpDown className={cn('size-3.5 shrink-0 sm:size-4', variantIcon[variant])} strokeWidth={2.25} aria-hidden />
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          position="popper"
          sideOffset={6}
          align="start"
          className={cn('z-[100] max-h-[min(320px,70vh)] border p-1.5', contentVariants[variant])}
        >
          {OPTION_GROUPS.map(({ groupLabel, options }) => (
            <SelectGroup key={groupLabel}>
              <SelectLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider">
                {groupLabel}
              </SelectLabel>
              {options.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className={cn('text-xs sm:text-sm', itemVariants[variant])}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

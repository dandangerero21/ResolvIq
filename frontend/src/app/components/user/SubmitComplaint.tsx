import { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { ComplaintCategory, Priority } from '../../types';
import complaintService from '../../../services/complaintService';
import { complaintCategoryLabel } from '../../utils/complaintCategoryLabel';
import {
  ArrowLeft,
  ChevronRight,
  Wrench,
  CreditCard,
  KeyRound,
  Package,
  Star,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle2,
  Loader,
} from 'lucide-react';

const categories: { value: ComplaintCategory; icon: React.FC<{ className?: string }>; description: string }[] = [
  { value: 'Technical Issue', icon: Wrench, description: 'App bugs, system errors, performance' },
  { value: 'Billing', icon: CreditCard, description: 'Charges, refunds, subscriptions' },
  { value: 'Account Access', icon: KeyRound, description: 'Login problems, locked accounts' },
  { value: 'Product Defect', icon: Package, description: 'Damaged or faulty products' },
  { value: 'Service Quality', icon: Star, description: 'Response times, experience issues' },
  { value: 'Other', icon: MoreHorizontal, description: 'Any other concerns' },
];

const priorities: { value: Priority; label: string; description: string }[] = [
  { value: 'Low', label: 'Low', description: 'Not time-sensitive' },
  { value: 'Medium', label: 'Medium', description: 'Needs attention soon' },
  { value: 'High', label: 'High', description: 'Urgent issue' },
  { value: 'Critical', label: 'Critical', description: 'Business-stopping problem' },
];

/** Muted accent ramp for dark UI: calm → attention → heat (distinct from old blue/yellow/red mix). */
const priorityTileStyle: Record<
  Priority,
  { card: string; icon: string }
> = {
  Low: {
    card:
      'border-emerald-500/35 hover:border-emerald-400/55 data-[active=true]:border-emerald-400 data-[active=true]:bg-emerald-500/[0.12]',
    icon: 'text-emerald-400',
  },
  Medium: {
    card:
      'border-amber-500/40 hover:border-amber-400/70 data-[active=true]:border-amber-400 data-[active=true]:bg-amber-500/[0.12]',
    icon: 'text-amber-400',
  },
  High: {
    card:
      'border-orange-500/45 hover:border-orange-400/75 data-[active=true]:border-orange-400 data-[active=true]:bg-orange-500/[0.14]',
    icon: 'text-orange-400',
  },
  Critical: {
    card:
      'border-red-600/90 hover:border-red-500 data-[active=true]:border-red-500 data-[active=true]:bg-red-600/25',
    icon: 'text-red-400',
  },
};

/** Aligned with backend TEXT column; keeps payloads predictable for the API */
const DESCRIPTION_MAX_LENGTH = 10_000;

export function SubmitComplaint() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { addComplaint } = useApp();

  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<ComplaintCategory | null>(null);
  const [otherCategoryDetail, setOtherCategoryDetail] = useState('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null);

  const syncDescriptionHeight = useCallback(() => {
    const el = descriptionTextareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useLayoutEffect(() => {
    if (step !== 2) return;
    syncDescriptionHeight();
  }, [step, description, syncDescriptionHeight]);

  const handleSubmit = async () => {
    if (!currentUser || !category || !title.trim() || !description.trim()) return;
    if (category === 'Other' && !otherCategoryDetail.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      // Map category to ID (this is a simplification - ideally we'd have category IDs)
      const categoryMap: Record<ComplaintCategory, number> = {
        'Technical Issue': 1,
        'Billing': 2,
        'Account Access': 3,
        'Product Defect': 4,
        'Service Quality': 5,
        'Other': 6,
      };

      const newComplaint = await complaintService.createComplaint(
        title.trim(),
        description.trim(),
        categoryMap[category] || null,
        currentUser.userId || 0,
        priority,
        category === 'Other' ? otherCategoryDetail : null
      );

      // Also add to local context
      addComplaint({
        ...newComplaint,
        id: newComplaint.complaintId?.toString() || newComplaint.id || `complaint-${Date.now()}`,
        createdAt: new Date(newComplaint.createdAt || new Date()),
        updatedAt: new Date(newComplaint.updatedAt || new Date()),
      });

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center px-8 py-10">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-white mb-2" style={{ fontWeight: 700 }}>Complaint Submitted!</h2>
          <p className="text-white/60 text-sm leading-relaxed mb-8">
            Your complaint has been received. Our admin team will review it and assign a specialist shortly. You'll be able to track it from your dashboard.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setSubmitted(false);
                setStep(1);
                setCategory(null);
                setOtherCategoryDetail('');
                setTitle('');
                setDescription('');
              }}
              className="px-4 py-2.5 border-2 border-white/20 rounded-xl text-sm text-white/60 hover:border-white/40 transition-colors"
              style={{ fontWeight: 500 }}
            >
              Submit Another
            </button>
            <button
              onClick={() => navigate('/user/dashboard')}
              className="px-4 py-2.5 bg-black rounded-xl text-sm text-white hover:bg-red-600 transition-colors"
              style={{ fontWeight: 600 }}
            >
              View Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 bg-white/5 backdrop-blur px-8 py-6">
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/user/dashboard')}
          className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-4 transition-colors cursor-target"
        >
          <ArrowLeft className="w-4 h-4" />
          {step > 1 ? 'Back' : 'Dashboard'}
        </button>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/60 uppercase tracking-wider mb-1">New Complaint</p>
            <h1 className="text-white" style={{ fontWeight: 700 }}>
              {step === 1 ? 'Select Category' : step === 2 ? 'Set Priority & Details' : 'Review & Submit'}
            </h1>
          </div>
          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                  s < step ? 'bg-black text-white' : s === step ? 'bg-red-600 text-white' : 'bg-white/10 text-white/40'
                }`} style={{ fontWeight: 600 }}>
                  {s < step ? '✓' : s}
                </div>
                {s < 3 && <div className={`w-6 h-0.5 ${s < step ? 'bg-black' : 'bg-white/10'}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-2xl">
        {/* Step 1: Category */}
        {step === 1 && (
          <div>
            <p className="text-white/60 text-sm mb-5">What type of issue are you experiencing?</p>
            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => {
                const Icon = cat.icon;
                const isSelected = category === cat.value;
                return (
                  <button
                    type="button"
                    key={cat.value}
                    onClick={() => {
                      setCategory(cat.value);
                      if (cat.value !== 'Other') setOtherCategoryDetail('');
                    }}
                    className={`flex items-start gap-3 p-4 border-2 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'border-red-500 bg-red-500/10 backdrop-blur'
                        : 'border-white/10 hover:border-white/20 bg-white/5 backdrop-blur'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-red-600' : 'bg-white/10'
                    }`}>
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-white/60'}`} />
                    </div>
                    <div>
                      <p className="text-sm text-white" style={{ fontWeight: isSelected ? 600 : 500 }}>{cat.value}</p>
                      <p className="text-xs text-white/60 leading-tight mt-0.5">{cat.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {category === 'Other' && (
              <div className="mt-4">
                <label htmlFor="other-category" className="block text-sm text-white/80 mb-1.5" style={{ fontWeight: 500 }}>
                  Describe your category <span className="text-red-400">*</span>
                </label>
                <input
                  id="other-category"
                  type="text"
                  value={otherCategoryDetail}
                  onChange={e => setOtherCategoryDetail(e.target.value)}
                  placeholder="e.g. Lost shipment, Partner API, HR policy…"
                  maxLength={200}
                  className="w-full px-4 py-2.5 border border-white/20 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-colors bg-white/10 backdrop-blur"
                />
                <p className="text-xs text-white/40 mt-1 text-right">{otherCategoryDetail.length}/200</p>
              </div>
            )}

            <button
              disabled={!category || (category === 'Other' && !otherCategoryDetail.trim())}
              onClick={() => setStep(2)}
              className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-600 transition-colors"
              style={{ fontWeight: 600 }}
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Priority & Details */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-white/80 mb-3" style={{ fontWeight: 500 }}>Priority Level</label>
              <div className="grid grid-cols-2 gap-2">
                {priorities.map(p => {
                  const isSelected = priority === p.value;
                  const tile = priorityTileStyle[p.value];
                  return (
                    <button
                      key={p.value}
                      onClick={() => setPriority(p.value)}
                      data-active={isSelected}
                      className={`flex items-center gap-3 p-3 border-2 rounded-xl text-left transition-all ${tile.card} bg-white/[0.04] backdrop-blur`}
                    >
                      <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${tile.icon}`} />
                      <div>
                        <p className="text-sm text-white" style={{ fontWeight: isSelected ? 600 : 500 }}>{p.label}</p>
                        <p className="text-xs text-white/60">{p.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/80 mb-1.5" style={{ fontWeight: 500 }}>
                Complaint Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Brief, clear description of your issue"
                className="w-full px-4 py-2.5 border border-white/20 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 transition-colors bg-white/10 backdrop-blur"
                maxLength={100}
              />
              <p className="text-xs text-white/40 mt-1 text-right">{title.length}/100</p>
            </div>

            <div>
              <label className="block text-sm text-white/80 mb-1.5" style={{ fontWeight: 500 }}>
                Detailed Description <span className="text-red-400">*</span>
              </label>
              <textarea
                ref={descriptionTextareaRef}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe your issue in detail — include what happened, when, and any steps you've already tried..."
                rows={1}
                maxLength={DESCRIPTION_MAX_LENGTH}
                className="min-h-[7.5rem] w-full overflow-hidden px-4 py-3 border border-white/20 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/40 bg-white/10 backdrop-blur resize-none"
              />
              <p className="mt-1 text-right text-xs text-white/40">
                {description.length}/{DESCRIPTION_MAX_LENGTH}
              </p>
            </div>

            <button
              disabled={!title.trim() || !description.trim()}
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-600 transition-colors"
              style={{ fontWeight: 600 }}
            >
              Review Complaint
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div>
            <p className="text-white/60 text-sm mb-5">Review your complaint before submitting.</p>

            <div className="border border-white/10 rounded-2xl overflow-hidden mb-6 bg-white/5 backdrop-blur">
              <div className="bg-white/10 border-b border-white/10 px-5 py-3 flex items-center justify-between">
                <span className="text-xs text-white/60 uppercase tracking-wider">Complaint Summary</span>
                <button onClick={() => setStep(1)} className="text-xs text-red-400 hover:text-red-300" style={{ fontWeight: 500 }}>Edit</button>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-white/10 text-white/70 px-2.5 py-1 rounded-full">
                    {complaintCategoryLabel({
                      category: category ?? undefined,
                      categoryName: category ?? undefined,
                      customCategory: category === 'Other' ? otherCategoryDetail : undefined,
                    })}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full ${
                    priority === 'Critical' ? 'bg-red-600 text-white' :
                    priority === 'High' ? 'bg-orange-500/25 text-orange-200' :
                    priority === 'Medium' ? 'bg-amber-500/20 text-amber-200' : 'bg-emerald-500/20 text-emerald-200'
                  }`}>{priority} Priority</span>
                </div>

                <div>
                  <p className="text-xs text-white/60 mb-1">Title</p>
                  <p className="text-white text-sm" style={{ fontWeight: 600 }}>{title}</p>
                </div>

                <div>
                  <p className="text-xs text-white/60 mb-1">Description</p>
                  <p className="text-white/80 text-sm leading-relaxed">{description}</p>
                </div>

                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-white/60">Submitted by <span className="text-white/80">{currentUser?.name}</span></p>
                </div>

                {error && (
                  <div className="p-3 bg-red-600/10 backdrop-blur border border-red-500/30 rounded-lg">
                    <p className="text-xs text-red-300">{error}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                disabled={isLoading}
                className="px-5 py-2.5 border-2 border-white/20 rounded-xl text-sm text-white/60 hover:border-white/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontWeight: 500 }}
              >
                Edit Details
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontWeight: 600 }}
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Submit Complaint
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
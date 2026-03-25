import { Lightbulb, CheckCircle2, XCircle } from 'lucide-react';

interface SolutionProposalDialogProps {
  open: boolean;
  onApprove: () => void;
  onDecline: () => void;
}

export function SolutionProposalDialog({ open, onApprove, onDecline }: SolutionProposalDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-100">
        {/* Icon */}
        <div className="w-14 h-14 bg-amber-50 border-2 border-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lightbulb className="w-7 h-7 text-amber-500" />
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-full px-3 py-1 mb-3">
            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
            <span className="text-amber-600 text-xs" style={{ fontWeight: 600 }}>Solution Proposal Received</span>
          </div>
          <h2 className="text-black mb-2" style={{ fontWeight: 700 }}>Did this solve your issue?</h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            A staff member has proposed a solution. Let us know if it resolved your complaint or if you need further assistance.
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onDecline}
            className="flex items-center justify-center gap-2 py-2.5 px-4 border-2 border-gray-200 rounded-xl text-gray-600 text-sm hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-all"
            style={{ fontWeight: 500 }}
          >
            <XCircle className="w-4 h-4" />
            No, continue
          </button>
          <button
            onClick={onApprove}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-black rounded-xl text-white text-sm hover:bg-red-600 transition-all"
            style={{ fontWeight: 600 }}
          >
            <CheckCircle2 className="w-4 h-4" />
            Yes, resolved!
          </button>
        </div>
      </div>
    </div>
  );
}

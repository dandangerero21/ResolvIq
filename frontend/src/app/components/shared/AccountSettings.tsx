import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, ArrowLeft, Loader, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import userService from '../../../services/userService';

const DELETE_ACCOUNT_CONFIRMATION_PHRASE = 'Yes, I want to delete my account.';

export function AccountSettings() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = currentUser?.role === 'admin';
  const isPhraseMatch = confirmationText === DELETE_ACCOUNT_CONFIRMATION_PHRASE;

  const dashboardPath = useMemo(() => {
    if (currentUser?.role === 'staff') {
      return '/staff/dashboard';
    }
    if (currentUser?.role === 'admin') {
      return '/admin/dashboard';
    }
    return '/user/dashboard';
  }, [currentUser?.role]);

  const currentUserId = useMemo(() => {
    if (typeof currentUser?.userId === 'number' && Number.isFinite(currentUser.userId)) {
      return currentUser.userId;
    }
    if (typeof currentUser?.id === 'string') {
      const parsed = Number(currentUser.id);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return null;
  }, [currentUser?.id, currentUser?.userId]);

  const handleDeleteAccount = async () => {
    setError('');

    if (isAdmin) {
      setError('Administrator accounts cannot be deleted.');
      return;
    }

    if (currentUserId === null) {
      setError('Unable to resolve your account id. Please log out then sign in again.');
      return;
    }

    if (!isPhraseMatch) {
      setError('Please type the exact confirmation phrase before deleting your account.');
      return;
    }

    setIsDeleting(true);
    try {
      await userService.deleteAccount(currentUserId, confirmationText);
      logout();
      navigate('/login', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to delete account.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto md:h-full md:overflow-hidden">
      <div className="shrink-0 border-b border-white/10 bg-white/5 px-4 py-5 backdrop-blur sm:px-8 sm:py-6">
        <button
          onClick={() => navigate(dashboardPath)}
          className="mb-4 flex cursor-target items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        <p className="mb-1 text-xs uppercase tracking-wider text-white/60">Settings</p>
        <h1 className="text-white" style={{ fontWeight: 700 }}>
          Account Settings
        </h1>
        <p className="mt-0.5 text-sm text-white/60">Manage your account actions</p>
      </div>

      <div className="px-4 py-5 sm:px-8 sm:py-6 md:min-h-0 md:flex-1 md:overflow-y-auto">
        <section className="max-w-3xl rounded-2xl border border-red-500/35 bg-red-950/30 p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-red-600/20 text-red-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-white" style={{ fontWeight: 700 }}>
                Delete Account
              </h2>
              <p className="mt-1 text-sm text-white/70">
                This permanently deletes your account from the database. This cannot be undone.
              </p>
            </div>
          </div>

          {isAdmin ? (
            <div className="rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-white/75">
              Administrator accounts cannot be deleted from this screen.
            </div>
          ) : (
            <>
              <ul className="mb-4 space-y-1 text-sm text-white/70">
                <li>Complaints and conversations tied to your account will be ended automatically.</li>
                <li>Related complaints are marked as cancelled.</li>
                <li>Your account record is permanently deleted.</li>
              </ul>

              <label className="mb-1.5 block text-sm text-white/80" style={{ fontWeight: 500 }}>
                Type exactly:
                <span className="ml-1 text-red-300">{DELETE_ACCOUNT_CONFIRMATION_PHRASE}</span>
              </label>
              <input
                type="text"
                value={confirmationText}
                onChange={event => {
                  setConfirmationText(event.target.value);
                  setError('');
                }}
                placeholder="Type the exact sentence here"
                className="w-full rounded-xl border border-white/20 bg-black/35 px-4 py-2.5 text-sm text-white placeholder:text-white/40 transition-colors focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
              />

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || !isPhraseMatch}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-500/45 bg-red-600/25 px-4 py-2.5 text-sm text-red-100 transition-colors hover:bg-red-600/35 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ fontWeight: 600 }}
                >
                  {isDeleting ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Deleting account...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Permanently Delete My Account
                    </>
                  )}
                </button>
                {!isPhraseMatch && (
                  <span className="text-xs text-white/55">Confirmation text does not match yet.</span>
                )}
              </div>
            </>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/40 bg-red-600/10 p-3">
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

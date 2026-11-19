import React, { useMemo, useState } from 'react';
import { Users, X, Search, UserCheck, UserX, Ban, RotateCcw, Crown, Trash2, KeyRound, Loader2, ShieldCheck, Hourglass } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { STATUS } from '../../lib/db';
import { Avatar, Card, CardHeader, Modal, Segmented, cn } from '../ui';

// Admin console: every account on this phone, with Ash Flow's admin controls
// (approve, reject, disable, enable, admin rights, password resets, delete). Admins only.

const STATUS_CHIP = {
  [STATUS.PENDING]: ['Pending', 'bg-amber-500/15 text-amber-600 border-amber-500/30'],
  [STATUS.ACTIVE]: ['Active', 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'],
  [STATUS.REJECTED]: ['Rejected', 'bg-rose-500/12 text-rose-500 border-rose-500/30'],
  [STATUS.DISABLED]: ['Disabled', 'bg-rose-500/12 text-rose-500 border-rose-500/30'],
};

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const isInactive = (u) => u.account_status === STATUS.REJECTED || u.account_status === STATUS.DISABLED;

function counts(users) {
  return {
    all: users.length,
    pending: users.filter((u) => u.account_status === STATUS.PENDING).length,
    active: users.filter((u) => u.account_status === STATUS.ACTIVE).length,
    inactive: users.filter(isInactive).length,
    resets: users.filter((u) => u.reset_requested_at).length,
  };
}

/* Settings card (admins only): a summary and the button that opens the console. */
export function AdminCard() {
  const { isAdmin, users } = useAuth();
  const { params } = useUI();
  const [open, setOpen] = useState(params.section === 'admin'); // "Review" in the sign-in toast
  if (!isAdmin) return null;
  const c = counts(users);
  const waiting = c.pending + c.resets;
  return (
    <Card id="admin" className="scroll-mt-24">
      <CardHeader icon={ShieldCheck} title="Admin" subtitle="Accounts on this phone" />
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="chip">{c.all} accounts</span>
        <span className="chip">{c.active} active</span>
        {c.pending > 0 && <span className={cn('chip', STATUS_CHIP[STATUS.PENDING][1])}>{c.pending} waiting for approval</span>}
        {c.resets > 0 && <span className={cn('chip', STATUS_CHIP[STATUS.PENDING][1])}>{c.resets} password reset{c.resets > 1 ? 's' : ''}</span>}
        {c.inactive > 0 && <span className="chip">{c.inactive} inactive</span>}
      </div>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        <Users className="w-4 h-4" /> Open admin console
        {waiting > 0 && <span className="ml-1 rounded-full bg-black/15 px-1.5 text-xs">{waiting}</span>}
      </button>
      <AdminConsole open={open} onClose={() => setOpen(false)} />
    </Card>
  );
}

function AdminConsole({ open, onClose }) {
  const { users, user: me, admin } = useAuth();
  const { toast } = useUI();
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind: 'delete' | 'reset', user }
  const [typed, setTyped] = useState('');
  const c = counts(users);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, '');
    return users
      .filter((u) => {
        if (tab === 'pending' && u.account_status !== STATUS.PENDING && !u.reset_requested_at) return false;
        if (tab === 'active' && u.account_status !== STATUS.ACTIVE) return false;
        if (tab === 'inactive' && !isInactive(u)) return false;
        return !q || u.username.includes(q) || String(u.name || '').toLowerCase().includes(q);
      })
      .sort((a, b) => {
        // waiting accounts first, then newest
        const wa = a.account_status === STATUS.PENDING || a.reset_requested_at ? 0 : 1;
        const wb = b.account_status === STATUS.PENDING || b.reset_requested_at ? 0 : 1;
        return wa - wb || String(b.created_at).localeCompare(String(a.created_at));
      });
  }, [users, tab, query]);

  const run = async (u, fn, done) => {
    setBusyId(u.id);
    try {
      await fn();
      toast({ title: done, tone: 'success' });
    } catch (e) {
      toast({ title: 'Could not update the account', description: e.message, tone: 'error' });
    } finally {
      setBusyId(null);
    }
  };

  const setStatus = (u, status, done) => run(u, () => admin.setStatus(u.id, status), done);
  const confirmAction = async () => {
    const { kind, user: u } = confirm;
    setConfirm(null);
    if (kind === 'delete') await run(u, () => admin.deleteUser(u.id), `@${u.username} deleted`);
    else await run(u, () => admin.resolveReset(u.id, true), `New password approved for @${u.username}`);
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="admin-title" fullOnMobile>
      <div className="flex items-center justify-between gap-2 px-5 pt-5 pb-3 border-b border-line">
        <div>
          <h2 id="admin-title" className="font-display font-semibold text-lg">Admin console</h2>
          <p className="text-xs text-muted">Every account on this phone</p>
        </div>
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 pt-3 space-y-3">
        <Segmented
          size="sm"
          className="w-full"
          value={tab}
          onChange={setTab}
          options={[
            { id: 'all', label: `All ${c.all}` },
            { id: 'pending', label: `Waiting ${c.pending + c.resets}` },
            { id: 'active', label: `Active ${c.active}` },
            { id: 'inactive', label: `Inactive ${c.inactive}` },
          ]}
        />
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input className="field pl-9" placeholder="Search @username or name" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search accounts" />
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto px-5 py-3 space-y-2.5">
        {list.length === 0 && <li className="text-sm text-muted text-center py-10">No accounts here.</li>}
        {list.map((u) => {
          const self = u.id === me?.id;
          const busy = busyId === u.id;
          const [label, tone] = STATUS_CHIP[u.account_status] || STATUS_CHIP[STATUS.DISABLED];
          return (
            <li key={u.id} className="rounded-2xl border border-line bg-surface-2 p-3">
              <div className="flex items-start gap-3">
                <Avatar name={u.name || u.username} size={40} className="rounded-xl shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold truncate">{u.name || u.username}</p>
                    {u.role === 'admin' && (
                      <span className="chip bg-accent/20 text-accent-ink border-accent-ink/30">
                        <Crown className="w-3 h-3" /> Admin
                      </span>
                    )}
                    {self && <span className="chip">You</span>}
                  </div>
                  <p className="text-sm text-muted truncate">@{u.username}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    <span className={cn('chip', tone)}>{label}</span>
                    <span className="text-xs text-subtle">Joined {fmtDate(u.created_at)} · Last sign-in {fmtDate(u.last_login)}</span>
                  </div>
                  {u.reset_requested_at && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                      <KeyRound className="w-3.5 h-3.5" /> Asked for a new password on {fmtDate(u.reset_requested_at)}
                    </p>
                  )}
                </div>
                {busy && <Loader2 className="w-4 h-4 animate-spin text-subtle shrink-0" />}
              </div>

              {!self && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {u.account_status === STATUS.PENDING && (
                    <>
                      <button type="button" className="btn btn-primary h-8 px-3 text-xs" disabled={busy} onClick={() => setStatus(u, STATUS.ACTIVE, `@${u.username} approved`)}>
                        <UserCheck className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button type="button" className="btn btn-danger h-8 px-3 text-xs" disabled={busy} onClick={() => setStatus(u, STATUS.REJECTED, `@${u.username} rejected`)}>
                        <UserX className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
                  {u.account_status === STATUS.ACTIVE && u.role !== 'admin' && (
                    <>
                      <button type="button" className="btn btn-ghost h-8 px-3 text-xs" disabled={busy} onClick={() => setStatus(u, STATUS.DISABLED, `@${u.username} disabled`)}>
                        <Ban className="w-3.5 h-3.5" /> Disable
                      </button>
                      <button type="button" className="btn btn-ghost h-8 px-3 text-xs" disabled={busy} onClick={() => run(u, () => admin.setRole(u.id, 'admin'), `@${u.username} is now an admin`)}>
                        <Crown className="w-3.5 h-3.5" /> Make admin
                      </button>
                    </>
                  )}
                  {u.role === 'admin' && (
                    <button type="button" className="btn btn-ghost h-8 px-3 text-xs" disabled={busy} onClick={() => run(u, () => admin.setRole(u.id, 'user'), `@${u.username} is no longer an admin`)}>
                      <Crown className="w-3.5 h-3.5" /> Remove admin
                    </button>
                  )}
                  {isInactive(u) && (
                    <button type="button" className="btn btn-primary h-8 px-3 text-xs" disabled={busy} onClick={() => setStatus(u, STATUS.ACTIVE, `@${u.username} enabled`)}>
                      <RotateCcw className="w-3.5 h-3.5" /> Enable
                    </button>
                  )}
                  {u.reset_requested_at && (
                    <>
                      <button type="button" className="btn btn-primary h-8 px-3 text-xs" disabled={busy} onClick={() => setConfirm({ kind: 'reset', user: u })}>
                        <KeyRound className="w-3.5 h-3.5" /> Approve new password
                      </button>
                      <button type="button" className="btn btn-ghost h-8 px-3 text-xs" disabled={busy} onClick={() => run(u, () => admin.resolveReset(u.id, false), 'Reset request dismissed')}>
                        Dismiss reset
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="btn btn-danger h-8 px-3 text-xs ml-auto"
                    disabled={busy}
                    onClick={() => {
                      setTyped('');
                      setConfirm({ kind: 'delete', user: u });
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Modal open={Boolean(confirm)} onClose={() => setConfirm(null)} labelledBy="admin-confirm-title">
        {confirm && (
          <div className="p-6">
            <span className={cn('grid place-items-center w-12 h-12 rounded-2xl mb-3', confirm.kind === 'delete' ? 'bg-rose-500/12 text-rose-500' : 'bg-amber-500/15 text-amber-600')}>
              {confirm.kind === 'delete' ? <Trash2 className="w-6 h-6" /> : <Hourglass className="w-6 h-6" />}
            </span>
            <h2 id="admin-confirm-title" className="font-display font-semibold text-lg">
              {confirm.kind === 'delete' ? `Delete @${confirm.user.username}?` : `Approve a new password for @${confirm.user.username}?`}
            </h2>
            <p className="text-sm text-muted mt-1">
              {confirm.kind === 'delete'
                ? "The account and all of its tasks, goals and history will be permanently erased from this phone. This can't be undone."
                : "Their tasks are locked with the forgotten password and can't be opened with the new one, so the account's data will be erased and it starts fresh. Check with them first that they really asked for this."}
            </p>
            {confirm.kind === 'delete' && (
              <label className="block mt-4">
                <span className="label">Type {confirm.user.username} to confirm</span>
                <input className="field" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
              </label>
            )}
            <div className="flex gap-2 mt-5">
              <button type="button" className="btn btn-ghost flex-1" onClick={() => setConfirm(null)}>Cancel</button>
              <button
                type="button"
                className={cn('btn flex-1 text-white', confirm.kind === 'delete' ? 'bg-rose-500' : 'bg-amber-500')}
                disabled={confirm.kind === 'delete' && typed.trim().toLowerCase() !== confirm.user.username}
                onClick={confirmAction}
              >
                {confirm.kind === 'delete' ? 'Delete' : 'Approve and reset'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Modal>
  );
}

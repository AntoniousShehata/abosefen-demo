import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useSession } from '../context/SessionContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { DEMO_ACCOUNTS } from '../lib/permissions.js';
import { errorText } from '../lib/errorText.js';

const ICONS = {
  owner: 'M12 3 3 8v2h18V8l-9-5zM5 12v6h3v-6H5zm5.5 0v6h3v-6h-3zM16 12v6h3v-6h-3zM3 20h18v2H3z',
  cashier: 'M4 4h16v4H4V4zm1 6h14l1 10H4l1-10zm4 2v2h6v-2H9z',
  customer: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 8a8 8 0 0 1 16 0H4z',
};

export default function SignIn() {
  const { t, pick } = useI18n();
  const { user, signIn } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(null);
  const [problem, setProblem] = useState('');

  const choose = async (account) => {
    setBusy(account.email);
    setProblem('');
    try {
      await signIn(account.email);
      toast.show(t('auth.signedIn', { name: pick(account.displayName) }));
      navigate(account.role === 'customer' ? '/my-orders' : '/admin');
    } catch (e) {
      setProblem(errorText(t, e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl sm:text-3xl">{t('auth.title')}</h1>
      <p className="mt-2 text-gray-600">{t('auth.intro')}</p>
      <p className="mt-3 inline-flex rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">{t('auth.demoOnly')}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {DEMO_ACCOUNTS.map((account) => {
          const current = user?.email === account.email;
          return (
            <div key={account.email} className={`card flex flex-col p-5 ${current ? 'ring-2 ring-primary' : ''}`} data-testid={`account-${account.role}`}>
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
                    <path d={ICONS[account.role]} />
                  </svg>
                </span>
                <div>
                  <p className="font-bold text-gray-900">{t(`auth.roles.${account.role}`)}</p>
                  <p className="num-ltr text-sm text-gray-500">{account.email}</p>
                </div>
              </div>
              <p className="mt-3 flex-1 text-sm text-gray-600">{t(`auth.roleText.${account.role}`)}</p>
              <button type="button" className={current ? 'btn-ghost mt-4' : 'btn-primary mt-4'} onClick={() => choose(account)} disabled={busy !== null}>
                {t('auth.signInAs', { email: account.email })}
              </button>
            </div>
          );
        })}
      </div>
      {problem && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}

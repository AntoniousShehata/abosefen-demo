import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/index.js';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Modal } from './ui.jsx';

/** On every page: this is a demo with invented data, and a way back to the starting data. */
export default function DemoBanner() {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = async () => {
    setBusy(true);
    await api.reset();
    setBusy(false);
    setAsking(false);
    toast.show(t('banner.resetDone'));
    navigate('/');
  };

  return (
    <div className="bg-amber-100 text-amber-950" data-testid="demo-banner">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5 text-xs sm:text-sm">
        <span className="badge bg-amber-950 text-amber-50">{t('common.demoLabel')}</span>
        <strong className="font-semibold">{t('banner.text')}</strong>
        <span className="hidden text-amber-900/80 md:inline">{t('banner.note')}</span>
        <button type="button" onClick={() => setAsking(true)} className="ms-auto rounded-md border border-amber-900/30 px-2 py-0.5 font-semibold hover:bg-amber-200">
          {t('banner.reset')}
        </button>
      </div>
      <Modal
        open={asking}
        title={t('banner.resetTitle')}
        onClose={() => setAsking(false)}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setAsking(false)}>
              {t('common.cancel')}
            </button>
            <button type="button" className="btn-danger" onClick={reset} disabled={busy}>
              {t('banner.resetConfirm')}
            </button>
          </>
        }
      >
        <p className="text-gray-700">{t('banner.resetBody')}</p>
      </Modal>
    </div>
  );
}

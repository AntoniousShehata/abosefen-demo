import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';
import { EmptyState } from '../components/ui.jsx';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <EmptyState title={t('notFound.title')} text={t('notFound.text')}>
      <Link to="/" className="btn-primary">
        {t('nav.home')}
      </Link>
    </EmptyState>
  );
}

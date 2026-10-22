import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/index.js';
import { useApi } from '../../hooks/useApi.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import ProductArt from '../../components/ProductArt.jsx';
import { ErrorState, Loading, Modal } from '../../components/ui.jsx';
import { errorText, fieldError } from '../../lib/errorText.js';
import { CategoryOptions } from './AdminProducts.jsx';

const EMPTY_FORM = { nameAr: '', nameEn: '', nameDe: '', parentId: '' };

export default function AdminCategories() {
  const { t, pick, number } = useI18n();
  const toast = useToast();
  const { data: categories, error, loading, reload } = useApi(() => api.listCategories({ includeHidden: true }), []);
  const [dialog, setDialog] = useState(null); // { mode: 'add' | 'rename' | 'move', category }
  const [form, setForm] = useState(EMPTY_FORM);
  const [problem, setProblem] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading && !categories) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const byId = Object.fromEntries(categories.map((c) => [c.id, c]));
  const pathOf = (id) => {
    const out = [];
    let c = byId[id];
    while (c) {
      out.unshift(c);
      c = c.parentCategoryId ? byId[c.parentCategoryId] : null;
    }
    return out;
  };
  const descendantsOf = (id) => {
    const out = new Set();
    const walk = (pid) =>
      categories.filter((c) => c.parentCategoryId === pid).forEach((c) => {
        out.add(c.id);
        walk(c.id);
      });
    walk(id);
    return out;
  };

  const open = (mode, category = null) => {
    setProblem(null);
    setDialog({ mode, category });
    setForm(
      mode === 'rename'
        ? { nameAr: category.name.ar, nameEn: category.name.en, nameDe: category.name.de, parentId: '' }
        : { ...EMPTY_FORM, parentId: mode === 'move' ? category.parentCategoryId || '' : '' },
    );
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setProblem(null);
    try {
      const { mode, category } = dialog;
      if (mode === 'add') await api.addCategory({ ...form, parentId: category?.id || null });
      if (mode === 'rename') await api.renameCategory(category.id, form);
      if (mode === 'move') await api.moveCategory(category.id, form.parentId || null);
      toast.show(t('admin.categoriesPage.saved'));
      setDialog(null);
    } catch (err) {
      setProblem(err);
    } finally {
      setBusy(false);
    }
  };

  const title = !dialog
    ? ''
    : dialog.mode === 'add'
      ? dialog.category
        ? t('admin.categoriesPage.addTitle', { parent: pick(dialog.category.name) })
        : t('admin.categoriesPage.addRootTitle')
      : t(`admin.categoriesPage.${dialog.mode}Title`, { name: pick(dialog.category.name) });

  const field = (key, label, optional = false) => (
    <div>
      <label className="label" htmlFor={key}>
        {label} {optional && <span className="font-normal text-gray-400">({t('common.optional')})</span>}
      </label>
      <input
        id={key}
        className={`input ${fieldError(t, problem, key) ? 'border-red-400' : ''}`}
        dir={key === 'nameAr' ? 'rtl' : 'ltr'}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        maxLength={80}
      />
      {fieldError(t, problem, key) && <p className="mt-1 text-xs text-red-600">{fieldError(t, problem, key)}</p>}
    </div>
  );

  const moveOptions =
    dialog?.mode === 'move' ? categories.filter((c) => c.id !== dialog.category.id && !descendantsOf(dialog.category.id).has(c.id)) : [];
  const willBecome =
    dialog?.mode === 'move'
      ? [...(form.parentId ? pathOf(form.parentId) : []), dialog.category].map((c) => pick(c.name)).join(' / ')
      : '';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="me-auto text-2xl">{t('admin.categories')}</h1>
        <button type="button" className="btn-primary" onClick={() => open('add')}>
          + {t('admin.categoriesPage.addRoot')}
        </button>
      </div>
      <p className="rounded-lg bg-primary/5 p-3 text-sm text-gray-700">{t('admin.categoriesPage.intro')}</p>

      <ul className="card divide-y divide-gray-100" data-testid="category-tree">
        {categories.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5" style={{ paddingInlineStart: `${0.75 + c.depth * 1.5}rem` }}>
            <ProductArt art={c.art} className="h-9 w-9 shrink-0" label={pick(c.name)} />
            <div className="min-w-0 flex-1">
              <p className={`text-gray-900 ${c.depth === 0 ? 'font-bold' : 'font-medium'}`}>
                {pick(c.name)}
                {c.isLeaf && <span className="badge ms-2 bg-emerald-50 text-emerald-700">{t('admin.categoriesPage.leaf')}</span>}
              </p>
              <p className="text-xs text-gray-400">
                {c.isLeaf
                  ? t('admin.categoriesPage.productsDirect', { count: number(c.directProductCount) })
                  : t('admin.categoriesPage.productsBranch', { count: number(c.productCount) })}
              </p>
            </div>
            <div className="flex flex-wrap gap-1 text-xs">
              <button type="button" className="rounded-md px-2 py-1 font-semibold text-primary hover:bg-primary/10" onClick={() => open('add', c)}>
                + {t('admin.categoriesPage.addChild')}
              </button>
              <button type="button" className="rounded-md px-2 py-1 font-semibold text-gray-700 hover:bg-gray-100" onClick={() => open('rename', c)}>
                {t('admin.categoriesPage.rename')}
              </button>
              <button type="button" className="rounded-md px-2 py-1 font-semibold text-gray-700 hover:bg-gray-100" onClick={() => open('move', c)}>
                {t('admin.categoriesPage.move')}
              </button>
              <Link to={`/c/${c.slug}`} className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100">
                {t('admin.categoriesPage.view')}
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={!!dialog}
        title={title}
        onClose={() => setDialog(null)}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setDialog(null)}>
              {t('common.cancel')}
            </button>
            <button type="submit" form="category-form" className="btn-primary" disabled={busy}>
              {t('common.save')}
            </button>
          </>
        }
      >
        <form id="category-form" className="space-y-4" onSubmit={save}>
          {dialog?.mode !== 'move' ? (
            <>
              {field('nameAr', t('admin.categoriesPage.nameAr'))}
              {field('nameEn', t('admin.categoriesPage.nameEn'))}
              {field('nameDe', t('admin.categoriesPage.nameDe'), true)}
            </>
          ) : (
            <div>
              <label className="label" htmlFor="parentId">
                {t('admin.categoriesPage.newParent')}
              </label>
              <select id="parentId" className="input" value={form.parentId} onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}>
                <option value="">{t('admin.categoriesPage.topLevel')}</option>
                <CategoryOptions categories={moveOptions} />
              </select>
              <p className="mt-2 text-sm text-gray-600">{t('admin.categoriesPage.willBecome', { path: willBecome })}</p>
            </div>
          )}
          {problem && problem.code !== 'validation' && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">
              {errorText(t, problem)}
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}

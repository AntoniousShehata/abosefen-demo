// The words for an error the fake API answered with, in the chosen language.

export function errorText(t, error) {
  if (!error) return '';
  const code = error.code;
  if (code === 'outOfStock' && Array.isArray(error.details?.items)) return t('errors.outOfStockOrder');
  if (code === 'cannotApply' && error.details?.blockers?.length) {
    const first = error.details.blockers[0];
    return t(`errors.${first.code}`, first.details);
  }
  if (code && t(`errors.${code}`) !== `errors.${code}`) {
    const vars = { ...(error.details || {}) };
    if (code === 'statusNotAllowed') {
      vars.from = t(`order.statuses.${vars.from}`);
      vars.to = t(`order.statuses.${vars.to}`);
    }
    return t(`errors.${code}`, vars);
  }
  return t('errors.generic');
}

/** The message for one form field the API refused ({ fields: { name: 'required' } }). */
export function fieldError(t, error, field) {
  const reason = error?.code === 'validation' ? error.details?.fields?.[field] : null;
  return reason ? t(`errors.fields.${reason}`) : '';
}

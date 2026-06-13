import i18n from '../i18n/index';

/**
 * Translate a key at call time using the raw i18next instance.
 * Use this for toast messages and other imperative calls
 * that happen outside the React render tree.
 */
export function tToast(key, options) {
  return i18n.t(key, options);
}

import { useRouteStore } from '../store/useRouteStore'
import { translations } from '../i18n'

/** Devuelve el objeto de traducciones para el idioma activo. */
export function useT() {
  const locale = useRouteStore((s) => s.locale)
  return translations[locale]
}

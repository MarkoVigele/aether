import { useEffect, useState } from 'react'

export const NARROW_QUERY = '(max-width: 767.98px)'
export const TOUCH_QUERY = '(pointer: coarse)'

export function isNarrowViewport() {
  return typeof window !== 'undefined' && window.matchMedia(NARROW_QUERY).matches
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )

  useEffect(() => {
    const media = window.matchMedia(query)
    const apply = () => setMatches(media.matches)
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [query])

  return matches
}

export function useIsNarrow() {
  return useMediaQuery(NARROW_QUERY)
}

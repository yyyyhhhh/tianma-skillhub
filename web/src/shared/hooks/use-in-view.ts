import { useEffect, useRef, useState } from 'react'

export function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  const optionsRef = useRef(options)

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // If the element is already in the viewport on mount (e.g. after tab switch
    // or back/forward navigation), mark it visible immediately so it never
    // stays stuck at opacity: 0.
    const rect = el.getBoundingClientRect()
    const alreadyVisible =
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0
    if (alreadyVisible) {
      setInView(true)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.15, ...optionsRef.current },
    )

    // Only observe when not already visible to avoid redundant callbacks.
    if (!alreadyVisible) {
      observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  return { ref, inView }
}

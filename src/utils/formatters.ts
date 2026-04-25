import type { ElevationPoint } from '../types'

/**
 * Formatea metros a km con un decimal si >= 1km, si no metros.
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`
  return `${Math.round(meters)} m`
}

/**
 * Formatea metros de desnivel con signo.
 */
export function formatElevation(meters: number): string {
  return `${Math.round(meters)} m`
}

/**
 * Calcula el desnivel positivo acumulado de un perfil de elevación.
 */
export function calcElevationGain(profile: ElevationPoint[]): number {
  let gain = 0
  for (let i = 1; i < profile.length; i++) {
    const diff = profile[i].elevation - profile[i - 1].elevation
    if (diff > 0) gain += diff
  }
  return gain
}

'use client'

import { useEffect, useId, useState } from 'react'
import { distanceKm, isInZone, type Zone } from '@/lib/geo'

export type Address = { label: string; lat: number; lon: number }

type Suggestion = Address & { inZone: boolean }

// French government address search (Géoplateforme / BAN): free, no API key, CORS enabled.
const GEOCODER = 'https://data.geopf.fr/geocodage/search'

export function AddressInput({
  value,
  onChange,
  zone,
}: {
  value: Address | null
  onChange: (address: Address | null) => void
  zone: Zone & { label: string }
}) {
  const [query, setQuery] = useState(value?.label ?? '')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const listId = useId()
  const { zoneCenterLat, zoneCenterLon, zoneRadiusKm } = zone

  useEffect(() => {
    const q = query.trim()
    if (q.length < 4 || q === value?.label) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          q,
          limit: '6',
          lat: String(zoneCenterLat),
          lon: String(zoneCenterLon),
        })
        const res = await fetch(`${GEOCODER}?${params}`, { signal: controller.signal })
        const data = (await res.json()) as {
          features?: { geometry: { coordinates: [number, number] }; properties: { label: string } }[]
        }
        const center = { lat: zoneCenterLat, lon: zoneCenterLon }
        const list = (data.features ?? [])
          .map((f) => {
            const a = { label: f.properties.label, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }
            return { ...a, inZone: isInZone(a, { zoneCenterLat, zoneCenterLon, zoneRadiusKm }) }
          })
          .sort((a, b) => distanceKm(a, center) - distanceKm(b, center))
        setSuggestions(list)
        setOpen(true)
      } catch {
        // Aborted or network error: keep the previous suggestions.
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, value?.label, zoneCenterLat, zoneCenterLon, zoneRadiusKm])

  const outOfZone = value && !isInZone(value, zone)
  const visible = query.trim().length >= 4 && query.trim() !== value?.label ? suggestions : []

  return (
    <div className='relative'>
      <input
        type='text'
        required
        autoComplete='off'
        role='combobox'
        aria-expanded={open}
        aria-controls={listId}
        placeholder='Ex : 2004 route des Lucioles, Biot'
        className='input'
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          if (value) onChange(null)
        }}
        onFocus={() => visible.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {loading && <span className='absolute right-3 top-3 text-xs text-neutral-400'>…</span>}
      {open && visible.length > 0 && (
        <ul
          id={listId}
          role='listbox'
          className='absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg'
        >
          {visible.map((s) => (
            <li key={`${s.label}-${s.lat}`}>
              <button
                type='button'
                className='flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-stone-100'
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery(s.label)
                  onChange({ label: s.label, lat: s.lat, lon: s.lon })
                  setOpen(false)
                }}
              >
                <span>{s.label}</span>
                {!s.inZone && <span className='shrink-0 text-xs text-red-600'>hors zone</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim().length >= 4 && !value && !open && !loading && (
        <p className='mt-1 text-sm text-neutral-500'>Choisissez votre adresse dans la liste.</p>
      )}
      {outOfZone && <p className='mt-1 text-sm text-red-600'>Désolé, nous livrons uniquement à {zone.label}.</p>}
    </div>
  )
}

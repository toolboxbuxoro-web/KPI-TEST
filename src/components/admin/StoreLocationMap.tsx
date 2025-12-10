'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface StoreLocationMapProps {
  latitude: number
  longitude: number
  radiusMeters: number
}

export function StoreLocationMap({ latitude, longitude, radiusMeters }: StoreLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [latitude, longitude],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    })

    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    // Custom marker icon
    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        width: 20px;
        height: 20px;
        background: linear-gradient(135deg, #8b5cf6, #6d28d9);
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(109, 40, 217, 0.5);
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })

    // Add marker
    L.marker([latitude, longitude], { icon: customIcon }).addTo(map)

    // Add radius circle
    L.circle([latitude, longitude], {
      radius: radiusMeters,
      color: '#8b5cf6',
      fillColor: '#8b5cf6',
      fillOpacity: 0.15,
      weight: 2,
      opacity: 0.6,
    }).addTo(map)

    // Fit map to show the radius
    const bounds = L.latLng(latitude, longitude).toBounds(radiusMeters * 2.5)
    map.fitBounds(bounds)

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [latitude, longitude, radiusMeters])

  // Update map when props change
  useEffect(() => {
    if (!mapInstanceRef.current) return

    const map = mapInstanceRef.current
    
    // Clear existing layers except tile layer
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer)
      }
    })

    // Re-center
    map.setView([latitude, longitude], map.getZoom())

    // Custom marker icon
    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        width: 20px;
        height: 20px;
        background: linear-gradient(135deg, #8b5cf6, #6d28d9);
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(109, 40, 217, 0.5);
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })

    // Add marker
    L.marker([latitude, longitude], { icon: customIcon }).addTo(map)

    // Add radius circle
    L.circle([latitude, longitude], {
      radius: radiusMeters,
      color: '#8b5cf6',
      fillColor: '#8b5cf6',
      fillOpacity: 0.15,
      weight: 2,
      opacity: 0.6,
    }).addTo(map)

    // Fit bounds
    const bounds = L.latLng(latitude, longitude).toBounds(radiusMeters * 2.5)
    map.fitBounds(bounds)
  }, [latitude, longitude, radiusMeters])

  return (
    <div 
      ref={mapRef} 
      className="w-full h-40 rounded-lg overflow-hidden border border-white/20 shadow-lg"
      style={{ minHeight: '160px' }}
    />
  )
}

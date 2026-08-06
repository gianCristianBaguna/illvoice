export interface ReverseGeocodeResult {
  displayName: string
  barangayName?: string
}

function parseBarangayFromDisplayName(displayName: string): string | undefined {
  const match = displayName.match(/(?:Barangay|Brgy\.?|Brgy)\s+([^,]+)/i)
  if (match && match[1]) {
    return match[1].trim()
  }

  return undefined
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
  const maxRetries = 2
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18`
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'ILLVoice/1.0',
          'Accept-Language': 'en',
        },
      })

      if (!res.ok) {
        if (attempt === maxRetries) {
          return { displayName: '' }
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
        continue
      }

      const data = await res.json()
      if (data.error) {
        if (attempt === maxRetries) {
          return { displayName: '' }
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
        continue
      }

      const displayName = data.display_name || ''

      const address = data.address || {}
      const neighbourhood = address.neighbourhood || ''
      const barangayName =
        (neighbourhood && /^(Barangay|Brgy\.?|Brgy)/i.test(neighbourhood) ? neighbourhood : undefined) ||
        (neighbourhood && !/(Subdivision|Heights|Estates|Villas|Homes|Gardens|Plaza|Center|Centre|Mall|Tower|Building|Residences|Condo)/i.test(neighbourhood) ? neighbourhood : undefined) ||
        address.quarter ||
        address.village ||
        address.borough ||
        address.city_district ||
        address.district ||
        address.hamlet ||
        address.town ||
        parseBarangayFromDisplayName(displayName)

      return { displayName, barangayName }
    } catch {
      if (attempt === maxRetries) {
        return { displayName: '' }
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
    }
  }

  return { displayName: '' }
}

export async function reverseGeocodeWithFallback(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  fallbackAddress?: string | null,
): Promise<string> {
  if (latitude == null || longitude == null) {
    return fallbackAddress || 'Location not recorded'
  }
  const result = await reverseGeocode(latitude, longitude)
  return result.displayName
}

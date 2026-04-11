import { authenticatedFetch } from './api.js'

const MONTHS = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 }

function parseMonth(str) {
  return MONTHS[str.toLowerCase().slice(0, 3)]
}

export async function scanExpiryDate(imageSource) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  await new Promise((resolve) => {
    if (imageSource instanceof HTMLCanvasElement) {
      canvas.width = imageSource.width
      canvas.height = imageSource.height
      ctx.drawImage(imageSource, 0, 0)
      resolve()
    } else if (imageSource instanceof File) {
      const url = URL.createObjectURL(imageSource)
      const img = new Image()
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)
        resolve()
      }
      img.src = url
    }
  })

  const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]

  const res = await authenticatedFetch('https://scanexpiry-moat6vqvca-uc.a.run.app', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64 })
  })

  const data = await res.json()
  const text = data.rawText || ''

  // if backend already parsed a numeric date, use it
  if (data.date) return data.date

  // DD MMM YYYY or DD MMM YY  e.g. 24 SEP 2026, 25 MAY 26
  let match = text.match(/(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{2,4})/)
  if (match) {
    const day = match[1].padStart(2, '0')
    const month = parseMonth(match[2])
    if (month) {
      let year = match[3]
      if (year.length === 2) year = '20' + year
      return `${year}-${String(month).padStart(2, '0')}-${day}`
    }
  }

  // MMM YYYY or MMM YY  e.g. SEP 2026, SEP 26
  match = text.match(/([a-zA-Z]{3,9})\s+(\d{2,4})/)
  if (match) {
    const month = parseMonth(match[1])
    if (month) {
      let year = match[2]
      if (year.length === 2) year = '20' + year
      return `${year}-${String(month).padStart(2, '0')}-01`
    }
  }

  return null
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')

export type ImageSettings = {
  prompt: string
  size: string
  quality: string
  aspectRatio: string
  style: string
  background: string
}

type ImageResponse = { image_data_url: string }

async function parseResponse(response: Response): Promise<ImageResponse> {
  if (!response.ok) {
    let message = 'Request failed. Please try again.'
    try {
      const data = await response.json()
      message = data.detail || message
    } catch { /* keep generic message */ }
    throw new Error(message)
  }
  return response.json()
}

export async function generateImage(settings: ImageSettings, reference?: File): Promise<string> {
  const body = new FormData()
  body.append('prompt', settings.prompt)
  body.append('size', settings.size)
  body.append('quality', settings.quality)
  body.append('aspect_ratio', settings.aspectRatio)
  body.append('style', settings.style)
  body.append('background', settings.background)
  if (reference) body.append('reference_image', reference)
  const response = await fetch(`${API_BASE}/api/images/generate`, { method: 'POST', body })
  return (await parseResponse(response)).image_data_url
}

export async function editImage(settings: Pick<ImageSettings, 'prompt' | 'size' | 'quality'>, image: Blob): Promise<string> {
  const body = new FormData()
  body.append('prompt', settings.prompt)
  body.append('size', settings.size)
  body.append('quality', settings.quality)
  body.append('image', image, 'previous-output.png')
  const response = await fetch(`${API_BASE}/api/images/edit`, { method: 'POST', body })
  return (await parseResponse(response)).image_data_url
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl)
  return response.blob()
}

import { useRef, useState } from 'react'
import { ImagePlus, Sparkles, Download, RefreshCw, WandSparkles, X, Upload, Image as ImageIcon, LoaderCircle } from 'lucide-react'
import { dataUrlToBlob, editImage, generateImage, type ImageSettings } from './services/imageService'

const initialSettings: ImageSettings = {
  prompt: 'Create a premium product advertisement using the uploaded product image. Keep the product shape, color, and branding consistent. Use a clean studio background with realistic lighting and professional product photography.',
  size: '1024x1024',
  quality: 'medium',
  aspectRatio: '1:1',
  style: 'Realistic',
  background: 'White studio',
}

export default function App() {
  const [file, setFile] = useState<File | null>(null)
  const [sourcePreview, setSourcePreview] = useState('')
  const [output, setOutput] = useState('')
  const [settings, setSettings] = useState<ImageSettings>(initialSettings)
  const [editPrompt, setEditPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'generate' | 'edit'>('generate')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function chooseFile(next: File | undefined) {
    if (!next) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(next.type)) {
      setError('Choose a PNG, JPG, or WebP image.')
      return
    }
    if (next.size > 10 * 1024 * 1024) {
      setError('Image must be 10 MB or smaller.')
      return
    }
    setFile(next)
    setSourcePreview(URL.createObjectURL(next))
    setError('')
  }

  function update<K extends keyof ImageSettings>(key: K, value: ImageSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  async function onGenerate() {
    if (!settings.prompt.trim()) { setError('Please enter a prompt.'); return }
    setBusy(true); setError('')
    try {
      const result = await generateImage(settings, file || undefined)
      setOutput(result)
      setEditPrompt('')
      setMode('edit')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed.')
    } finally { setBusy(false) }
  }

  async function onEdit() {
    if (!output) { setError('Generate an image first.'); return }
    if (!editPrompt.trim()) { setError('Enter an instruction for the edit.'); return }
    setBusy(true); setError('')
    try {
      const blob = await dataUrlToBlob(output)
      const result = await editImage({ prompt: editPrompt, size: settings.size, quality: settings.quality }, blob)
      setOutput(result)
      setEditPrompt('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Edit failed.')
    } finally { setBusy(false) }
  }

  function downloadOutput() {
    if (!output) return
    const link = document.createElement('a')
    link.href = output
    link.download = 'pixelforge-product-image.png'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  function clearSource() {
    setFile(null); setSourcePreview('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><Sparkles size={19}/></div><div><strong>PixelForge</strong><span>AI PRODUCT IMAGE STUDIO</span></div></div>
        <div className="topbar-right"><span className="status-dot"/><span>Workspace</span><div className="avatar">K</div></div>
      </header>

      <section className="intro">
        <div><p className="eyebrow">CREATIVE WORKSPACE</p><h1>Product image <span>generator</span></h1><p className="subtitle">Turn your product photos into studio-quality visuals.</p></div>
        <div className="step-chip"><span>01</span> Create <i/> <span>02</span> Refine <i/> <span>03</span> Export</div>
      </section>

      <section className="workspace">
        <aside className="panel upload-panel">
          <div className="panel-heading"><div><span className="panel-number">01</span><h2>Product image</h2></div><span className="optional">OPTIONAL</span></div>
          <p className="panel-desc">Upload a reference photo to help preserve your product.</p>
          <input ref={fileRef} className="hidden-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => chooseFile(e.target.files?.[0])}/>
          {sourcePreview ? <div className="source-preview"><img src={sourcePreview} alt="Selected product"/><button className="icon-button remove" onClick={clearSource} title="Remove image"><X size={16}/></button><div className="file-label"><ImageIcon size={14}/><span>{file?.name}</span></div></div> :
            <button className="dropzone" onClick={() => fileRef.current?.click()}><div className="upload-icon"><Upload size={22}/></div><strong>Drop your image here</strong><span>or click to browse files</span><small>PNG, JPG or WebP · up to 10 MB</small></button>}
          {sourcePreview && <button className="secondary-button full" onClick={() => fileRef.current?.click()}><RefreshCw size={15}/> Replace image</button>}
          <div className="tip-card"><Sparkles size={16}/><p><strong>Pro tip</strong><br/>Use a clear photo with the product centered for best results.</p></div>
        </aside>

        <section className="panel settings-panel">
          <div className="panel-heading"><div><span className="panel-number">02</span><h2>Prompt & settings</h2></div><span className="live-badge">● READY</span></div>
          <label className="field-label" htmlFor="prompt">IMAGE PROMPT</label>
          <textarea id="prompt" className="prompt-input" value={settings.prompt} onChange={e => update('prompt', e.target.value)} placeholder="Describe the image you want to create..." rows={6}/>
          <div className="prompt-hint"><WandSparkles size={14}/> Be specific about lighting, scene, and product details.</div>
          <div className="settings-grid">
            <div className="field"><label className="field-label">IMAGE SIZE</label><select value={settings.size} onChange={e => update('size', e.target.value)}><option value="1024x1024">Square · 1024×1024</option><option value="1536x1024">Landscape · 1536×1024</option><option value="1024x1536">Portrait · 1024×1536</option></select></div>
            <div className="field"><label className="field-label">QUALITY</label><select value={settings.quality} onChange={e => update('quality', e.target.value)}><option value="low">Standard · Low</option><option value="medium">Balanced · Medium</option><option value="high">High detail</option><option value="auto">Auto</option></select></div>
            <div className="field"><label className="field-label">ASPECT RATIO</label><select value={settings.aspectRatio} onChange={e => update('aspectRatio', e.target.value)}><option>1:1</option><option>16:9</option><option>9:16</option><option>4:3</option></select></div>
            <div className="field"><label className="field-label">VISUAL STYLE</label><select value={settings.style} onChange={e => update('style', e.target.value)}><option>Realistic</option><option>3D</option><option>Minimal</option><option>Catalogue</option></select></div>
            <div className="field full-field"><label className="field-label">BACKGROUND</label><select value={settings.background} onChange={e => update('background', e.target.value)}><option>White studio</option><option>Transparent</option><option>Professional studio</option><option>Outdoor</option><option>Soft gradient</option></select></div>
          </div>
          <button className="primary-button" onClick={onGenerate} disabled={busy}><span>{busy ? <LoaderCircle className="spin" size={18}/> : <Sparkles size={18}/>}</span>{busy ? 'Generating image…' : 'Generate image'}<span className="button-arrow">↗</span></button>
          <p className="secure-note">Your API key stays secure on the backend.</p>
        </section>

        <section className="panel output-panel">
          <div className="panel-heading"><div><span className="panel-number">03</span><h2>AI output</h2></div>{output && <span className="live-badge">● GENERATED</span>}</div>
          <p className="panel-desc">Your generated image will appear here.</p>
          <div className={`output-canvas ${output ? 'has-output' : ''}`}>
            {output ? <img src={output} alt="AI generated product"/ > : busy ? <div className="loading-state"><LoaderCircle className="spin" size={32}/><strong>Creating your image</strong><span>This can take up to a minute.</span></div> : <div className="empty-state"><div className="empty-art"><ImagePlus size={32}/><Sparkles className="mini-sparkle" size={17}/></div><strong>Your canvas is waiting</strong><span>Generated artwork will show up here.</span></div>}
          </div>
          {output && <div className="output-actions"><button className="secondary-button" onClick={downloadOutput}><Download size={16}/> Download PNG</button><button className="secondary-button" onClick={onGenerate} disabled={busy}><RefreshCw size={15}/> Regenerate</button></div>}
          <div className="edit-box"><label className="field-label">EDIT EXISTING IMAGE</label><textarea value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="e.g. Change the bottle color to matte black, keep everything else the same." rows={3} disabled={!output || busy}/><button className="edit-button" onClick={onEdit} disabled={!output || busy || !editPrompt.trim()}>{busy ? <LoaderCircle className="spin" size={16}/> : <WandSparkles size={16}/>} Apply edit</button></div>
        </section>
      </section>
      {error && <div className="error-toast"><span>{error}</span><button onClick={() => setError('')}><X size={16}/></button></div>}
      <footer><span>PIXELFORGE © 2026</span><span>Made for product creators <Sparkles size={13}/></span></footer>
    </main>
  )
}

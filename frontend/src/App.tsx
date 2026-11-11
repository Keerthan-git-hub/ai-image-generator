import { useEffect, useRef, useState, type DragEvent } from 'react'
import { ArrowDownToLine, ArrowUpRight, Check, ImagePlus, Image as ImageIcon, LoaderCircle, Moon, RefreshCw, Sparkles, Sun, Upload, WandSparkles, X } from 'lucide-react'
import { dataUrlToBlob, editImage, generateImage, type ImageSettings } from './services/imageService'

const initialSettings: ImageSettings = {
  prompt: '',
  size: '1024x1024',
  quality: 'medium',
  aspectRatio: '1:1',
  style: 'Realistic',
  background: 'White studio',
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('pixelforge-theme')
    const isDark = savedTheme === 'dark'
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
    return isDark
  })
  const [file, setFile] = useState<File | null>(null)
  const [sourcePreview, setSourcePreview] = useState('')
  const [output, setOutput] = useState('')
  const [settings, setSettings] = useState<ImageSettings>(initialSettings)
  const [editPrompt, setEditPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const theme = darkMode ? 'dark' : 'light'
    document.documentElement.dataset.theme = theme
    localStorage.setItem('pixelforge-theme', theme)
  }, [darkMode])

  useEffect(() => {
    if (!sourcePreview.startsWith('blob:')) return
    return () => URL.revokeObjectURL(sourcePreview)
  }, [sourcePreview])

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

  function onDropImage(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setIsDragging(false)
    chooseFile(event.dataTransfer.files[0])
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
    const format = output.match(/^data:image\/([^;,]+)/)?.[1]?.replace('jpeg', 'jpg') || 'png'
    link.download = `pixelforge-product-image.${format}`
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
      <header className="topbar" id="top">
        <a className="brand" href="#top" aria-label="PixelForge home">
          <div className="brand-mark"><Sparkles size={19}/></div>
          <div><strong>PixelForge</strong><span>PRODUCT IMAGE STUDIO</span></div>
        </a>
        <div className="topbar-right">
          <span className="workspace-label"><span className="status-dot"/> Your creative workspace</span>
          <button
            type="button"
            className="theme-toggle"
            role="switch"
            aria-checked={darkMode}
            aria-label="Dark mode"
            title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
            onClick={() => setDarkMode(value => !value)}
          >
            <Sun size={15} aria-hidden="true"/>
            <span className="theme-toggle-track"><span/></span>
            <Moon size={15} aria-hidden="true"/>
          </button>
          <span className="avatar" aria-label="Account">P</span>
        </div>
      </header>

      <section className="intro">
        <div className="intro-copy">
          <p className="eyebrow"><span/> THE PRODUCT IMAGE STUDIO</p>
          <h1>Create <span>standout product images.</span></h1>
          <p className="subtitle">Create polished, on-brand visuals from a prompt or a product photo.</p>
        </div>
        <div className="step-chip" aria-label="Workflow: create, refine, export">
          <span className="step-active"><b>01</b> Create</span><i/>
          <span><b>02</b> Refine</span><i/>
          <span><b>03</b> Export</span>
        </div>
      </section>

      <section className="workspace">
        <aside className="panel upload-panel">
          <div className="panel-heading">
            <div className="heading-title"><span className="panel-number">01</span><h2>Start with a photo</h2></div>
            <span className="optional">OPTIONAL</span>
          </div>
          <p className="panel-desc">Add a product photo to guide the look and keep details recognizable.</p>
          <input ref={fileRef} id="product-image" className="hidden-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => chooseFile(e.target.files?.[0])}/>
          {sourcePreview ? (
            <div className="source-preview">
              <img src={sourcePreview} alt="Selected product reference"/>
              <button type="button" className="icon-button remove" onClick={clearSource} title="Remove image" aria-label="Remove selected image"><X size={16}/></button>
              <div className="file-label"><ImageIcon size={14}/><span>{file?.name}</span><Check size={14} className="file-check"/></div>
            </div>
          ) : (
            <button
              type="button"
              className={`dropzone ${isDragging ? 'is-dragging' : ''}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={event => { event.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDropImage}
              aria-describedby="upload-help"
            >
              <div className="upload-icon"><Upload size={21}/></div>
              <strong>Drop your image here</strong>
              <span>or <em>browse files</em></span>
              <small id="upload-help">PNG, JPG or WebP <i/> Up to 10 MB</small>
            </button>
          )}
          {sourcePreview && <button type="button" className="secondary-button full" onClick={() => fileRef.current?.click()}><RefreshCw size={15}/> Replace photo</button>}
          <div className="tip-card"><span className="tip-icon"><Sparkles size={15}/></span><p><strong>A little tip</strong><br/>A clear, well-lit photo gives you the best starting point.</p></div>
        </aside>

        <section className="panel settings-panel">
          <div className="panel-heading">
            <div className="heading-title"><span className="panel-number">02</span><h2>Describe your vision</h2></div>
            <span className={`live-badge ${busy ? 'is-busy' : ''}`}><i/>{busy ? 'WORKING' : 'READY'}</span>
          </div>
          <p className="panel-desc settings-desc">A few details go a long way. Tell us what you want to see.</p>
          <label className="field-label" htmlFor="prompt">YOUR PROMPT</label>
          <textarea id="prompt" className="prompt-input" value={settings.prompt} onChange={e => update('prompt', e.target.value)} placeholder="A minimalist skincare bottle on a sunlit stone pedestal, soft shadows, warm neutral tones…" rows={5}/>
          <div className="prompt-hint"><WandSparkles size={14}/> Describe the scene, lighting, and mood.</div>
          <div className="settings-grid">
            <div className="field"><label className="field-label" htmlFor="image-size">IMAGE SIZE</label><select id="image-size" value={settings.size} onChange={e => update('size', e.target.value)}><option value="1024x1024">Square · 1024×1024</option><option value="1536x1024">Landscape · 1536×1024</option><option value="1024x1536">Portrait · 1024×1536</option></select></div>
            <div className="field"><label className="field-label" htmlFor="quality">QUALITY</label><select id="quality" value={settings.quality} onChange={e => update('quality', e.target.value)}><option value="low">Standard · Low</option><option value="medium">Balanced · Medium</option><option value="high">High detail</option><option value="auto">Auto</option></select></div>
            <div className="field"><label className="field-label" htmlFor="aspect-ratio">ASPECT RATIO</label><select id="aspect-ratio" value={settings.aspectRatio} onChange={e => update('aspectRatio', e.target.value)}><option>1:1</option><option>16:9</option><option>9:16</option><option>4:3</option></select></div>
            <div className="field"><label className="field-label" htmlFor="visual-style">VISUAL STYLE</label><select id="visual-style" value={settings.style} onChange={e => update('style', e.target.value)}><option>Realistic</option><option>3D</option><option>Minimal</option><option>Catalogue</option></select></div>
            <div className="field full-field"><label className="field-label" htmlFor="background">BACKGROUND</label><select id="background" value={settings.background} onChange={e => update('background', e.target.value)}><option>White studio</option><option>Transparent</option><option>Professional studio</option><option>Outdoor</option><option>Soft gradient</option></select></div>
          </div>
          <button type="button" className="primary-button" onClick={onGenerate} disabled={busy || !settings.prompt.trim()}>
            <span className="primary-icon">{busy ? <LoaderCircle className="spin" size={18}/> : <Sparkles size={18}/>}</span>
            <span>{busy ? 'Creating your image…' : output ? 'Create another image' : 'Generate image'}</span>
            <ArrowUpRight size={18} className="button-arrow"/>
          </button>
          <p className="secure-note"><span/> Your image is generated securely. Your API key stays private.</p>
        </section>

        <section className="panel output-panel">
          <div className="panel-heading">
            <div className="heading-title"><span className="panel-number">03</span><h2>Your canvas</h2></div>
            {output && <span className="live-badge generated-badge"><i/>GENERATED</span>}
          </div>
          <p className="panel-desc">Your new product visual will appear here.</p>
          <div className={`output-canvas ${output ? 'has-output' : ''} ${busy && !output ? 'is-generating' : ''}`}>
            {output ? <img src={output} alt="Generated product visual"/> : busy ? <div className="loading-state"><span className="loading-orbit"><LoaderCircle className="spin" size={30}/></span><strong>Bringing your vision to life</strong><span>This usually takes a little moment.</span></div> : <div className="empty-state"><div className="empty-art"><ImagePlus size={30}/><Sparkles className="mini-sparkle" size={16}/></div><strong>A blank canvas, full of potential.</strong><span>Your first image will show up here.</span></div>}
          </div>
          {output && <div className="output-actions"><button type="button" className="secondary-button download-button" onClick={downloadOutput}><ArrowDownToLine size={16}/> Download image</button><button type="button" className="secondary-button regenerate-button" onClick={onGenerate} disabled={busy}><RefreshCw size={15}/> Try again</button></div>}
          <div className={`edit-box ${!output ? 'is-disabled' : ''}`}>
            <label className="field-label" htmlFor="edit-prompt">MAKE A QUICK EDIT</label>
            <textarea id="edit-prompt" value={editPrompt} onChange={e => setEditPrompt(e.target.value)} placeholder="Try: Add a soft shadow and warm up the lighting…" rows={2} disabled={!output || busy}/>
            <button type="button" className="edit-button" onClick={onEdit} disabled={!output || busy || !editPrompt.trim()}>{busy ? <LoaderCircle className="spin" size={16}/> : <WandSparkles size={16}/>} Apply edit</button>
            {!output && <span className="edit-hint">Generate an image first to start refining.</span>}
          </div>
        </section>
      </section>
      {error && <div className="error-toast" role="alert"><span>{error}</span><button type="button" aria-label="Dismiss error" onClick={() => setError('')}><X size={16}/></button></div>}
      <footer><span>PIXELFORGE <i/> PRODUCT IMAGE STUDIO</span><span>Made for the makers <Sparkles size={13}/></span></footer>
    </main>
  )
}

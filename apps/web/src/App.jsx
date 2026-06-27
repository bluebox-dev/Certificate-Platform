import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import logoImg from './assets/logo.png'
import { LogIn, LogOut, Award, CheckCircle, AlertTriangle, Shield, Layers, Users, FileSpreadsheet, Eye, EyeOff, Plus, Download, Upload, RefreshCw, FileText, Search, X, Briefcase, GraduationCap, Building2, Clock, Hash, Mail, Lock, FileUp, ShieldCheck, ShieldX, Fingerprint, Globe, Trash2, Sparkles, Edit, Save, Check, ArrowUpDown, Printer } from 'lucide-react'

const API_URL = window.location.pathname.startsWith('/certificate') ? '/certificate' : ''

const resolveImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (url.includes('/certificates/')) {
      const path = url.substring(url.indexOf('/certificates/'))
      if (window.location.pathname.startsWith('/certificate')) {
        return '/certificate' + path
      }
      return path
    }
    return url
  }
  if (url.startsWith('/certificates')) {
    if (window.location.pathname.startsWith('/certificate')) {
      return '/certificate' + url
    }
    return url
  }
  return url
}

const getSubpathHtmlPreview = (html) => {
  if (!html) return ''
  if (window.location.pathname.startsWith('/certificate')) {
    let processed = html.replace(/src=["']\/certificates\//g, 'src="/certificate/certificates/')
    processed = processed.replace(/src=["']http:\/\/10\.100\.16\.104\/certificates\//g, 'src="/certificate/certificates/')
    return processed
  } else {
    let processed = html.replace(/src=["']http:\/\/10\.100\.16\.104\/certificates\//g, 'src="/certificates/')
    return processed
  }
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [role, setRole] = useState(localStorage.getItem('role') || '')
  const [email, setEmail] = useState(localStorage.getItem('email') || '')
  const [user, setUser] = useState(null)
  const [oauthError, setOauthError] = useState('')

  const [currentPath, setCurrentPath] = useState(() => {
    let path = window.location.pathname
    if (path.startsWith('/certificate')) {
      path = path.replace('/certificate', '')
    }
    path = path.replace(/^\//, '')
    if (path.startsWith('verify/')) return 'home'
    if (token) {
      if (role === 'super_admin') return 'admin'
      if (role === 'staff') return 'staff'
      if (role === 'verifier') return 'verifier'
    }
    return 'home'
  })

  const [verifyTokenParam, setVerifyTokenParam] = useState(() => {
    let path = window.location.pathname
    if (path.startsWith('/certificate')) {
      path = path.replace('/certificate', '')
    }
    if (path.startsWith('/verify/')) return path.split('/verify/')[1]
    return ''
  })

  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/api/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => { if (res.ok) return res.json(); throw new Error('') })
        .then(data => setUser(data))
        .catch(() => handleLogout())
    }
  }, [token])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    const urlRole = params.get('role')
    const urlEmail = params.get('email')
    const urlError = params.get('error')
    const emailParam = params.get('email')
    
    if (urlToken && urlRole && urlEmail) {
      handleLogin(urlToken, urlRole, urlEmail)
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (urlError) {
      let errMsg = 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ'
      if (urlError === 'not_in_whitelist') {
        errMsg = `อีเมล ${emailParam ? decodeURIComponent(emailParam) : ''} ไม่ได้รับอนุญาตให้เข้าใช้งานระบบ (ไม่มีใน Whitelist) กรุณาติดต่อผู้ดูแลระบบ`
      } else if (urlError === 'google_oauth_disabled') {
        errMsg = 'การเข้าสู่ระบบผ่าน Google OAuth ถูกปิดใช้งานโดยผู้ดูแลระบบ'
      } else if (urlError === 'google_token_failed') {
        errMsg = 'ไม่สามารถแลกเปลี่ยนโทเคนของ Google ได้'
      }
      setOauthError(errMsg)
      setCurrentPath('login')
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const handleLogin = (jwtToken, userRole, userEmail) => {
    localStorage.setItem('token', jwtToken)
    localStorage.setItem('role', userRole)
    localStorage.setItem('email', userEmail)
    setToken(jwtToken); setRole(userRole); setEmail(userEmail)
    if (userRole === 'super_admin') setCurrentPath('admin')
    else if (userRole === 'staff') setCurrentPath('staff')
    else setCurrentPath('verifier')
  }

  const handleLogout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('role'); localStorage.removeItem('email')
    setToken(''); setRole(''); setEmail(''); setUser(null); setCurrentPath('home')
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div>
      {/* แถบนำทาง */}
      <nav className="navbar">
        <div className="navbar-brand" onClick={() => setCurrentPath('home')}>
          <img src={logoImg} alt="KMITL Logo" style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
          <span>ระบบใบรับรองอิเล็กทรอนิกส์</span>
        </div>

        <div className="navbar-links">
          <span className={`navbar-link ${currentPath === 'home' ? 'active' : ''}`} onClick={() => setCurrentPath('home')}>
            ตรวจสอบใบรับรอง
          </span>

          {token ? (
            <>
              {role === 'super_admin' && (
                <span className={`navbar-link ${currentPath === 'admin' ? 'active' : ''}`} onClick={() => setCurrentPath('admin')}>
                  จัดการระบบ
                </span>
              )}
              {role === 'staff' && (
                <span className={`navbar-link ${currentPath === 'staff' ? 'active' : ''}`} onClick={() => setCurrentPath('staff')}>
                  แดชบอร์ด
                </span>
              )}
              {role === 'verifier' && (
                <span className={`navbar-link ${currentPath === 'verifier' ? 'active' : ''}`} onClick={() => setCurrentPath('verifier')}>
                  ใบรับรองของฉัน
                </span>
              )}
              <div className="navbar-user">
                <div className="navbar-avatar">{getInitials(user?.full_name || email)}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{user?.full_name || email}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {role === 'super_admin' ? 'ผู้ดูแลระบบ' : role === 'staff' ? 'เจ้าหน้าที่' : 'ผู้รับใบรับรอง'}
                  </div>
                </div>
                <button className="btn-icon" onClick={handleLogout} title="ออกจากระบบ">
                  <LogOut size={16} />
                </button>
              </div>
            </>
          ) : (
            <button className="btn btn-primary" style={{ padding: '7px 18px' }} onClick={() => setCurrentPath('login')}>
              <LogIn size={15} /> เข้าสู่ระบบ
            </button>
          )}
        </div>
      </nav>

      {/* เนื้อหา */}
      <div className={currentPath === 'staff' || currentPath === 'admin' ? '' : 'page-container'} key={currentPath}>
        <div className="animate-in">
          {currentPath === 'home' && <VerifyPage defaultToken={verifyTokenParam} />}
          {currentPath === 'login' && <LoginPage onLogin={handleLogin} initialError={oauthError} />}
          {currentPath === 'staff' && token && role === 'staff' && <StaffDashboard token={token} />}
          {currentPath === 'verifier' && token && role === 'verifier' && <VerifierProfile token={token} />}
          {currentPath === 'admin' && token && role === 'super_admin' && <AdminPanel token={token} email={email} />}
        </div>
      </div>
    </div>
  )
}


/* ==========================================================================
   หน้าตรวจสอบใบรับรอง
   ========================================================================== */
function VerifyPage({ defaultToken }) {
  const [tokenInput, setTokenInput] = useState(defaultToken || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfResult, setPdfResult] = useState(null)
  const [pdfError, setPdfError] = useState('')

  // Interactive dropzone states
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => { if (defaultToken) handleVerifyToken(defaultToken) }, [defaultToken])

  const handleVerifyToken = (tokenToVerify) => {
    let target = tokenToVerify || tokenInput
    if (!target) return
    target = target.trim()
    // If user pasted a full URL, extract the token part
    if (target.includes('/verify/')) {
      const parts = target.split('/verify/')
      target = parts[parts.length - 1]
    }
    // Remove query params or hashes if present
    target = target.split('?')[0].split('#')[0]
    if (!target) return

    setLoading(true); setError(''); setResult(null)
    fetch(`${API_URL}/api/verify/${target}`)
      .then(async res => { if (res.ok) return res.json(); const err = await res.json(); throw new Error(err.detail || 'ไม่พบใบรับรอง') })
      .then(data => setResult(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  const triggerPdfUpload = (file) => {
    setPdfFile(file); setPdfError(''); setPdfResult(null)
    const formData = new FormData()
    formData.append('file', file)
    fetch(`${API_URL}/api/verify/pdf`, { method: 'POST', body: formData })
      .then(async res => { if (res.ok) return res.json(); const err = await res.json(); throw new Error(err.detail || 'ตรวจสอบไม่สำเร็จ') })
      .then(data => setPdfResult(data))
      .catch(err => setPdfError(err.message))
  }

  const handlePdfUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    triggerPdfUpload(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') {
      triggerPdfUpload(file)
    } else {
      setPdfError('กรุณาอัปโหลดไฟล์ PDF เท่านั้น')
    }
  }

  const handleZoneClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', width: '100%' }}>
      {/* หัวข้อหลัก */}
      <div style={{ textAlign: 'center', marginBottom: 48, paddingTop: 16 }}>
        <div 
          className="fingerprint-scanner" 
          style={{
            width: 56, height: 56, margin: '0 auto 20px',
            borderRadius: 14, background: 'var(--accent-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <Fingerprint size={28} color="var(--accent)" />
        </div>
        <h1 className="hero-title">ตรวจสอบใบรับรองอิเล็กทรอนิกส์</h1>
        <p className="hero-subtitle" style={{ marginTop: 12 }}>
          ยืนยันความถูกต้องและความสมบูรณ์ของใบรับรองดิจิทัลที่ออกโดยระบบของเราได้ทันที
        </p>
      </div>

      {/* สองวิธีตรวจสอบ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 40 }}>
        {/* ตรวจสอบด้วยรหัส */}
        <div className="card animate-in stagger-1" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div className="icon-box"><Search size={18} /></div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>ตรวจสอบด้วยรหัส</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>กรอกรหัสตรวจสอบที่อยู่ในใบรับรอง</p>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleVerifyToken() }}>
            <div className="form-group">
              <input type="text" className="form-input" placeholder="วางรหัสตรวจสอบที่นี่..." value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 11 }} disabled={loading || !tokenInput}>
              {loading ? <><span className="spinner" /> กำลังตรวจสอบ...</> : <><ShieldCheck size={15} /> ตรวจสอบใบรับรอง</>}
            </button>
          </form>

          {error && <div className="alert alert-error" style={{ marginTop: 16, marginBottom: 0 }}><AlertTriangle size={15} /> {error}</div>}

          {result && (
            <div className={`verify-result animate-spring-up ${result.valid ? 'valid' : 'invalid'}`} style={{ marginTop: 16 }}>
              <div className="verify-result-header">
                {result.valid ? <CheckCircle size={18} color="var(--success)" /> : <ShieldX size={18} color="var(--danger)" />}
                <span style={{ color: result.valid ? 'var(--success)' : 'var(--danger)' }}>
                  {result.valid ? 'ใบรับรองถูกต้อง ✓' : 'ตรวจสอบไม่ผ่าน'}
                </span>
              </div>
              {result.valid && (
                <table className="verify-detail-table">
                  <tbody>
                    <tr><td>ผู้รับ</td><td>{result.recipient_name}</td></tr>
                    <tr><td>หลักสูตร</td><td>{result.course}</td></tr>
                    <tr><td>เลขที่ใบรับรอง</td><td>{result.certificate_no}</td></tr>
                    <tr><td>วันที่ออก</td><td>{result.issue_date}</td></tr>
                    <tr><td>สถานะ</td><td><span className="badge badge-success">ใช้งานได้</span></td></tr>
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* ตรวจสอบไฟล์ PDF */}
        <div className="card animate-in stagger-2" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div className="icon-box"><FileUp size={18} /></div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600 }}>ตรวจสอบไฟล์ PDF</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>อัปโหลดไฟล์ใบรับรองเพื่อตรวจสอบความสมบูรณ์</p>
            </div>
          </div>

          <div
            className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleZoneClick}
          >
            <Upload size={24} className="upload-icon" style={{ marginBottom: 8, color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 4 }}>
              ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf"
              onChange={handlePdfUpload}
              style={{ display: 'none' }}
            />
          </div>

          {pdfError && <div className="alert alert-error" style={{ marginBottom: 0 }}><AlertTriangle size={15} /> {pdfError}</div>}

          {pdfResult && pdfResult.verified && (
            <div className="verify-result animate-spring-up valid">
              <div className="verify-result-header">
                <CheckCircle size={18} color="var(--success)" />
                <span style={{ color: 'var(--success)' }}>ไฟล์สมบูรณ์ — ไม่ถูกแก้ไข</span>
              </div>
              <table className="verify-detail-table">
                <tbody>
                  <tr><td>ผู้รับ</td><td>{pdfResult.recipient_name}</td></tr>
                  <tr><td>หลักสูตร</td><td>{pdfResult.course}</td></tr>
                  <tr><td>เลขที่</td><td>{pdfResult.certificate_no}</td></tr>
                </tbody>
              </table>
            </div>
          )}
          {pdfResult && !pdfResult.verified && (
            <div className="verify-result animate-spring-up invalid">
              <div className="verify-result-header">
                <ShieldX size={18} color="var(--danger)" />
                <span style={{ color: 'var(--danger)' }}>แฮชไม่ตรงกัน — เอกสารอาจถูกแก้ไข</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* แถบความน่าเชื่อถือ */}
      <div style={{ textAlign: 'center', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, color: 'var(--text-muted)', fontSize: 13 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><ShieldCheck size={14} color="var(--accent)" /> ตรวจสอบด้วย SHA-256</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Lock size={14} color="var(--accent)" /> PDF ป้องกันการแก้ไข</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Globe size={14} color="var(--accent)" /> ตรวจสอบได้สาธารณะ</span>
        </div>
      </div>
    </div>
  )
}


/* ==========================================================================
   หน้าเข้าสู่ระบบ
   ========================================================================== */
function LoginPage({ onLogin, initialError }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(initialError || '')
  const [loading, setLoading] = useState(false)
  const [oauthConfig, setOauthConfig] = useState(null)

  useEffect(() => { if (initialError) setError(initialError) }, [initialError])

  useEffect(() => {
    fetch(`${API_URL}/api/auth/google/config`)
      .then(res => { if (res.ok) return res.json() })
      .then(data => { if (data) setOauthConfig(data) })
      .catch(() => {})
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true); setError('')
    fetch(`${API_URL}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
      .then(async res => { if (res.ok) return res.json(); const err = await res.json(); throw new Error(err.detail || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง') })
      .then(data => onLogin(data.access_token, data.role, data.email))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  return (
    <div className="login-container">
      <div className="login-bg">
        <div className="login-bg-gradient login-bg-gradient-1"></div>
        <div className="login-bg-gradient login-bg-gradient-2"></div>
        <div className="login-bg-grid"></div>
      </div>
      <div className="login-card">
        <div className="card-accent" style={{ padding: 36 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              margin: '0 auto 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <img src={logoImg} alt="KMITL Logo" style={{ height: 48, width: 'auto', objectFit: 'contain' }} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>เข้าสู่ระบบ</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>ลงชื่อเข้าใช้เพื่อเข้าถึงระบบ</p>
          </div>

          {oauthConfig && oauthConfig.google_oauth_enabled && (
            <div style={{ marginBottom: 20 }}>
              <a 
                href={`${API_URL}/api/auth/google/login`}
                className="btn btn-secondary" 
                style={{ 
                  width: '100%', 
                  padding: '11px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  borderColor: '#dadce0',
                  boxShadow: 'var(--shadow-sm)',
                  background: '#ffffff',
                  color: '#3c4043'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                เข้าสู่ระบบด้วย Google
              </a>
              <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0 16px', color: 'var(--text-muted)' }}>
                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
                <span style={{ padding: '0 10px', fontSize: 12 }}>หรือเข้าสู่ระบบด้วยบัญชีทั่วไป</span>
                <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border)' }} />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">อีเมล</label>
              <input type="email" className="form-input" required placeholder="กรอกอีเมลของคุณ" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">รหัสผ่าน</label>
              <input type="password" className="form-input" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><AlertTriangle size={15} /> {error}</div>}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 11, fontSize: 15 }} disabled={loading}>
              {loading ? <><span className="spinner" /> กำลังเข้าสู่ระบบ...</> : <><LogIn size={16} /> เข้าสู่ระบบ</>}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
            ระบบใบรับรองอิเล็กทรอนิกส์
          </p>
        </div>
      </div>
    </div>
  )
}


const removeWhiteBackground = (file, threshold = 220) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          if (r > threshold && g > threshold && b > threshold) {
            data[i+3] = 0; // Alpha channel to transparent
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const transparentFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + "_transparent.png", { type: "image/png" });
            resolve(transparentFile);
          } else {
            reject(new Error("Canvas blob conversion failed"));
          }
        }, "image/png");
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
};

/* ==========================================================================
   แดชบอร์ดเจ้าหน้าที่
   ========================================================================== */
function StaffDashboard({ token }) {
  const [view, setView] = useState('programs')
  const [programs, setPrograms] = useState([])
  const [templates, setTemplates] = useState([])
  const [issuers, setIssuers] = useState([])
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [newProgName, setNewProgName] = useState('')
  const [newProgDesc, setNewProgDesc] = useState('')
  const [newProgCat, setNewProgCat] = useState('')
  const [newProgLvl, setNewProgLvl] = useState('beginner')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [selectedIssuer, setSelectedIssuer] = useState('')
  const [showAddProg, setShowAddProg] = useState(false)

  const [selectedProgForImport, setSelectedProgForImport] = useState(null)
  const [whitelist, setWhitelist] = useState([])
  const [wlSearch, setWlSearch] = useState('')
  const [wlPage, setWlPage] = useState(1)
  const [wlRowsPerPage, setWlRowsPerPage] = useState(10)
  const [selectedWlUserIds, setSelectedWlUserIds] = useState([])
  const [importCourseName, setImportCourseName] = useState('')
  const [importIssueDate, setImportIssueDate] = useState(new Date().toISOString().split('T')[0])
  const [importExpireDate, setImportExpireDate] = useState('')
  const [csvFile, setCsvFile] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [previewData, setPreviewData] = useState(null)

  const [showAddTemplate, setShowAddTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateHtml, setTemplateHtml] = useState('')
  const [templateCss, setTemplateCss] = useState('')
  const [editingTemplate, setEditingTemplate] = useState(null)

  // Visual Designer States
  const [designMode, setDesignMode] = useState('visual') // 'visual' | 'code'
  const [canvasBorderColor, setCanvasBorderColor] = useState('#0d9488')
  const [canvasBorderSize, setCanvasBorderSize] = useState('12px')
  const [canvasBorderType, setCanvasBorderType] = useState('double')
  const [canvasBgColor, setCanvasBgColor] = useState('#ffffff')
  const [canvasBgType, setCanvasBgType] = useState('solid')
  
  const [positions, setPositions] = useState({
    logo: { top: 40, left: 365, size: 70, visible: true },
    header: { top: 130, left: 100, fontSize: 18, color: '#78716c', text: 'เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า', visible: true, width: 600, centered: true },
    recipient: { top: 180, left: 100, fontSize: 32, color: '#0d9488', visible: true, width: 600, centered: true },
    body: { top: 240, left: 100, fontSize: 14, color: '#78716c', text: 'ได้ผ่านการสอบวัดผลและสำเร็จการศึกษาตามข้อกำหนดหลักสูตร', visible: true, width: 600, centered: true },
    course: { top: 280, left: 100, fontSize: 24, color: '#1c1917', visible: true, width: 600, centered: true },
    info: { top: 380, left: 60, visible: true },
    signature: { top: 360, left: 580, visible: true }
  })

  const [activeElement, setActiveElement] = useState(null)

  const handleDragStart = (e, key) => {
    e.preventDefault()
    setActiveElement(key)
    const startY = e.clientY
    const startX = e.clientX
    const startTop = positions[key].top
    const startLeft = positions[key].left
    
    const handleDragMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY
      const deltaX = moveEvent.clientX - startX
      
      setPositions(prev => {
        const newTop = Math.max(0, Math.min(500, startTop + deltaY))
        let newLeft = Math.max(0, Math.min(740, startLeft + deltaX))
        
        // If text, check if we break centering
        const isText = ['header', 'recipient', 'body', 'course'].includes(key)
        const updated = {
          ...prev[key],
          top: newTop,
          left: newLeft
        }
        if (isText && Math.abs(deltaX) > 5) {
          updated.centered = false
        }
        return {
          ...prev,
          [key]: updated
        }
      })
    }
    
    const handleDragEnd = () => {
      document.removeEventListener('mousemove', handleDragMove)
      document.removeEventListener('mouseup', handleDragEnd)
    }
    
    document.addEventListener('mousemove', handleDragMove)
    document.addEventListener('mouseup', handleDragEnd)
  }

  const compileTemplate = () => {
    const borderStyle = canvasBorderType === 'none' ? 'none' : `${canvasBorderSize} ${canvasBorderType} ${canvasBorderColor}`
    let backgroundStyle = canvasBgColor
    if (canvasBgType === 'gradient') {
      backgroundStyle = `linear-gradient(135deg, ${canvasBgColor} 0%, #f5f5f4 100%)`
    } else if (canvasBgType === 'ivory') {
      backgroundStyle = `#fafaf5`
    }

    const html = `<div class="cert-canvas" style="position: relative; width: 800px; height: 565px; background: ${backgroundStyle}; border: ${borderStyle}; box-sizing: border-box; padding: 20px; font-family: 'Anuphan', sans-serif; overflow: hidden; color: #1c1917;">
  ${positions.logo.visible ? `
  <div style="position: absolute; top: ${positions.logo.top}px; left: ${positions.logo.left}px; display: flex; justify-content: center; align-items: center;">
    <img src="{{logo}}" style="max-height: ${positions.logo.size}px; max-width: ${positions.logo.size * 1.5}px; object-fit: contain;" />
  </div>` : ''}
  ${positions.header.visible ? `
  <div style="position: absolute; top: ${positions.header.top}px; left: ${positions.header.centered ? '100px' : positions.header.left + 'px'}; width: ${positions.header.width}px; text-align: ${positions.header.centered ? 'center' : 'left'}; font-size: ${positions.header.fontSize}px; color: ${positions.header.color}; font-weight: 500; line-height: 1.4;">
    ${positions.header.text}
  </div>` : ''}
  ${positions.recipient.visible ? `
  <div style="position: absolute; top: ${positions.recipient.top}px; left: ${positions.recipient.centered ? '100px' : positions.recipient.left + 'px'}; width: ${positions.recipient.width}px; text-align: ${positions.recipient.centered ? 'center' : 'left'}; font-size: ${positions.recipient.fontSize}px; color: ${positions.recipient.color}; font-weight: 700; line-height: 1.4;">
    {{recipient_name}}
  </div>` : ''}
  ${positions.body.visible ? `
  <div style="position: absolute; top: ${positions.body.top}px; left: ${positions.body.centered ? '100px' : positions.body.left + 'px'}; width: ${positions.body.width}px; text-align: ${positions.body.centered ? 'center' : 'left'}; font-size: ${positions.body.fontSize}px; color: ${positions.body.color}; line-height: 1.5;">
    ${positions.body.text}
  </div>` : ''}
  ${positions.course.visible ? `
  <div style="position: absolute; top: ${positions.course.top}px; left: ${positions.course.centered ? '100px' : positions.course.left + 'px'}; width: ${positions.course.width}px; text-align: ${positions.course.centered ? 'center' : 'left'}; font-size: ${positions.course.fontSize}px; color: ${positions.course.color}; font-weight: 600; line-height: 1.4;">
    {{course}}
  </div>` : ''}
  ${positions.info.visible ? `
  <div style="position: absolute; top: ${positions.info.top}px; left: ${positions.info.left}px; display: flex; align-items: center; gap: 12px;">
    <img src="{{qr_code}}" style="width: 70px; height: 70px;" />
    <div style="font-size: 11px; color: #78716c; line-height: 1.4; font-family: 'Anuphan', sans-serif;">
      <div>เลขที่: {{certificate_no}}</div>
      <div>ออกเมื่อ: {{issue_date}}</div>
      <div>หมดอายุ: {{expire_date}}</div>
    </div>
  </div>` : ''}
  ${positions.signature.visible ? `
  <div style="position: absolute; top: ${positions.signature.top}px; left: ${positions.signature.left}px; text-align: center; display: flex; flex-direction: column; align-items: center; min-width: 160px;">
    <div style="height: 50px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
      <img src="{{signature}}" style="max-height: 50px; max-width: 140px; mix-blend-mode: multiply;" />
    </div>
    <div style="border-top: 1px solid #d6d3d1; padding-top: 4px; width: 100%; font-size: 13px; font-weight: 600; color: #1c1917; line-height: 1.3;">
      {{issuer_name}}
    </div>
    <div style="font-size: 10px; color: #78716c; margin-top: 1px; line-height: 1.2;">
      {{organization}}
    </div>
  </div>` : ''}
</div>`
    return { html, css: '' }
  }

  const [showAddIssuer, setShowAddIssuer] = useState(false)
  const [issuerName, setIssuerName] = useState('')
  const [issuerOrg, setIssuerOrg] = useState('')
  const [issuerLogo, setIssuerLogo] = useState('')
  const [issuerSig, setIssuerSig] = useState('')
  const [editingIssuer, setEditingIssuer] = useState(null)

  const [logoLoading, setLogoLoading] = useState(false)
  const [sigLoading, setSigLoading] = useState(false)
  const [removeBgChecked, setRemoveBgChecked] = useState(true)

  const handleUploadLogo = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLogoLoading(true); setErrorMsg(''); setSuccessMsg('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'อัปโหลดโลโก้ไม่สำเร็จ')
      }
      const data = await res.json()
      setIssuerLogo(data.url)
      setSuccessMsg('อัปโหลดโลโก้เสร็จสมบูรณ์')
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setLogoLoading(false)
    }
  }

  const handleUploadSignature = async (e) => {
    let file = e.target.files[0]
    if (!file) return
    setSigLoading(true); setErrorMsg(''); setSuccessMsg('')
    try {
      if (removeBgChecked) {
        try {
          file = await removeWhiteBackground(file)
        } catch (canvasErr) {
          console.error("Signature background removal failed, falling back:", canvasErr)
        }
      }
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'อัปโหลดลายเซ็นไม่สำเร็จ')
      }
      const data = await res.json()
      setIssuerSig(data.url)
      setSuccessMsg('อัปโหลดลายเซ็นเสร็จสมบูรณ์')
    } catch (err) {
      setErrorMsg(err.message)
    } finally {
      setSigLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [view])

  useEffect(() => {
    setWlPage(1)
  }, [wlSearch, wlRowsPerPage])

  const headers = { 'Authorization': `Bearer ${token}` }

  const fetchData = () => {
    setLoading(true); setErrorMsg('')
    Promise.all([
      fetch(`${API_URL}/api/certificate-groups`, { headers }).then(r => r.json()),
      fetch(`${API_URL}/api/templates`, { headers }).then(r => r.json()),
      fetch(`${API_URL}/api/issuers`, { headers }).then(r => r.json()),
      fetch(`${API_URL}/api/admin/whitelist`, { headers }).then(r => r.json())
    ])
    .then(([p, t, i, w]) => {
      setPrograms(Array.isArray(p) ? p : [])
      setTemplates(Array.isArray(t) ? t : [])
      setIssuers(Array.isArray(i) ? i : [])
      setWhitelist(Array.isArray(w) ? w : [])
      if (t.length > 0) setSelectedTemplate(t[0].id)
      if (i.length > 0) setSelectedIssuer(i[0].id)
    })
    .catch(err => setErrorMsg(err.message))
    .finally(() => setLoading(false))
  }

  const handleCreateProgram = (e) => {
    e.preventDefault()
    if (!newProgName || !selectedTemplate || !selectedIssuer) return
    fetch(`${API_URL}/api/certificate-groups`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newProgName, description: newProgDesc, category: newProgCat, level: newProgLvl, template_id: selectedTemplate, issuer_id: selectedIssuer, visible_to_verifier: true })
    })
    .then(async r => { if (r.ok) return r.json(); const e = await r.json(); throw new Error(e.detail || 'ไม่สำเร็จ') })
    .then(() => { setSuccessMsg('สร้างโปรแกรมใบรับรองเรียบร้อยแล้ว'); setNewProgName(''); setNewProgDesc(''); setNewProgCat(''); setShowAddProg(false); fetchData() })
    .catch(err => setErrorMsg(err.message))
  }

  const handleCreateTemplate = (e) => {
    e.preventDefault()
    if (!templateName) return
    
    let htmlToSubmit = templateHtml
    let cssToSubmit = templateCss
    
    if (designMode === 'visual') {
      const compiled = compileTemplate()
      htmlToSubmit = compiled.html
      cssToSubmit = compiled.css
    }
    
    if (!htmlToSubmit) {
      setErrorMsg('กรุณาระบุโครงสร้าง HTML หรือสร้างด้วยเครื่องมือลากวาง')
      return
    }

    const url = editingTemplate 
      ? `${API_URL}/api/templates/${editingTemplate.id}`
      : `${API_URL}/api/templates`
    const method = editingTemplate ? 'PUT' : 'POST'

    fetch(url, {
      method,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: templateName, html: htmlToSubmit, css: cssToSubmit || '' })
    })
    .then(async r => { if (r.ok) return r.json(); const e = await r.json(); throw new Error(e.detail || 'ไม่สำเร็จ') })
    .then(() => { 
      setSuccessMsg(editingTemplate ? 'แก้ไขเทมเพลตเรียบร้อยแล้ว' : 'บันทึกเทมเพลตเรียบร้อยแล้ว'); 
      setTemplateName(''); 
      setTemplateHtml(''); 
      setTemplateCss(''); 
      setEditingTemplate(null);
      setShowAddTemplate(false); 
      fetchData() 
    })
    .catch(err => setErrorMsg(err.message))
  }

  const handleCreateIssuer = (e) => {
    e.preventDefault()
    if (!issuerName || !issuerOrg) return
    
    const url = editingIssuer
      ? `${API_URL}/api/issuers/${editingIssuer.id}`
      : `${API_URL}/api/issuers`
    const method = editingIssuer ? 'PUT' : 'POST'

    fetch(url, {
      method,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: issuerName, organization: issuerOrg, logo_url: issuerLogo, signature_image_url: issuerSig })
    })
    .then(async r => { if (r.ok) return r.json(); const e = await r.json(); throw new Error(e.detail || 'ไม่สำเร็จ') })
    .then(() => { 
      setSuccessMsg(editingIssuer ? 'แก้ไขข้อมูลผู้ออกใบรับรองเรียบร้อยแล้ว' : 'ลงทะเบียนผู้ออกใบรับรองเรียบร้อยแล้ว'); 
      setIssuerName(''); 
      setIssuerOrg(''); 
      setIssuerLogo(''); 
      setIssuerSig(''); 
      setEditingIssuer(null);
      setShowAddIssuer(false); 
      fetchData() 
    })
    .catch(err => setErrorMsg(err.message))
  }

  const handleImportCsv = (e) => {
    e.preventDefault()
    if (!csvFile || !selectedProgForImport) return
    setLoading(true)
    const formData = new FormData()
    formData.append('file', csvFile)
    fetch(`${API_URL}/api/certificate-groups/${selectedProgForImport.id}/import`, {
      method: 'POST', headers, body: formData
    })
    .then(async r => { if (r.ok) return r.json(); const e = await r.json(); throw new Error(e.detail || 'นำเข้าไม่สำเร็จ') })
    .then(data => { setImportResult(data); setSuccessMsg(`นำเข้าสำเร็จ ${data.valid_rows} รายการ`); fetchData() })
    .catch(err => setErrorMsg(err.message))
    .finally(() => setLoading(false))
  }

  const handleImportFromWhitelist = (e) => {
    e.preventDefault()
    if (!selectedProgForImport || selectedWlUserIds.length === 0) return
    setLoading(true); setErrorMsg(''); setSuccessMsg('')
    fetch(`${API_URL}/api/certificate-groups/${selectedProgForImport.id}/whitelist-import`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        whitelist_ids: selectedWlUserIds,
        course: importCourseName || selectedProgForImport.name,
        issue_date: importIssueDate,
        expire_date: importExpireDate || null
      })
    })
    .then(async r => { if (r.ok) return r.json(); const e = await r.json(); throw new Error(e.detail || 'นำเข้าข้อมูลไม่สำเร็จ') })
    .then(data => {
      setImportResult(data)
      setSuccessMsg(`นำเข้าข้อมูลจาก Whitelist สำเร็จจำนวน ${data.valid_rows} รายการ`)
      setSelectedWlUserIds([])
      fetchData()
    })
    .catch(err => setErrorMsg(err.message))
    .finally(() => setLoading(false))
  }

  const handlePreview = (progId) => {
    fetch(`${API_URL}/api/certificate-groups/${progId}/preview`, { headers })
    .then(async r => { if (r.ok) return r.json(); const e = await r.json(); throw new Error(e.detail || 'ดูตัวอย่างไม่สำเร็จ') })
    .then(data => setPreviewData(data))
    .catch(err => setErrorMsg(err.message))
  }

  const handleGenerate = (progId) => {
    if (!window.confirm('ต้องการสร้างใบรับรองทั้งหมดในโปรแกรมนี้หรือไม่?')) return
    setLoading(true)
    fetch(`${API_URL}/api/certificate-groups/${progId}/generate`, { method: 'POST', headers })
    .then(async r => { if (r.ok) return r.json(); const e = await r.json(); throw new Error(e.detail || 'สร้างไม่สำเร็จ') })
    .then(data => { setSuccessMsg(`เข้าคิวสร้างใบรับรอง ${data.queued} รายการ`); fetchData() })
    .catch(err => setErrorMsg(err.message))
    .finally(() => setLoading(false))
  }

  const handleToggleVisibility = (progId, currentVisible) => {
    fetch(`${API_URL}/api/certificate-groups/${progId}/visibility`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible_to_verifier: !currentVisible })
    })
    .then(async r => { if (r.ok) return r.json(); const e = await r.json(); throw new Error(e.detail || 'ไม่สำเร็จ') })
    .then(() => { setSuccessMsg(!currentVisible ? 'เปิดให้ผู้รับเห็นแล้ว' : 'ซ่อนจากผู้รับแล้ว'); fetchData() })
    .catch(err => setErrorMsg(err.message))
  }

  const handleDeleteProgram = (progId) => {
    if (!window.confirm('ต้องการลบโปรแกรมนี้และใบรับรองทั้งหมดในโปรแกรมนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) return
    setLoading(true)
    fetch(`${API_URL}/api/certificate-groups/${progId}`, {
      method: 'DELETE',
      headers
    })
    .then(async r => { if (r.ok) return r.json(); const e = await r.json(); throw new Error(e.detail || 'ลบไม่สำเร็จ') })
    .then(() => { setSuccessMsg('ลบโปรแกรมใบรับรองเรียบร้อยแล้ว'); fetchData() })
    .catch(err => setErrorMsg(err.message))
    .finally(() => setLoading(false))
  }

  const [expandedCertList, setExpandedCertList] = useState(null)
  const [certificatesInGroup, setCertificatesInGroup] = useState([])

  const toggleCertificatesList = (progId) => {
    if (expandedCertList === progId) {
      setExpandedCertList(null)
      setCertificatesInGroup([])
    } else {
      setLoading(true)
      fetch(`${API_URL}/api/certificates?group_id=${progId}`, { headers })
      .then(async r => { if (r.ok) return r.json(); throw new Error('โหลดรายชื่อใบรับรองไม่สำเร็จ') })
      .then(data => { setExpandedCertList(progId); setCertificatesInGroup(data) })
      .catch(err => setErrorMsg(err.message))
      .finally(() => setLoading(false))
    }
  }

  const handleDeleteCertificate = (certId, progId) => {
    if (!window.confirm('ต้องการลบใบรับรองนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) return
    setLoading(true)
    fetch(`${API_URL}/api/certificates/${certId}`, {
      method: 'DELETE',
      headers
    })
    .then(async r => { if (r.ok) return r.json(); const e = await r.json(); throw new Error(e.detail || 'ลบไม่สำเร็จ') })
    .then(() => {
      setSuccessMsg('ลบใบรับรองเรียบร้อยแล้ว')
      return fetch(`${API_URL}/api/certificates?group_id=${progId}`, { headers }).then(r => r.json())
    })
    .then(data => {
      setCertificatesInGroup(data)
      fetchData()
    })
    .catch(err => setErrorMsg(err.message))
    .finally(() => setLoading(false))
  }

  const downloadCsvTemplate = () => {
    const csvContent = "recipient_name,recipient_email,course,issue_date,expire_date\n" +
                       "สมชาย ใจดี,somchai@example.com,หลักสูตรความปลอดภัยทางไซเบอร์,2026-06-27,2028-06-27\n" +
                       "อนงค์ ดีเลิศ,anong@example.com,การวิเคราะห์ข้อมูลขั้นสูง,2026-06-27,\n";
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "recipient_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleEditTemplateClick = (t) => {
    setEditingTemplate(t)
    setTemplateName(t.name)
    setTemplateHtml(t.html)
    setTemplateCss(t.css || '')
    setDesignMode('code')
    setShowAddTemplate(true)
  }

  const handleDeleteTemplate = (templateId) => {
    if (!window.confirm('ต้องการลบเทมเพลตนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) return
    setLoading(true)
    fetch(`${API_URL}/api/templates/${templateId}`, {
      method: 'DELETE',
      headers
    })
    .then(async r => { if (r.ok) return r.json(); const e = await r.json(); throw new Error(e.detail || 'ลบไม่สำเร็จ') })
    .then(() => { setSuccessMsg('ลบเทมเพลตเรียบร้อยแล้ว'); fetchData() })
    .catch(err => setErrorMsg(err.message))
    .finally(() => setLoading(false))
  }

  const handleEditIssuerClick = (i) => {
    setEditingIssuer(i)
    setIssuerName(i.name)
    setIssuerOrg(i.organization)
    setIssuerLogo(i.logo_url || '')
    setIssuerSig(i.signature_image_url || '')
    setShowAddIssuer(true)
  }

  const handleDeleteIssuer = (issuerId) => {
    if (!window.confirm('ต้องการลบผู้ออกใบรับรองนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) return
    setLoading(true)
    fetch(`${API_URL}/api/issuers/${issuerId}`, {
      method: 'DELETE',
      headers
    })
    .then(async r => { if (r.ok) return r.json(); const e = await r.json(); throw new Error(e.detail || 'ลบไม่สำเร็จ') })
    .then(() => { setSuccessMsg('ลบผู้ออกใบรับรองเรียบร้อยแล้ว'); fetchData() })
    .catch(err => setErrorMsg(err.message))
    .finally(() => setLoading(false))
  }

  const filteredWl = whitelist.filter(item => {
    const searchLower = wlSearch.toLowerCase()
    const matchEmail = item.email ? item.email.toLowerCase().includes(searchLower) : false
    const matchName = item.name ? item.name.toLowerCase().includes(searchLower) : false
    return matchEmail || matchName
  })

  const totalWlPages = Math.ceil(filteredWl.length / wlRowsPerPage) || 1
  const indexOfLastWlRow = wlPage * wlRowsPerPage
  const indexOfFirstWlRow = indexOfLastWlRow - wlRowsPerPage
  const currentWlRows = filteredWl.slice(indexOfFirstWlRow, indexOfLastWlRow)

  const totalCerts = programs.reduce((sum, p) => sum + (p.certificate_count || 0), 0)

  return (
    <div className="dashboard-layout">
      {/* แถบด้านข้าง */}
      <div className="sidebar">
        <div style={{ padding: '0 14px 16px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="icon-box" style={{ width: 32, height: 32, borderRadius: 8 }}>
              <Briefcase size={16} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>เจ้าหน้าที่</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>จัดการใบรับรอง</div>
            </div>
          </div>
        </div>

        <div className="sidebar-section-label">เมนูหลัก</div>
        <div className={`sidebar-link ${view === 'programs' ? 'active' : ''}`} onClick={() => setView('programs')}>
          <Layers size={17} /> โปรแกรมใบรับรอง
        </div>
        <div className={`sidebar-link ${view === 'templates' ? 'active' : ''}`} onClick={() => setView('templates')}>
          <FileText size={17} /> เทมเพลต
        </div>
        <div className={`sidebar-link ${view === 'issuers' ? 'active' : ''}`} onClick={() => setView('issuers')}>
          <Building2 size={17} /> ผู้ออกใบรับรอง
        </div>

        <div style={{ marginTop: 'auto', padding: '16px 14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>สถิติ</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>โปรแกรม</span>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{programs.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>เทมเพลต</span>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{templates.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>ใบรับรอง</span>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{totalCerts}</span>
            </div>
          </div>
        </div>
      </div>

      {/* เนื้อหาหลัก */}
      <div className="main-content">
        <div className="page-header">
          <div>
            <h1>{view === 'programs' ? 'โปรแกรมใบรับรอง' : view === 'templates' ? 'เทมเพลตใบรับรอง' : 'ผู้ออกใบรับรอง'}</h1>
            <p>{view === 'programs' ? 'จัดการกลุ่มใบรับรอง นำเข้ารายชื่อ และสร้าง PDF' : view === 'templates' ? 'กำหนดเทมเพลต HTML/CSS สำหรับสร้างใบรับรอง' : 'จัดการหน่วยงานที่มีอำนาจลงนามในใบรับรอง'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={fetchData}><RefreshCw size={14} /> รีเฟรช</button>
            {view === 'programs' && !showAddProg && <button className="btn btn-primary" onClick={() => setShowAddProg(true)}><Plus size={15} /> สร้างโปรแกรม</button>}
            {view === 'templates' && !showAddTemplate && <button className="btn btn-primary" onClick={() => setShowAddTemplate(true)}><Plus size={15} /> สร้างเทมเพลต</button>}
            {view === 'issuers' && !showAddIssuer && <button className="btn btn-primary" onClick={() => setShowAddIssuer(true)}><Plus size={15} /> เพิ่มผู้ออก</button>}
          </div>
        </div>

        {successMsg && <div className="alert alert-success"><CheckCircle size={15} /> {successMsg}<button className="alert-close" onClick={() => setSuccessMsg('')}>×</button></div>}
        {errorMsg && <div className="alert alert-error"><AlertTriangle size={15} /> {errorMsg}<button className="alert-close" onClick={() => setErrorMsg('')}>×</button></div>}

        {/* ── โปรแกรม ── */}
        {view === 'programs' && (
          <div>
            {showAddProg && (
              <div className="card-accent animate-in" style={{ padding: 28, marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>สร้างโปรแกรมใบรับรอง</h2>
                <form onSubmit={handleCreateProgram}>
                  <div className="form-group">
                    <label className="form-label">ชื่อโปรแกรม</label>
                    <input type="text" className="form-input" required placeholder="เช่น หลักสูตรวิทยาการข้อมูล" value={newProgName} onChange={(e) => setNewProgName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">รายละเอียด</label>
                    <textarea className="form-input" placeholder="อธิบายรายละเอียดของโปรแกรม..." value={newProgDesc} onChange={(e) => setNewProgDesc(e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">หมวดหมู่</label>
                      <input type="text" className="form-input" placeholder="เช่น เทคโนโลยี, การออกแบบ" value={newProgCat} onChange={(e) => setNewProgCat(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">ระดับความยาก</label>
                      <select className="form-input" value={newProgLvl} onChange={(e) => setNewProgLvl(e.target.value)}>
                        <option value="beginner">เบื้องต้น</option>
                        <option value="intermediate">ปานกลาง</option>
                        <option value="advanced">ขั้นสูง</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">เทมเพลต</label>
                      <select className="form-input" required value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}>
                        {templates.map(t => <option key={t.id} value={t.id}>{t.name} (v{t.version})</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">ผู้ออกใบรับรอง</label>
                      <select className="form-input" required value={selectedIssuer} onChange={(e) => setSelectedIssuer(e.target.value)}>
                        {issuers.map(i => <option key={i.id} value={i.id}>{i.name} ({i.organization})</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddProg(false)}>ยกเลิก</button>
                    <button type="submit" className="btn btn-primary">สร้างโปรแกรม</button>
                  </div>
                </form>
              </div>
            )}

            {selectedProgForImport && (
              <div className="card-accent animate-in" style={{ padding: 28, marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 600 }}>นำรายชื่อผู้รับจาก Whitelist</h2>
                  <button className="btn-icon" onClick={() => { setSelectedProgForImport(null); setSelectedWlUserIds([]); setImportResult(null) }}><X size={18} /></button>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  โปรแกรมใบรับรอง: <strong style={{ color: 'var(--accent)' }}>{selectedProgForImport.name}</strong>
                </p>

                <form onSubmit={handleImportFromWhitelist} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Parameter Customization Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">ชื่อหลักสูตรบนใบรับรอง</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        required 
                        value={importCourseName} 
                        onChange={(e) => setImportCourseName(e.target.value)} 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">วันที่ออกใบรับรอง</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        required 
                        value={importIssueDate} 
                        onChange={(e) => setImportIssueDate(e.target.value)} 
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">วันที่หมดอายุ (ถ้ามี)</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={importExpireDate} 
                        onChange={(e) => setImportExpireDate(e.target.value)} 
                      />
                    </div>
                  </div>

                  {/* Whitelist Selection Table Card */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: 'var(--bg-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>เลือกผู้สมัครที่จะออกใบรับรอง</span>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
                        {/* Search Input */}
                        <div style={{ position: 'relative', width: 250 }}>
                          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ paddingLeft: 28, fontSize: 12, height: 'auto', paddingTop: 6, paddingBottom: 6 }} 
                            placeholder="ค้นหารายชื่อ/อีเมล..." 
                            value={wlSearch} 
                            onChange={(e) => setWlSearch(e.target.value)} 
                          />
                        </div>
                        {/* Page Size Select */}
                        <select 
                          className="form-input" 
                          style={{ width: 85, fontSize: 12, height: 'auto', paddingTop: 5, paddingBottom: 5, paddingLeft: 4, paddingRight: 4 }} 
                          value={wlRowsPerPage} 
                          onChange={(e) => setWlRowsPerPage(Number(e.target.value))}
                        >
                          <option value={5}>5 แถว</option>
                          <option value={10}>10 แถว</option>
                          <option value={20}>20 แถว</option>
                          <option value={50}>50 แถว</option>
                        </select>
                      </div>
                    </div>

                    <table className="custom-table" style={{ fontSize: 12, background: '#ffffff', margin: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 40, textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={currentWlRows.length > 0 && currentWlRows.every(r => selectedWlUserIds.includes(r.id))} 
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const idsToAdd = currentWlRows.map(r => r.id).filter(id => !selectedWlUserIds.includes(id))
                                  setSelectedWlUserIds([...selectedWlUserIds, ...idsToAdd])
                                } else {
                                  const idsToRemove = currentWlRows.map(r => r.id)
                                  setSelectedWlUserIds(selectedWlUserIds.filter(id => !idsToRemove.includes(id)))
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                          </th>
                          <th>อีเมลผู้ใช้งาน</th>
                          <th>ชื่อผู้รับสิทธิ์</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentWlRows.map(user => (
                          <tr key={user.id} style={{ background: selectedWlUserIds.includes(user.id) ? 'rgba(13, 148, 136, 0.05)' : 'none' }}>
                            <td style={{ textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={selectedWlUserIds.includes(user.id)} 
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedWlUserIds([...selectedWlUserIds, user.id])
                                  } else {
                                    setSelectedWlUserIds(selectedWlUserIds.filter(id => id !== user.id))
                                  }
                                }}
                                style={{ cursor: 'pointer' }}
                              />
                            </td>
                            <td><strong style={{ fontFamily: 'monospace' }}>{user.email}</strong></td>
                            <td>{user.name || <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>— (ใช้อีเมลเป็นชื่อ)</span>}</td>
                          </tr>
                        ))}
                        {currentWlRows.length === 0 && (
                          <tr>
                            <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                              ไม่พบข้อมูลผู้สมัครที่ต้องการค้นหา หรือ Whitelist ยังว่างอยู่
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Selector Pagination */}
                    {totalWlPages > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, marginTop: 4 }}>
                        <span style={{ color: 'var(--text-muted)' }}>
                          แสดง {indexOfFirstWlRow + 1} - {Math.min(indexOfLastWlRow, filteredWl.length)} จาก {filteredWl.length} รายการ
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button 
                            type="button" 
                            className="btn btn-secondary" 
                            style={{ padding: '3px 8px', fontSize: 11, height: 'auto' }} 
                            disabled={wlPage === 1} 
                            onClick={() => setWlPage(p => Math.max(1, p - 1))}
                          >
                            ก่อนหน้า
                          </button>
                          <span style={{ alignSelf: 'center', fontWeight: 600, padding: '0 4px' }}>หน้า {wlPage} / {totalWlPages}</span>
                          <button 
                            type="button" 
                            className="btn btn-secondary" 
                            style={{ padding: '3px 8px', fontSize: 11, height: 'auto' }} 
                            disabled={wlPage === totalWlPages} 
                            onClick={() => setWlPage(p => Math.min(totalWlPages, p + 1))}
                          >
                            ถัดไป
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13 }}>
                      เลือกผู้สมัครทั้งหมด: <strong style={{ color: 'var(--accent)', fontSize: 16 }}>{selectedWlUserIds.length}</strong> คน
                    </span>
                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      disabled={loading || selectedWlUserIds.length === 0}
                    >
                      {loading ? <><span className="spinner" /> กำลังบันทึก...</> : <><Users size={15} /> บันทึกและเตรียมออกใบรับรอง</>}
                    </button>
                  </div>
                </form>

                {importResult && (
                  <div style={{ marginTop: 16, padding: 16, borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>ผลการเตรียมข้อมูลออกใบรับรอง</h3>
                    <div style={{ display: 'flex', gap: 20, fontSize: 14 }}>
                      <span>รายชื่อที่ดึงสำเร็จ: <strong style={{ color: 'var(--success)' }}>{importResult.valid_rows}</strong></span>
                      <span>สถานะ: <strong>รอคิวสร้าง (Pending)</strong></span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                      * รายชื่อทั้งหมดได้ถูกเชื่อมโยงไปยัง Verifier Wallet เรียบร้อยแล้ว กรุณากดปุ่ม <strong>"สร้างทั้งหมด"</strong> ในแถบโปรแกรมด้านล่างเพื่อเริ่มการเรนเดอร์ PDF
                    </p>
                  </div>
                )}
              </div>
            )}

            {previewData && (
              <div className="card animate-in" style={{ padding: 28, marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 600 }}>ตัวอย่างใบรับรอง</h2>
                  <button className="btn-icon" onClick={() => setPreviewData(null)}><X size={18} /></button>
                </div>
                <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 20, overflow: 'auto', maxHeight: 500 }}>
                  <div dangerouslySetInnerHTML={{ __html: getSubpathHtmlPreview(previewData.html_preview) || '<p style="color:#999">ไม่มีตัวอย่าง</p>' }} />
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
              {programs.map(prog => (
                <div key={prog.id} className="program-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {prog.category && <span className="badge badge-primary">{prog.category}</span>}
                      <span className="badge badge-neutral">{prog.level === 'beginner' ? 'เบื้องต้น' : prog.level === 'intermediate' ? 'ปานกลาง' : prog.level === 'advanced' ? 'ขั้นสูง' : prog.level || 'ไม่ระบุ'}</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      {prog.visible_to_verifier ? <Eye size={12} color="var(--success)" /> : <EyeOff size={12} />}
                      {prog.visible_to_verifier ? 'สาธารณะ' : 'ส่วนตัว'}
                    </span>
                  </div>
                  <h3 className="program-card-title">{prog.name}</h3>
                  <p className="program-card-meta">{prog.description || 'ไม่มีรายละเอียด'}</p>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    <Award size={13} style={{ verticalAlign: -2 }} /> <strong style={{ color: 'var(--accent)' }}>{prog.certificate_count || 0}</strong> ใบรับรอง
                  </div>
                  <div className="program-card-actions">
                    <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: 13 }} onClick={() => { setSelectedProgForImport(prog); setImportCourseName(prog.name); setSelectedWlUserIds([]); setImportResult(null); }}><Users size={13} /> นำเข้าจาก Whitelist</button>
                    <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: 13 }} onClick={() => handlePreview(prog.id)}><Eye size={13} /> ดูตัวอย่าง</button>
                    <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: 13 }} onClick={() => handleGenerate(prog.id)}>สร้างทั้งหมด</button>
                    <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: 13 }} onClick={() => toggleCertificatesList(prog.id)}>{expandedCertList === prog.id ? 'ซ่อนรายชื่อ' : 'รายชื่อใบรับรอง'}</button>
                    <button className="btn-icon" title={prog.visible_to_verifier ? 'ซ่อนจากผู้รับ' : 'แสดงให้ผู้รับเห็น'} onClick={() => handleToggleVisibility(prog.id, prog.visible_to_verifier)}>
                      {prog.visible_to_verifier ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button className="btn-icon" style={{ color: 'var(--danger)' }} title="ลบโปรแกรมใบรับรอง" onClick={() => handleDeleteProgram(prog.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {expandedCertList === prog.id && (
                    <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>รายชื่อใบรับรองที่ออกแล้ว:</h4>
                      {certificatesInGroup.length === 0 ? (
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>ยังไม่ได้สร้างใบรับรองในหลักสูตรนี้</p>
                      ) : (
                        <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
                          <table className="custom-table" style={{ margin: 0, fontSize: 12 }}>
                            <thead>
                              <tr>
                                <th>เลขที่</th>
                                <th>ชื่อผู้รับ</th>
                                <th>สถานะ</th>
                                <th>จัดการ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {certificatesInGroup.map(c => (
                                <tr key={c.id}>
                                  <td style={{ fontFamily: 'monospace' }}>{c.certificate_no}</td>
                                  <td>{c.recipient_name}</td>
                                  <td>
                                    <span className={`badge ${c.status === 'valid' ? 'badge-success' : 'badge-warning'}`}>
                                      {c.status === 'valid' ? 'สมบูรณ์' : c.status === 'pending' ? 'รอเจน' : c.status}
                                    </span>
                                  </td>
                                  <td>
                                    <button className="btn-icon" style={{ color: 'var(--danger)', padding: 2 }} title="ลบใบรับรอง" onClick={() => handleDeleteCertificate(c.id, prog.id)}>
                                      <Trash2 size={13} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {programs.length === 0 && !loading && (
              <div className="empty-state">
                <div className="empty-state-icon"><Layers size={24} /></div>
                <div className="empty-state-title">ยังไม่มีโปรแกรม</div>
                <div className="empty-state-text">สร้างโปรแกรมใบรับรองแรกเพื่อเริ่มต้นใช้งาน</div>
              </div>
            )}
          </div>
        )}

        {/* ── เทมเพลต ── */}
        {view === 'templates' && (
          <div>
            {showAddTemplate && (
              <div className="card-accent animate-in" style={{ padding: 28, marginBottom: 24, maxWidth: '100%', overflowX: 'auto' }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>{editingTemplate ? 'แก้ไขเทมเพลตใบรับรอง' : 'สร้างเทมเพลตใบรับรอง'}</h2>
                
                <form onSubmit={handleCreateTemplate}>
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label">ชื่อเทมเพลต</label>
                    <input type="text" className="form-input" required placeholder="เช่น ใบรับรองมาตรฐาน คอร์ส Data Science" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                    <button type="button" className={`btn ${designMode === 'visual' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setDesignMode('visual')}>
                      <Sparkles size={14} /> ออกแบบด้วยภาพ (Visual Designer)
                    </button>
                    <button type="button" className={`btn ${designMode === 'code' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setDesignMode('code')}>
                      <FileText size={14} /> เขียนโค้ด HTML/CSS เอง (Code)
                    </button>
                  </div>

                  {designMode === 'code' ? (
                    <div className="animate-in">
                      <div className="form-group">
                        <label className="form-label">HTML เทมเพลต</label>
                        <textarea className="form-input" style={{ minHeight: 180, fontFamily: 'monospace', fontSize: 13 }} placeholder="<div class='cert'>..." value={templateHtml} onChange={(e) => setTemplateHtml(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">CSS (ไม่บังคับ)</label>
                        <textarea className="form-input" style={{ minHeight: 80, fontFamily: 'monospace', fontSize: 13 }} placeholder=".cert { ... }" value={templateCss} onChange={(e) => setTemplateCss(e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    <div className="animate-in" style={{ display: 'flex', gap: 24, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 20 }}>
                      {/* Left: Certificate Canvas Preview */}
                      <div style={{ flex: '1 1 800px', maxWidth: 800 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>💡 ลากวางส่วนประกอบต่างๆ ในกระดาษเพื่อจัดตำแหน่งได้โดยตรง (ขนาดจริง A4 แนวนอน)</span>
                          {activeElement && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>กำลังขยับ: {activeElement === 'logo' ? 'ตราโลโก้' : activeElement === 'header' ? 'คำนำหัวข้อ' : activeElement === 'recipient' ? 'ชื่อผู้รับ' : activeElement === 'body' ? 'คำบรรยาย' : activeElement === 'course' ? 'หลักสูตร' : activeElement === 'info' ? 'ข้อมูลทวนสอบ' : 'ลายเซ็น'}</span>}
                        </div>
                        
                        {/* Interactive Paper Preview Container */}
                        <div 
                          style={{
                            width: 800,
                            height: 565,
                            position: 'relative',
                            background: canvasBgType === 'gradient' ? `linear-gradient(135deg, ${canvasBgColor} 0%, #f5f5f4 100%)` : canvasBgType === 'ivory' ? '#fafaf5' : canvasBgColor,
                            border: canvasBorderType === 'none' ? 'none' : `${canvasBorderSize} ${canvasBorderType} ${canvasBorderColor}`,
                            boxSizing: 'border-box',
                            padding: 20,
                            overflow: 'hidden',
                            boxShadow: 'var(--shadow-lg)',
                            borderRadius: 'var(--radius-md)',
                            fontFamily: 'Anuphan, sans-serif',
                            color: '#1c1917',
                            userSelect: 'none'
                          }}
                        >
                          {/* Element: Logo */}
                          {positions.logo.visible && (
                            <div 
                              onMouseDown={(e) => handleDragStart(e, 'logo')}
                              style={{
                                position: 'absolute',
                                top: positions.logo.top,
                                left: positions.logo.left,
                                cursor: 'move',
                                padding: 4,
                                border: activeElement === 'logo' ? '2px dashed var(--accent)' : '2px dashed transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'border-color 0.15s ease'
                              }}
                              title="ตราสัญลักษณ์ (ลากเพื่อย้าย)"
                            >
                              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: positions.logo.size, width: positions.logo.size * 1.5, background: 'rgba(245,245,244,0.8)', border: '1px dashed #d6d3d1', borderRadius: 4 }}>
                                <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>ตราโลโก้ ({positions.logo.size}px)</span>
                              </div>
                            </div>
                          )}

                          {/* Element: Header Title */}
                          {positions.header.visible && (
                            <div 
                              onMouseDown={(e) => handleDragStart(e, 'header')}
                              style={{
                                position: 'absolute',
                                top: positions.header.top,
                                left: positions.header.centered ? 100 : positions.header.left,
                                width: positions.header.width,
                                cursor: 'move',
                                padding: '4px 8px',
                                border: activeElement === 'header' ? '2px dashed var(--accent)' : '2px dashed transparent',
                                textAlign: positions.header.centered ? 'center' : 'left',
                                fontSize: positions.header.fontSize,
                                color: positions.header.color,
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                              title="คำนำหัวข้อ (ลากเพื่อย้าย)"
                            >
                              {positions.header.text || 'คำนำหัวข้อ'}
                            </div>
                          )}

                          {/* Element: Recipient Name */}
                          {positions.recipient.visible && (
                            <div 
                              onMouseDown={(e) => handleDragStart(e, 'recipient')}
                              style={{
                                position: 'absolute',
                                top: positions.recipient.top,
                                left: positions.recipient.centered ? 100 : positions.recipient.left,
                                width: positions.recipient.width,
                                cursor: 'move',
                                padding: '4px 8px',
                                border: activeElement === 'recipient' ? '2px dashed var(--accent)' : '2px dashed transparent',
                                textAlign: positions.recipient.centered ? 'center' : 'left',
                                fontSize: positions.recipient.fontSize,
                                color: positions.recipient.color,
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                              title="ชื่อผู้รับ (ลากเพื่อย้าย)"
                            >
                              นายสมชาย ใจดี (ตัวอย่างชื่อผู้รับ)
                            </div>
                          )}

                          {/* Element: Body Text */}
                          {positions.body.visible && (
                            <div 
                              onMouseDown={(e) => handleDragStart(e, 'body')}
                              style={{
                                position: 'absolute',
                                top: positions.body.top,
                                left: positions.body.centered ? 100 : positions.body.left,
                                width: positions.body.width,
                                cursor: 'move',
                                padding: '4px 8px',
                                border: activeElement === 'body' ? '2px dashed var(--accent)' : '2px dashed transparent',
                                textAlign: positions.body.centered ? 'center' : 'left',
                                fontSize: positions.body.fontSize,
                                color: positions.body.color,
                                lineHeight: 1.5
                              }}
                              title="ข้อความความสำเร็จ (ลากเพื่อย้าย)"
                            >
                              {positions.body.text || 'ข้อความรับรองความสำเร็จ'}
                            </div>
                          )}

                          {/* Element: Course Name */}
                          {positions.course.visible && (
                            <div 
                              onMouseDown={(e) => handleDragStart(e, 'course')}
                              style={{
                                position: 'absolute',
                                top: positions.course.top,
                                left: positions.course.centered ? 100 : positions.course.left,
                                width: positions.course.width,
                                cursor: 'move',
                                padding: '4px 8px',
                                border: activeElement === 'course' ? '2px dashed var(--accent)' : '2px dashed transparent',
                                textAlign: positions.course.centered ? 'center' : 'left',
                                fontSize: positions.course.fontSize,
                                color: positions.course.color,
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                              title="ชื่อหลักสูตร (ลากเพื่อย้าย)"
                            >
                              หลักสูตรพัฒนาผู้เขียนโปรแกรมคอมพิวเตอร์ (ตัวอย่างหลักสูตร)
                            </div>
                          )}

                          {/* Element: Info Box */}
                          {positions.info.visible && (
                            <div 
                              onMouseDown={(e) => handleDragStart(e, 'info')}
                              style={{
                                position: 'absolute',
                                top: positions.info.top,
                                left: positions.info.left,
                                cursor: 'move',
                                padding: 6,
                                border: activeElement === 'info' ? '2px dashed var(--accent)' : '2px dashed transparent',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                background: 'rgba(255,255,255,0.75)',
                                borderRadius: 6,
                                backdropFilter: 'blur(2px)'
                              }}
                              title="QR Code & ข้อมูลใบรับรอง (ลากเพื่อย้าย)"
                            >
                              <div style={{ width: 60, height: 60, background: '#e7e5e4', border: '1px solid #d6d3d1', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--text-secondary)' }}>QR Code</div>
                              <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                                <div>เลขที่: CERT-2026-XXXX</div>
                                <div>ออกเมื่อ: 27 มิ.ย. 2026</div>
                                <div>หมดอายุ: 27 มิ.ย. 2028</div>
                              </div>
                            </div>
                          )}

                          {/* Element: Signature Box */}
                          {positions.signature.visible && (
                            <div 
                              onMouseDown={(e) => handleDragStart(e, 'signature')}
                              style={{
                                position: 'absolute',
                                top: positions.signature.top,
                                left: positions.signature.left,
                                cursor: 'move',
                                padding: '6px 12px',
                                border: activeElement === 'signature' ? '2px dashed var(--accent)' : '2px dashed transparent',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                minWidth: 150,
                                background: 'rgba(255,255,255,0.75)',
                                borderRadius: 6,
                                backdropFilter: 'blur(2px)'
                              }}
                              title="ลายเซ็นผู้ออกใบรับรอง (ลากเพื่อย้าย)"
                            >
                              <div style={{ height: 40, width: 100, border: '1px dashed #d6d3d1', borderRadius: 4, background: 'rgba(245,245,244,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--text-secondary)', marginBottom: 2 }}>
                                ลายเซ็น
                              </div>
                              <div style={{ borderTop: '1px solid #d6d3d1', width: '100%', fontSize: 11, fontWeight: 600 }}>ชื่อผู้ออกใบรับรอง</div>
                              <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>หน่วยงาน/องค์กร</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Controls Panel */}
                      <div style={{ flex: '1 1 300px', minWidth: 280, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Section: Paper Setup */}
                        <div style={{ padding: 16, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Layers size={14} /> ตั้งค่ากรอบและพื้นหลัง</h3>
                          
                          <div className="form-group" style={{ marginBottom: 10 }}>
                            <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>สีพื้นหลังกระดาษ</label>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <input type="color" value={canvasBgColor} onChange={(e) => setCanvasBgColor(e.target.value)} style={{ width: 36, height: 28, padding: 0, border: '1px solid var(--border)', cursor: 'pointer' }} />
                              <select className="form-input" style={{ padding: '2px 8px', fontSize: 12, height: 28, flex: 1 }} value={canvasBgType} onChange={(e) => setCanvasBgType(e.target.value)}>
                                <option value="solid">สีพื้นหลังปกติ</option>
                                <option value="gradient">สีไล่ระดับแบบนุ่มนวล</option>
                                <option value="ivory">สีครีมคลาสสิก (Ivory)</option>
                              </select>
                            </div>
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>รูปแบบและสีของขอบใบรับรอง</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 6 }}>
                              <select className="form-input" style={{ padding: '2px 8px', fontSize: 12, height: 28 }} value={canvasBorderType} onChange={(e) => setCanvasBorderType(e.target.value)}>
                                <option value="double">ขอบคู่หรูหรา (Double)</option>
                                <option value="solid">ขอบเดี่ยวปกติ (Solid)</option>
                                <option value="dashed">ขอบลายเส้นประ (Dashed)</option>
                                <option value="none">ไม่มีขอบใบรับรอง (None)</option>
                              </select>
                              <input type="color" value={canvasBorderColor} onChange={(e) => setCanvasBorderColor(e.target.value)} style={{ width: '100%', height: 28, padding: 0, border: '1px solid var(--border)', cursor: 'pointer' }} />
                            </div>
                          </div>
                        </div>

                        {/* Section: Elements Settings */}
                        <div style={{ padding: 16, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', maxHeight: 380, overflowY: 'auto' }}>
                          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Sparkles size={14} /> ปรับแต่งส่วนประกอบ</h3>
                          
                          {/* Logo control */}
                          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 10 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                              <input type="checkbox" checked={positions.logo.visible} onChange={(e) => setPositions(p => ({ ...p, logo: { ...p.logo, visible: e.target.checked } }))} />
                              <span>1. โลโก้ / ตราสถาบัน</span>
                            </label>
                            {positions.logo.visible && (
                              <div style={{ marginTop: 6, paddingLeft: 16 }}>
                                <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>ขนาดความสูง: {positions.logo.size}px</label>
                                <input type="range" min="30" max="120" value={positions.logo.size} onChange={(e) => setPositions(p => ({ ...p, logo: { ...p.logo, size: parseInt(e.target.value) } }))} style={{ width: '100%' }} />
                              </div>
                            )}
                          </div>

                          {/* Header control */}
                          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 10 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                              <input type="checkbox" checked={positions.header.visible} onChange={(e) => setPositions(p => ({ ...p, header: { ...p.header, visible: e.target.checked } }))} />
                              <span>2. คำนำหัวข้อ</span>
                            </label>
                            {positions.header.visible && (
                              <div style={{ marginTop: 6, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <input type="text" className="form-input" style={{ fontSize: 12, padding: '3px 8px' }} value={positions.header.text} onChange={(e) => setPositions(p => ({ ...p, header: { ...p.header, text: e.target.value } }))} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                  <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={positions.header.centered} onChange={(e) => setPositions(p => ({ ...p, header: { ...p.header, centered: e.target.checked } }))} />
                                    จัดกึ่งกลาง
                                  </label>
                                  <input type="color" value={positions.header.color} onChange={(e) => setPositions(p => ({ ...p, header: { ...p.header, color: e.target.value } }))} style={{ width: 28, height: 20, padding: 0, cursor: 'pointer', border: 'none' }} />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Recipient control */}
                          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 10 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                              <input type="checkbox" checked={positions.recipient.visible} onChange={(e) => setPositions(p => ({ ...p, recipient: { ...p.recipient, visible: e.target.checked } }))} />
                              <span>3. ชื่อผู้รับใบรับรอง</span>
                            </label>
                            {positions.recipient.visible && (
                              <div style={{ marginTop: 6, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                  <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={positions.recipient.centered} onChange={(e) => setPositions(p => ({ ...p, recipient: { ...p.recipient, centered: e.target.checked } }))} />
                                    จัดกึ่งกลาง
                                  </label>
                                  <input type="color" value={positions.recipient.color} onChange={(e) => setPositions(p => ({ ...p, recipient: { ...p.recipient, color: e.target.value } }))} style={{ width: 28, height: 20, padding: 0, cursor: 'pointer', border: 'none' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 11, whiteSpace: 'nowrap' }}>ขนาดฟอนต์</span>
                                  <input type="range" min="20" max="48" value={positions.recipient.fontSize} onChange={(e) => setPositions(p => ({ ...p, recipient: { ...p.recipient, fontSize: parseInt(e.target.value) } }))} style={{ flex: 1 }} />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Body text control */}
                          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 10 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                              <input type="checkbox" checked={positions.body.visible} onChange={(e) => setPositions(p => ({ ...p, body: { ...p.body, visible: e.target.checked } }))} />
                              <span>4. คำบรรยายความสำเร็จ</span>
                            </label>
                            {positions.body.visible && (
                              <div style={{ marginTop: 6, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <input type="text" className="form-input" style={{ fontSize: 12, padding: '3px 8px' }} value={positions.body.text} onChange={(e) => setPositions(p => ({ ...p, body: { ...p.body, text: e.target.value } }))} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                  <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={positions.body.centered} onChange={(e) => setPositions(p => ({ ...p, body: { ...p.body, centered: e.target.checked } }))} />
                                    จัดกึ่งกลาง
                                  </label>
                                  <input type="color" value={positions.body.color} onChange={(e) => setPositions(p => ({ ...p, body: { ...p.body, color: e.target.value } }))} style={{ width: 28, height: 20, padding: 0, cursor: 'pointer', border: 'none' }} />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Course name control */}
                          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 10 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                              <input type="checkbox" checked={positions.course.visible} onChange={(e) => setPositions(p => ({ ...p, course: { ...p.course, visible: e.target.checked } }))} />
                              <span>5. ชื่อหลักสูตร / คอร์สเรียน</span>
                            </label>
                            {positions.course.visible && (
                              <div style={{ marginTop: 6, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                  <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={positions.course.centered} onChange={(e) => setPositions(p => ({ ...p, course: { ...p.course, centered: e.target.checked } }))} />
                                    จัดกึ่งกลาง
                                  </label>
                                  <input type="color" value={positions.course.color} onChange={(e) => setPositions(p => ({ ...p, course: { ...p.course, color: e.target.value } }))} style={{ width: 28, height: 20, padding: 0, cursor: 'pointer', border: 'none' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 11, whiteSpace: 'nowrap' }}>ขนาดฟอนต์</span>
                                  <input type="range" min="16" max="36" value={positions.course.fontSize} onChange={(e) => setPositions(p => ({ ...p, course: { ...p.course, fontSize: parseInt(e.target.value) } }))} style={{ flex: 1 }} />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Info box control */}
                          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 10 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                              <input type="checkbox" checked={positions.info.visible} onChange={(e) => setPositions(p => ({ ...p, info: { ...p.info, visible: e.target.checked } }))} />
                              <span>6. ข้อมูลทวนสอบ / QR Code</span>
                            </label>
                          </div>

                          {/* Signature control */}
                          <div style={{ paddingBottom: 5 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                              <input type="checkbox" checked={positions.signature.visible} onChange={(e) => setPositions(p => ({ ...p, signature: { ...p.signature, visible: e.target.checked } }))} />
                              <span>7. ลายเซ็นผู้ออกใบรับรอง</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => { setShowAddTemplate(false); setEditingTemplate(null); setTemplateName(''); setTemplateHtml(''); setTemplateCss('') }}>ยกเลิก</button>
                    <button type="submit" className="btn btn-primary">บันทึกเทมเพลต</button>
                  </div>
                </form>
              </div>
            )}
            <div className="table-container">
              <table className="custom-table">
                <thead><tr><th>ชื่อเทมเพลต</th><th>เวอร์ชัน</th><th>สถานะ</th><th>ตัวอย่าง HTML</th><th style={{ width: 100 }}>จัดการ</th></tr></thead>
                <tbody>
                  {templates.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.name}</td>
                      <td><span className="badge badge-info">v{t.version}</span></td>
                      <td><span className="badge badge-success">{t.status === 'active' ? 'ใช้งาน' : t.status}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.html.substring(0, 80)}...</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => handleEditTemplateClick(t)}>แก้ไข</button>
                          <button className="btn-icon" style={{ color: 'var(--danger)' }} title="ลบเทมเพลต" onClick={() => handleDeleteTemplate(t.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {templates.length === 0 && (
                    <tr><td colSpan="4">
                      <div className="empty-state" style={{ padding: 36 }}>
                        <div className="empty-state-icon"><FileText size={22} /></div>
                        <div className="empty-state-title">ยังไม่มีเทมเพลต</div>
                        <div className="empty-state-text">สร้างเทมเพลตเพื่อกำหนดรูปแบบใบรับรอง PDF</div>
                      </div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ผู้ออกใบรับรอง ── */}
        {view === 'issuers' && (
          <div>
            {showAddIssuer && (
              <div className="card-accent animate-in" style={{ padding: 28, marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>{editingIssuer ? 'แก้ไขข้อมูลผู้ออกใบรับรอง' : 'ลงทะเบียนผู้ออกใบรับรอง'}</h2>
                <form onSubmit={handleCreateIssuer}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">ชื่อผู้แทน</label>
                      <input type="text" className="form-input" required placeholder="เช่น ดร.สมชาย ใจดี" value={issuerName} onChange={(e) => setIssuerName(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">ชื่อองค์กร</label>
                      <input type="text" className="form-input" required placeholder="เช่น มหาวิทยาลัยตัวอย่าง" value={issuerOrg} onChange={(e) => setIssuerOrg(e.target.value)} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">ตราสัญลักษณ์ / โลโก้องค์กร (Logo)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input type="file" accept="image/*" onChange={handleUploadLogo} style={{ fontSize: 13 }} />
                        {logoLoading && <span className="spinner" style={{ width: 14, height: 14 }} />}
                      </div>
                      {issuerLogo && (
                        <div style={{ marginTop: 8, padding: 8, background: 'var(--bg-subtle)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <img src={resolveImageUrl(issuerLogo)} alt="Logo Preview" style={{ maxHeight: 40, maxWidth: 80, objectFit: 'contain' }} />
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{issuerLogo}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">ภาพลายเซ็นผู้ออกใบรับรอง (Signature)</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <input type="file" accept="image/*" onChange={handleUploadSignature} style={{ fontSize: 13 }} />
                          {sigLoading && <span className="spinner" style={{ width: 14, height: 14 }} />}
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                          <input type="checkbox" checked={removeBgChecked} onChange={(e) => setRemoveBgChecked(e.target.checked)} />
                          <span>ลบพื้นหลังสีขาวอัตโนมัติ (เพื่อให้ลายเซ็นเนียนกลืนกับกระดาษ)</span>
                        </label>
                      </div>
                      {issuerSig && (
                        <div style={{ marginTop: 8, padding: 8, background: 'var(--bg-subtle)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <img src={resolveImageUrl(issuerSig)} alt="Signature Preview" style={{ maxHeight: 40, maxWidth: 80, objectFit: 'contain', background: '#ffffff', border: '1px solid var(--border)', borderRadius: 4 }} />
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{issuerSig}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => { setShowAddIssuer(false); setEditingIssuer(null); setIssuerName(''); setIssuerOrg(''); setIssuerLogo(''); setIssuerSig('') }}>ยกเลิก</button>
                    <button type="submit" className="btn btn-primary">บันทึก</button>
                  </div>
                </form>
              </div>
            )}
            <div className="table-container">
              <table className="custom-table">
                <thead><tr><th>ชื่อผู้ออก</th><th>องค์กร</th><th>โลโก้</th><th>ลายเซ็น</th><th style={{ width: 100 }}>จัดการ</th></tr></thead>
                <tbody>
                  {issuers.map(i => (
                    <tr key={i.id}>
                      <td style={{ fontWeight: 600 }}>{i.name}</td>
                      <td>{i.organization}</td>
                      <td>
                        {i.logo_url ? (
                          <img src={resolveImageUrl(i.logo_url)} alt="Logo" style={{ height: 24, objectFit: 'contain', borderRadius: 4 }} />
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        {i.signature_image_url ? (
                          <img src={resolveImageUrl(i.signature_image_url)} alt="Signature" style={{ height: 24, objectFit: 'contain', background: 'white', border: '1px solid var(--border)', borderRadius: 2 }} />
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => handleEditIssuerClick(i)}>แก้ไข</button>
                          <button className="btn-icon" style={{ color: 'var(--danger)' }} title="ลบผู้ออกใบรับรอง" onClick={() => handleDeleteIssuer(i.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {issuers.length === 0 && (
                    <tr><td colSpan="4">
                      <div className="empty-state" style={{ padding: 36 }}>
                        <div className="empty-state-icon"><Building2 size={22} /></div>
                        <div className="empty-state-title">ยังไม่มีผู้ออกใบรับรอง</div>
                        <div className="empty-state-text">ลงทะเบียนผู้ออกเพื่อลงนามในใบรับรอง</div>
                      </div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


/* ==========================================================================
   หน้าใบรับรองของฉัน (ผู้รับ)
   ========================================================================== */
function VerifierProfile({ token }) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [selectedCertForView, setSelectedCertForView] = useState(null)

  useEffect(() => { fetchProfileWallet() }, [])

  const fetchProfileWallet = () => {
    setLoading(true); setError('')
    fetch(`${API_URL}/api/me/certificate-groups`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(async r => { if (r.ok) return r.json(); const e = await r.json(); throw new Error(e.detail || 'ไม่สำเร็จ') })
      .then(data => setData(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  const handleDownload = (certId, certNo) => {
    fetch(`${API_URL}/api/certificates/${certId}/download`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(async r => { if (r.ok) return r.json(); const e = await r.json(); throw new Error(e.detail || 'ดาวน์โหลดไม่สำเร็จ') })
      .then(data => {
        const a = document.createElement('a');
        a.href = data.download_url;
        a.download = `${certNo}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      })
      .catch(err => alert(`ผิดพลาด: ${err.message}`))
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
      <div className="page-header">
        <div>
          <h1>
            <GraduationCap size={24} style={{ verticalAlign: -4, marginRight: 8, color: 'var(--accent)' }} />
            ใบรับรองของฉัน
          </h1>
          <p>ใบรับรองที่ผูกกับอีเมล: <strong style={{ color: 'var(--accent)' }}>{data?.email}</strong></p>
        </div>
        <button className="btn btn-secondary" onClick={fetchProfileWallet}><RefreshCw size={14} /> รีเฟรช</button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          <span className="spinner" style={{ width: 24, height: 24, display: 'inline-block', marginBottom: 10 }} />
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      )}

      {error && <div className="alert alert-error"><AlertTriangle size={15} /> {error}</div>}

      {data && data.groups && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {data.groups.map(group => (
            <div key={group.group_id} className="wallet-card">
              <div className="wallet-card-header">
                <div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <span className="badge badge-primary">{group.category}</span>
                    <span className="badge badge-neutral">{group.level === 'beginner' ? 'เบื้องต้น' : group.level === 'intermediate' ? 'ปานกลาง' : group.level === 'advanced' ? 'ขั้นสูง' : group.level}</span>
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{group.name}</h2>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Building2 size={14} /> {group.issuer}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>{group.certificates?.length || 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>ใบรับรอง</div>
                </div>
              </div>
              <div className="wallet-card-body">
                {group.certificates?.map(cert => {
                  const isCertified = cert.status === 'valid' || cert.status === 'generated';
                  return (
                    <div key={cert.id} className="wallet-cert-item">
                      <div style={{ flex: 1 }}>
                        <div 
                          style={{ 
                            fontWeight: 600, 
                            fontSize: 15, 
                            marginBottom: 3, 
                            cursor: isCertified ? 'pointer' : 'default',
                            transition: 'color 0.2s'
                          }} 
                          onClick={() => {
                            if (isCertified) {
                              setSelectedCertForView(cert);
                            }
                          }}
                          className={isCertified ? 'hover-accent-text' : ''}
                        >
                          {cert.course}
                        </div>
                        <div style={{ display: 'flex', gap: 14, fontSize: 13, color: 'var(--text-muted)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Hash size={12} /> {cert.certificate_no}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={12} /> {cert.issue_date}</span>
                        </div>
                      </div>
                      <div className="wallet-cert-actions">
                        <span className={`badge ${isCertified ? 'badge-success' : cert.status === 'revoked' ? 'badge-danger' : 'badge-warning'}`}>
                          {isCertified ? 'ผ่านการรับรอง (Certified)' : cert.status === 'revoked' ? 'ยกเลิก (Revoked)' : cert.status === 'pending' ? 'รอดำเนินการ (Pending)' : cert.status}
                        </span>
                        {isCertified && (
                          <>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '5px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }} 
                              onClick={() => setSelectedCertForView(cert)}
                            >
                              <Eye size={13} /> แสดงใบรับรอง
                            </button>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '5px 12px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }} 
                              onClick={() => handleDownload(cert.id, cert.certificate_no)}
                            >
                              <Download size={13} /> ดาวน์โหลด
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(!group.certificates || group.certificates.length === 0) && (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: 14 }}>
                    ยังไม่มีใบรับรองในโปรแกรมนี้
                  </div>
                )}
              </div>
            </div>
          ))}

          {data.groups.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon"><GraduationCap size={24} /></div>
              <div className="empty-state-title">ยังไม่พบใบรับรอง</div>
              <div className="empty-state-text">ใบรับรองที่ผูกกับอีเมลของคุณจะแสดงที่นี่</div>
            </div>
          )}
        </div>
      )}

      {/* Glassmorphic Certificate Preview Modal */}
      {selectedCertForView && createPortal(
        <div className="cert-modal-backdrop" onClick={() => setSelectedCertForView(null)}>
          <div className="cert-modal-container" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="cert-modal-header">
              <div>
                <h3>
                  <Award size={18} style={{ color: 'var(--accent)' }} />
                  ตัวอย่างใบรับรองดิจิทัล (Certificate Preview)
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>เลขที่ใบรับรอง: {selectedCertForView.certificate_no}</p>
              </div>
              <button className="btn-icon" onClick={() => setSelectedCertForView(null)}>
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="cert-modal-body">
              <div className="cert-modal-preview-card">
                <iframe 
                  id="cert-preview-iframe"
                  src={`${API_URL}/api/certificates/${selectedCertForView.id}/print?hide_btn=true`}
                  style={{
                    width: '100%',
                    flex: 1,
                    border: 'none'
                  }}
                  title="Certificate Preview"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="cert-modal-footer">
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                หลักสูตร: <strong>{selectedCertForView.course}</strong>
              </div>
              <div className="cert-modal-actions">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    const iframe = document.getElementById('cert-preview-iframe');
                    if (iframe) {
                      iframe.contentWindow.focus();
                      iframe.contentWindow.print();
                    }
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Printer size={15} /> พิมพ์ / บันทึก PDF
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleDownload(selectedCertForView.id, selectedCertForView.certificate_no)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={15} /> ดาวน์โหลด PDF
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setSelectedCertForView(null)}
                >
                  ปิด
                </button>
              </div>
            </div>
            
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}


/* ==========================================================================
   หน้าผู้ดูแลระบบ
   ========================================================================== */
function AdminPanel({ token, email }) {
  const [view, setView] = useState('users')
  const [users, setUsers] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [auditSearch, setAuditSearch] = useState('')
  const [auditCurrentPage, setAuditCurrentPage] = useState(1)
  const [auditRowsPerPage, setAuditRowsPerPage] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Super Admin user creation states
  const [showAddUser, setShowAddUser] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('staff')

  // User editing states
  const [editingUser, setEditingUser] = useState(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editPassword, setEditPassword] = useState('')

  // Whitelist search, sorting & pagination states
  const [whitelistSearch, setWhitelistSearch] = useState('')
  const [wlCurrentPage, setWlCurrentPage] = useState(1)
  const [wlRowsPerPage, setWlRowsPerPage] = useState(10)
  const [wlSortKey, setWlSortKey] = useState('created_at')
  const [wlSortOrder, setWlSortOrder] = useState('desc')

  // Whitelist Inline Editing State
  const [editingWlId, setEditingWlId] = useState(null)
  const [editWlEmail, setEditWlEmail] = useState('')
  const [editWlName, setEditWlName] = useState('')

  // Whitelist Selection State (for Bulk Operations)
  const [selectedWlIds, setSelectedWlIds] = useState([])

  // Google OAuth & Whitelist states
  const [oauthEnabled, setOauthEnabled] = useState(false)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [clientSecretHidden, setClientSecretHidden] = useState('')
  const [whitelist, setWhitelist] = useState([])
  const [showAddWhitelist, setShowAddWhitelist] = useState(false)
  const [whitelistEmail, setWhitelistEmail] = useState('')
  const [whitelistName, setWhitelistName] = useState('')
  const [csvFile, setCsvFile] = useState(null)
  const [csvResult, setCsvResult] = useState(null)

  useEffect(() => {
    setWlCurrentPage(1)
    setSelectedWlIds([])
  }, [whitelistSearch, wlRowsPerPage])

  useEffect(() => {
    setAuditCurrentPage(1)
  }, [auditSearch, auditRowsPerPage])

  useEffect(() => { fetchData() }, [view])

  const filteredWhitelist = whitelist.filter(item => {
    const searchLower = whitelistSearch.toLowerCase()
    const matchEmail = item.email ? item.email.toLowerCase().includes(searchLower) : false
    const matchName = item.name ? item.name.toLowerCase().includes(searchLower) : false
    return matchEmail || matchName
  })

  // Sort whitelist
  const sortedWhitelist = [...filteredWhitelist].sort((a, b) => {
    let valA = a[wlSortKey] || ''
    let valB = b[wlSortKey] || ''
    
    if (wlSortKey === 'created_at') {
      valA = new Date(a.created_at || 0)
      valB = new Date(b.created_at || 0)
    } else {
      valA = valA.toString().toLowerCase()
      valB = valB.toString().toLowerCase()
    }
    
    if (valA < valB) return wlSortOrder === 'asc' ? -1 : 1
    if (valA > valB) return wlSortOrder === 'asc' ? 1 : -1
    return 0
  })

  const totalWlPages = Math.ceil(sortedWhitelist.length / wlRowsPerPage) || 1
  const indexOfLastWlRow = wlCurrentPage * wlRowsPerPage
  const indexOfFirstWlRow = indexOfLastWlRow - wlRowsPerPage
  const currentWlRows = sortedWhitelist.slice(indexOfFirstWlRow, indexOfLastWlRow)

  const filteredAuditLogs = auditLogs.filter(log => {
    const searchLower = auditSearch.toLowerCase()
    const matchEmail = log.actor_email ? log.actor_email.toLowerCase().includes(searchLower) : false
    const matchName = log.actor_name ? log.actor_name.toLowerCase().includes(searchLower) : false
    const matchAction = log.action ? log.action.toLowerCase().includes(searchLower) : false
    const matchEntityType = log.entity_type ? log.entity_type.toLowerCase().includes(searchLower) : false
    const matchIp = log.ip_address ? log.ip_address.toLowerCase().includes(searchLower) : false
    const matchUserAgent = log.user_agent ? log.user_agent.toLowerCase().includes(searchLower) : false
    const matchDate = log.created_at ? new Date(log.created_at).toLocaleString('th-TH').toLowerCase().includes(searchLower) : false
    return matchEmail || matchName || matchAction || matchEntityType || matchIp || matchUserAgent || matchDate
  })

  const totalAuditPages = Math.ceil(filteredAuditLogs.length / auditRowsPerPage) || 1
  const indexOfLastAuditRow = auditCurrentPage * auditRowsPerPage
  const indexOfFirstAuditRow = indexOfLastAuditRow - auditRowsPerPage
  const currentAuditRows = filteredAuditLogs.slice(indexOfFirstAuditRow, indexOfLastAuditRow)

  const fetchData = () => {
    setLoading(true); setError(''); setSuccess('')
    const headers = { 'Authorization': `Bearer ${token}` }
    
    if (view === 'users') {
      fetch(`${API_URL}/api/users`, { headers })
        .then(async r => { if (r.ok) return r.json(); throw new Error('โหลดข้อมูลผู้ใช้ไม่สำเร็จ') })
        .then(data => setUsers(Array.isArray(data) ? data : []))
        .catch(err => setError(err.message))
        .finally(() => setLoading(false))
    } else if (view === 'google_oauth') {
      Promise.all([
        fetch(`${API_URL}/api/admin/settings`, { headers }).then(r => r.json()),
        fetch(`${API_URL}/api/admin/whitelist`, { headers }).then(r => r.json())
      ])
      .then(([config, wl]) => {
        setOauthEnabled(config.google_oauth_enabled)
        setClientId(config.google_client_id)
        setClientSecretHidden(config.google_client_secret_hidden || '')
        setClientSecret('')
        setWhitelist(Array.isArray(wl) ? wl : [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
    } else {
      fetch(`${API_URL}/api/audit-logs`, { headers })
        .then(async r => { if (r.ok) return r.json(); throw new Error('โหลดบันทึกกิจกรรมไม่สำเร็จ') })
        .then(data => setAuditLogs(Array.isArray(data) ? data : []))
        .catch(err => setError(err.message))
        .finally(() => setLoading(false))
    }
  }

  const handleRegisterUser = (e) => {
    e.preventDefault()
    if (!newEmail || !newName || !newPassword) return
    setLoading(true); setError(''); setSuccess('')
    fetch(`${API_URL}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, full_name: newName, password: newPassword, role: newRole })
    })
      .then(async r => { if (r.ok) return r.json(); const e = await r.json(); throw new Error(e.detail || 'ลงทะเบียนไม่สำเร็จ') })
      .then(() => { setSuccess(`ลงทะเบียนผู้ใช้ "${newName}" สำเร็จแล้ว`); setNewEmail(''); setNewName(''); setNewPassword(''); setShowAddUser(false); fetchData() })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  const handleEditUser = (user) => {
    setEditingUser(user)
    setEditName(user.full_name)
    setEditRole(user.role)
    setEditStatus(user.status)
    setEditPassword('')
  }

  const handleUpdateUser = (e) => {
    e.preventDefault()
    if (!editingUser) return
    setLoading(true); setError(''); setSuccess('')
    fetch(`${API_URL}/api/users/${editingUser.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        full_name: editName,
        role: editRole,
        status: editStatus,
        password: editPassword || undefined
      })
    })
      .then(async r => { if (r.ok) return r.json(); const err = await r.json(); throw new Error(err.detail || 'อัปเดตไม่สำเร็จ') })
      .then(() => {
        setSuccess(`อัปเดตผู้ใช้ "${editName}" เรียบร้อยแล้ว`)
        setEditingUser(null)
        fetchData()
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  const handleDeleteUser = (user) => {
    if (user.role === 'super_admin') {
      const superAdmins = users.filter(u => u.role === 'super_admin')
      if (superAdmins.length <= 1) {
        alert('ไม่สามารถลบผู้ดูแลระบบคนสุดท้ายได้')
        return
      }
    }
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ "${user.full_name}" (${user.email}) ออกจากระบบ? การลบนี้ไม่สามารถย้อนกลับได้`)) return
    setLoading(true); setError(''); setSuccess('')
    fetch(`${API_URL}/api/users/${user.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(async r => { if (r.ok) return r.json(); const err = await r.json(); throw new Error(err.detail || 'ลบผู้ใช้ไม่สำเร็จ') })
      .then(() => {
        setSuccess(`ลบผู้ใช้เรียบร้อยแล้ว`)
        fetchData()
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  const handleSaveSettings = (e) => {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    fetch(`${API_URL}/api/admin/settings`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        google_oauth_enabled: oauthEnabled,
        google_client_id: clientId,
        google_client_secret: clientSecret
      })
    })
      .then(async r => { if (r.ok) return r.json(); const e = await r.json(); throw new Error(e.detail || 'บันทึกการตั้งค่าไม่สำเร็จ') })
      .then(() => { setSuccess('บันทึกการตั้งค่า Google OAuth เรียบร้อยแล้ว'); fetchData() })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  const handleAddWhitelist = (e) => {
    e.preventDefault()
    if (!whitelistEmail) return
    setLoading(true); setError(''); setSuccess('')
    fetch(`${API_URL}/api/admin/whitelist`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: whitelistEmail,
        name: whitelistName
      })
    })
      .then(async r => { if (r.ok) return r.json(); const e = await r.json(); throw new Error(e.detail || 'เพิ่มรายชื่อไม่สำเร็จ') })
      .then(() => { setSuccess(`เพิ่มอีเมล "${whitelistEmail}" เข้า Whitelist เรียบร้อยแล้ว`); setWhitelistEmail(''); setWhitelistName(''); setShowAddWhitelist(false); fetchData() })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  const handleImportWhitelistCsv = (e) => {
    e.preventDefault()
    if (!csvFile) return
    setLoading(true); setError(''); setSuccess('')
    const formData = new FormData()
    formData.append('file', csvFile)
    fetch(`${API_URL}/api/admin/whitelist/import`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
      .then(async r => { if (r.ok) return r.json(); const e = await r.json(); throw new Error(e.detail || 'นำเข้าไม่สำเร็จ') })
      .then(data => {
        setCsvResult(data)
        setSuccess(`นำเข้าข้อมูล Whitelist สำเร็จ: นำเข้า ${data.imported_rows} รายชื่อ`)
        setCsvFile(null)
        fetchData()
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  const downloadWhitelistTemplate = () => {
    const csvContent = "email,name\n" +
                       "somchai@example.com,สมชาย ใจดี\n" +
                       "anong@example.com,อนงค์ ดีเลิศ\n";
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "whitelist_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleDeleteWhitelist = (email) => {
    if (!window.confirm(`คุณต้องการลบ "${email}" ออกจาก Whitelist และลบผู้ใช้รายนี้ออกจากระบบใช่หรือไม่?`)) return
    setLoading(true); setError(''); setSuccess('')
    fetch(`${API_URL}/api/admin/whitelist/${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(async r => { if (r.ok) return r.json(); const e = await r.json(); throw new Error(e.detail || 'ลบไม่สำเร็จ') })
      .then(() => { setSuccess(`ลบ "${email}" ออกเรียบร้อยแล้ว`); fetchData() })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  const handleSaveEditWl = (id) => {
    if (!editWlEmail) return
    setLoading(true); setError(''); setSuccess('')
    fetch(`${API_URL}/api/admin/whitelist/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: editWlEmail,
        name: editWlName
      })
    })
      .then(async r => { if (r.ok) return r.json(); const e = await r.json(); throw new Error(e.detail || 'แก้ไขไม่สำเร็จ') })
      .then(() => {
        setSuccess(`แก้ไขข้อมูล Whitelist เรียบร้อยแล้ว`);
        setEditingWlId(null);
        fetchData();
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  const handleBulkDeleteWl = () => {
    if (selectedWlIds.length === 0) return
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรายชื่อที่เลือกทั้งหมด ${selectedWlIds.length} รายการออกจาก Whitelist? การดำเนินการนี้จะลบผู้ใช้และใบรับรองที่เกี่ยวข้องออกจากระบบด้วย`)) return
    setLoading(true); setError(''); setSuccess('')
    fetch(`${API_URL}/api/admin/whitelist/bulk-delete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ids: selectedWlIds
      })
    })
      .then(async r => { if (r.ok) return r.json(); const e = await r.json(); throw new Error(e.detail || 'ลบแบบกลุ่มไม่สำเร็จ') })
      .then(data => {
        setSuccess(data.message || 'ลบรายชื่อที่เลือกสำเร็จแล้ว');
        setSelectedWlIds([]);
        fetchData();
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  const handleClearAuditLogs = () => {
    if (!window.confirm('คุณต้องการล้างประวัติกิจกรรมทั้งหมดในระบบใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) return
    setLoading(true); setError(''); setSuccess('')
    fetch(`${API_URL}/api/audit-logs`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(async r => { if (r.ok) return r.json(); const e = await r.json(); throw new Error(e.detail || 'ล้างประวัติไม่สำเร็จ') })
      .then(() => { setSuccess('ล้างประวัติกิจกรรมทั้งหมดสำเร็จแล้ว'); setAuditLogs([]); fetchData() })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  const exportAuditLogsToCsv = () => {
    if (filteredAuditLogs.length === 0) return
    const headers = ["วันเวลา (Timestamp)", "อีเมลผู้ใช้งาน (Email)", "ชื่อผู้ใช้งาน (Name)", "กิจกรรม (Action)", "ประเภทข้อมูล (Entity Type)", "ไอดีอ้างอิง (Entity ID)", "ที่อยู่ IP (IP Address)", "เบราว์เซอร์/User Agent (User Agent)", "รายละเอียดเพิ่มเติม (Metadata)"]
    const rows = filteredAuditLogs.map(log => {
      const dateStr = log.created_at ? new Date(log.created_at).toLocaleString('th-TH') : '—'
      const email = log.actor_email || '—'
      const name = log.actor_name || 'ระบบ'
      const action = getActionLabel(log.action) || log.action
      const entity = log.entity_type || '—'
      const entityId = log.entity_id || '—'
      const ip = log.ip_address || 'ภายใน'
      const ua = log.user_agent ? log.user_agent.replace(/"/g, '""') : '—'
      const meta = log.meta_data ? JSON.stringify(log.meta_data).replace(/"/g, '""') : '—'
      return [
        `"${dateStr}"`,
        `"${email}"`,
        `"${name}"`,
        `"${action}"`,
        `"${entity}"`,
        `"${entityId}"`,
        `"${ip}"`,
        `"${ua}"`,
        `"${meta}"`
      ].join(",")
    })
    const csvContent = headers.join(",") + "\n" + rows.join("\n")
    const BOM = "\uFEFF"
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `system_audit_logs_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getActionLabel = (action) => {
    if (action?.includes('login')) return 'เข้าสู่ระบบ'
    if (action?.includes('create')) return 'สร้าง'
    if (action?.includes('register')) return 'ลงทะเบียน'
    if (action?.includes('delete')) return 'ลบ'
    if (action?.includes('revoke')) return 'ยกเลิก'
    if (action?.includes('update')) return 'แก้ไข'
    if (action?.includes('generate')) return 'สร้างใบรับรอง'
    if (action?.includes('import')) return 'นำเข้า'
    return action
  }

  const getActionBadge = (action) => {
    if (action?.includes('login')) return 'badge-info'
    if (action?.includes('create') || action?.includes('register')) return 'badge-success'
    if (action?.includes('delete') || action?.includes('revoke')) return 'badge-danger'
    if (action?.includes('update') || action?.includes('generate')) return 'badge-warning'
    return 'badge-primary'
  }

  return (
    <div className="dashboard-layout">
      <div className="sidebar">
        <div style={{ padding: '0 14px 16px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="icon-box" style={{ width: 32, height: 32, borderRadius: 8 }}>
              <Shield size={16} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>ผู้ดูแลระบบ</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>จัดการและตรวจสอบ</div>
            </div>
          </div>
        </div>

        <div className="sidebar-section-label">การจัดการ</div>
        <div className={`sidebar-link ${view === 'users' ? 'active' : ''}`} onClick={() => setView('users')}>
          <Users size={17} /> จัดการผู้ใช้
        </div>
        <div className={`sidebar-link ${view === 'google_oauth' ? 'active' : ''}`} onClick={() => setView('google_oauth')}>
          <Globe size={17} /> ตั้งค่า Google & Whitelist
        </div>
        <div className={`sidebar-link ${view === 'audit' ? 'active' : ''}`} onClick={() => setView('audit')}>
          <Shield size={17} /> บันทึกกิจกรรม
        </div>
      </div>

      <div className="main-content">
        <div className="page-header">
          <div>
            <h1>{view === 'users' ? 'จัดการผู้ใช้' : view === 'google_oauth' ? 'ตั้งค่า Google OAuth & Whitelist' : 'บันทึกกิจกรรมระบบ'}</h1>
            <p>{view === 'users' ? 'สร้างและจัดการบัญชีผู้ใช้ในระบบ' : view === 'google_oauth' ? 'จัดการการเข้าใช้งานผ่าน Google SSO และรายชื่อผู้ได้รับสิทธิ์เข้าใช้งาน' : 'ดูกิจกรรมทั้งหมดและเหตุการณ์ด้านความปลอดภัย'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={fetchData}><RefreshCw size={14} /> รีเฟรช</button>
            {view === 'users' && !showAddUser && <button className="btn btn-primary" onClick={() => setShowAddUser(true)}><Plus size={15} /> สร้างผู้ใช้</button>}
            {view === 'audit' && auditLogs.length > 0 && (
              <>
                <button className="btn btn-secondary" onClick={exportAuditLogsToCsv} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Download size={14} /> ส่งออกข้อมูล CSV
                </button>
                <button className="btn btn-danger" onClick={handleClearAuditLogs}>
                  <Trash2 size={14} /> ล้างประวัติกิจกรรม
                </button>
              </>
            )}
          </div>
        </div>

        {success && <div className="alert alert-success"><CheckCircle size={15} /> {success}<button className="alert-close" onClick={() => setSuccess('')}>×</button></div>}
        {error && <div className="alert alert-error"><AlertTriangle size={15} /> {error}<button className="alert-close" onClick={() => setError('')}>×</button></div>}

        {view === 'users' && showAddUser && (
          <div className="card-accent animate-in" style={{ padding: 28, marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>ลงทะเบียนผู้ใช้ใหม่</h2>
            <form onSubmit={handleRegisterUser}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">ชื่อ-นามสกุล</label>
                  <input type="text" className="form-input" required placeholder="เช่น สมชาย ใจดี" value={newName} onChange={(e) => setNewName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">อีเมล</label>
                  <input type="email" className="form-input" required placeholder="user@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">รหัสผ่าน</label>
                  <input type="password" className="form-input" required placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">บทบาท</label>
                  <select className="form-input" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                    <option value="verifier">ผู้รับใบรับรอง</option>
                    <option value="staff">เจ้าหน้าที่</option>
                    <option value="super_admin">ผู้ดูแลระบบ</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddUser(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary">บันทึก</button>
              </div>
            </form>
          </div>
        )}

        {view === 'users' && editingUser && (
          <div className="card-accent animate-in" style={{ padding: 28, marginBottom: 24, borderColor: 'var(--accent)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>แก้ไขข้อมูลผู้ใช้: {editingUser.email}</h2>
            <form onSubmit={handleUpdateUser}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">ชื่อ-นามสกุล</label>
                  <input type="text" className="form-input" required value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">บทบาท</label>
                  <select className="form-input" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                    <option value="verifier">ผู้รับใบรับรอง</option>
                    <option value="staff">เจ้าหน้าที่</option>
                    <option value="super_admin">ผู้ดูแลระบบ</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">สถานะ</label>
                  <select className="form-input" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                    <option value="active">ปกติ</option>
                    <option value="suspended">ระงับการใช้งาน</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">รหัสผ่านใหม่ (ระบุเมื่อต้องการเปลี่ยน)</label>
                  <input type="password" className="form-input" placeholder="ว่างไว้เพื่อคงเดิม" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} style={{ padding: '8px 12px', fontSize: 13 }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>บันทึกการแก้ไข</button>
              </div>
            </form>
          </div>
        )}

        <div className="table-container">
          {view === 'users' && (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ชื่อ-นามสกุล</th>
                  <th>อีเมล</th>
                  <th>บทบาท</th>
                  <th>สถานะ</th>
                  <th>วันที่ลงทะเบียน</th>
                  <th style={{ width: 140 }}>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === 'super_admin' ? 'badge-danger' : u.role === 'staff' ? 'badge-primary' : 'badge-neutral'}`}>
                        {u.role === 'super_admin' ? 'ผู้ดูแลระบบ' : u.role === 'staff' ? 'เจ้าหน้าที่' : 'ผู้รับใบรับรอง'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        {u.status === 'active' ? 'ปกติ' : 'ระงับการใช้งาน'}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {u.created_at ? new Date(u.created_at.endsWith('Z') || u.created_at.includes('+') ? u.created_at : u.created_at + 'Z').toLocaleDateString('th-TH') : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '2px 8px', fontSize: 11, height: 'auto' }} 
                          onClick={() => handleEditUser(u)}
                        >
                          แก้ไข
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '2px 8px', fontSize: 11, height: 'auto', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }} 
                          onClick={() => handleDeleteUser(u)}
                          disabled={u.email === email}
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan="6">
                    <div className="empty-state" style={{ padding: 36 }}>
                      <div className="empty-state-icon"><Users size={22} /></div>
                      <div className="empty-state-title">ยังไม่มีบัญชีผู้ใช้</div>
                      <div className="empty-state-text">ผู้ใช้งานที่ลงทะเบียนจะแสดงที่นี่</div>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          )}

          {view === 'google_oauth' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'stretch' }}>
              {/* ตั้งค่า Google OAuth */}
              <div className="card" style={{ padding: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Globe size={18} color="var(--accent)" /> ตั้งค่า Google OAuth
                </h2>
                <form onSubmit={handleSaveSettings}>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <input 
                      type="checkbox" 
                      id="google_oauth_enabled" 
                      checked={oauthEnabled} 
                      onChange={(e) => setOauthEnabled(e.target.checked)} 
                    />
                    <label htmlFor="google_oauth_enabled" style={{ fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>เปิดใช้งาน Google OAuth Login</label>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Client ID</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="ป้อน Google Client ID" 
                      value={clientId} 
                      onChange={(e) => setClientId(e.target.value)} 
                    />
                    {clientId && <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>✓ Client ID ถูกตั้งค่าแล้ว</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Client Secret</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder={clientSecretHidden ? `${clientSecretHidden} (กรอกใหม่เพื่อเปลี่ยน)` : 'ป้อน Google Client Secret'} 
                      value={clientSecret} 
                      onChange={(e) => setClientSecret(e.target.value)} 
                    />
                    {clientSecretHidden && !clientSecret && (
                      <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>✓ Client Secret ถูกตั้งค่าแล้ว ({clientSecretHidden}) — เว้นว่างเพื่อคงค่าเดิม</div>
                    )}
                    {clientSecret && (
                      <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>⟳ จะอัปเดต Client Secret ใหม่เมื่อกดบันทึก</div>
                    )}
                  </div>

                  {clientId && clientSecretHidden && oauthEnabled && (
                    <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', padding: 12, borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle size={16} color="#22c55e" />
                      <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 500 }}>Google OAuth พร้อมใช้งาน</span>
                    </div>
                  )}

                  <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 6, marginBottom: 16, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>AUTHORIZED REDIRECT URI</div>
                    <code style={{ fontSize: 11, wordBreak: 'break-all', color: 'var(--accent)' }}>
                      {window.location.origin}/certificate/api/auth/google/callback
                    </code>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                    {loading ? <><span className="spinner" /> กำลังบันทึก...</> : 'บันทึกการตั้งค่า'}
                  </button>
                </form>
              </div>

              {/* Whitelist Stats Dashboard on the right side of the grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
                <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                  <div style={{ padding: 12, borderRadius: 8, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Globe size={24} color="var(--accent)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>รายชื่อใน WHITELIST ทั้งหมด</div>
                    <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{whitelist.length.toLocaleString()} รายการ</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>อีเมลที่ได้รับสิทธิ์ล็อกอินด้วย Google OAuth</div>
                  </div>
                </div>
                
                <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                  <div style={{ padding: 12, borderRadius: 8, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={24} color="#22c55e" />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>บัญชีที่มีข้อมูลชื่อ-นามสกุล</div>
                    <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{whitelist.filter(w => w.name).length.toLocaleString()} รายการ</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>บัญชีผู้ใช้ที่มีการระบุรายละเอียดชื่อในระบบ</div>
                  </div>
                </div>
                
                <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                  <div style={{ padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={24} color="#ef4444" />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>ไม่มีชื่อ (ใช้อีเมลเป็นหลัก)</div>
                    <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{whitelist.filter(w => !w.name).length.toLocaleString()} รายการ</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>ล็อกอินด้วยอีเมลโดยใช้ชื่อเริ่มต้นจาก Google Profile</div>
                  </div>
                </div>
              </div>
            </div> {/* Close grid */}

            {/* จัดการ Whitelist (Full Width) */}
            <div className="card" style={{ padding: 24, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>ตารางจัดการ Whitelist รายชื่อผู้เข้าใช้งาน</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>ค้นหา แก้ไข และจัดการรายชื่อที่มีสิทธิ์ล็อกอินผ่าน Google</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setShowAddWhitelist(!showAddWhitelist)}>
                    <Plus size={14} /> {showAddWhitelist ? 'ซ่อนฟอร์ม' : 'เพิ่มแมนวล'}
                  </button>
                </div>
              </div>

              {showAddWhitelist && (
                <form onSubmit={handleAddWhitelist} style={{ marginBottom: 20, padding: 16, background: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)' }} className="animate-in">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>อีเมลผู้ใช้งาน</label>
                      <input type="email" className="form-input" required placeholder="name@example.com" value={whitelistEmail} onChange={(e) => setWhitelistEmail(e.target.value)} style={{ padding: '8px 12px', fontSize: 13 }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>ชื่อ-นามสกุล (ระบุหรือไม่ก็ได้)</label>
                      <input type="text" className="form-input" placeholder="เช่น สมชาย ใจดี" value={whitelistName} onChange={(e) => setWhitelistName(e.target.value)} style={{ padding: '8px 12px', fontSize: 13 }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setShowAddWhitelist(false)}>ยกเลิก</button>
                    <button type="submit" className="btn btn-primary" style={{ padding: '6px 16px', fontSize: 12 }}>เพิ่มเข้า Whitelist</button>
                  </div>
                </form>
              )}

              {/* นำเข้า Whitelist จาก CSV */}
              <div style={{ border: '1px dashed var(--border)', borderRadius: 6, padding: 16, background: 'var(--bg-subtle)', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>นำเข้า Whitelist จากไฟล์ CSV</div>
                  <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 11, height: 'auto' }} onClick={downloadWhitelistTemplate}>
                    <Download size={12} style={{ marginRight: 4 }} /> ดาวน์โหลดเทมเพลต CSV
                  </button>
                </div>
                <form onSubmit={handleImportWhitelistCsv} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <input type="file" accept=".csv" required onChange={(e) => setCsvFile(e.target.files[0])} style={{ fontSize: 12, flex: 1 }} />
                  <button type="submit" className="btn btn-primary" style={{ padding: '6px 16px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }} disabled={loading || !csvFile}>
                    <Upload size={13} /> นำเข้า
                  </button>
                </form>
              </div>

              {/* ค้นหา Whitelist */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ paddingLeft: 34, fontSize: 13, height: 'auto', paddingTop: 8, paddingBottom: 8 }} 
                    placeholder="ค้นหาตามชื่อหรืออีเมลใน Whitelist..." 
                    value={whitelistSearch} 
                    onChange={(e) => setWhitelistSearch(e.target.value)} 
                  />
                </div>
                {whitelistSearch && (
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '6px 12px', fontSize: 12, height: 'auto' }} 
                    onClick={() => setWhitelistSearch('')}
                  >
                    ล้างค่า
                  </button>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>แสดง:</span>
                  <select 
                    className="form-input" 
                    style={{ width: 90, fontSize: 12, height: 'auto', paddingTop: 7, paddingBottom: 7, paddingLeft: 6, paddingRight: 6 }} 
                    value={wlRowsPerPage} 
                    onChange={(e) => setWlRowsPerPage(Number(e.target.value))}
                  >
                    <option value={10}>10 แถว</option>
                    <option value={20}>20 แถว</option>
                    <option value={50}>50 แถว</option>
                    <option value={100}>100 แถว</option>
                    <option value={250}>250 แถว</option>
                    <option value={500}>500 แถว</option>
                  </select>
                </div>
              </div>

              {/* ตาราง Whitelist */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: '#ffffff', boxShadow: 'var(--shadow-sm)' }}>
                <table className="custom-table" style={{ margin: 0, fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle)' }}>
                      <th style={{ width: 40, textAlign: 'center', padding: '12px 8px' }}>
                        <input 
                          type="checkbox" 
                          checked={currentWlRows.length > 0 && currentWlRows.every(r => selectedWlIds.includes(r.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const newIds = [...selectedWlIds]
                              currentWlRows.forEach(r => {
                                if (!newIds.includes(r.id)) newIds.push(r.id)
                              })
                              setSelectedWlIds(newIds)
                            } else {
                              const idsToRemove = currentWlRows.map(r => r.id)
                              setSelectedWlIds(selectedWlIds.filter(id => !idsToRemove.includes(id)))
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th 
                        style={{ cursor: 'pointer', padding: '12px 16px', userSelect: 'none' }}
                        onClick={() => {
                          if (wlSortKey === 'email') {
                            setWlSortOrder(wlSortOrder === 'asc' ? 'desc' : 'asc')
                          } else {
                            setWlSortKey('email')
                            setWlSortOrder('asc')
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          อีเมล {wlSortKey === 'email' ? (wlSortOrder === 'asc' ? '▲' : '▼') : <ArrowUpDown size={12} color="var(--text-muted)" />}
                        </div>
                      </th>
                      <th 
                        style={{ cursor: 'pointer', padding: '12px 16px', userSelect: 'none' }}
                        onClick={() => {
                          if (wlSortKey === 'name') {
                            setWlSortOrder(wlSortOrder === 'asc' ? 'desc' : 'asc')
                          } else {
                            setWlSortKey('name')
                            setWlSortOrder('asc')
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          ชื่อ-นามสกุล {wlSortKey === 'name' ? (wlSortOrder === 'asc' ? '▲' : '▼') : <ArrowUpDown size={12} color="var(--text-muted)" />}
                        </div>
                      </th>
                      <th 
                        style={{ cursor: 'pointer', padding: '12px 16px', userSelect: 'none' }}
                        onClick={() => {
                          if (wlSortKey === 'created_at') {
                            setWlSortOrder(wlSortOrder === 'asc' ? 'desc' : 'asc')
                          } else {
                            setWlSortKey('created_at')
                            setWlSortOrder('asc')
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          วันที่เพิ่ม {wlSortKey === 'created_at' ? (wlSortOrder === 'asc' ? '▲' : '▼') : <ArrowUpDown size={12} color="var(--text-muted)" />}
                        </div>
                      </th>
                      <th style={{ width: 100, textAlign: 'center', padding: '12px 16px' }}>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentWlRows.map(w => {
                      const isEditing = editingWlId === w.id
                      return (
                        <tr key={w.id} style={{ 
                          background: selectedWlIds.includes(w.id) ? 'rgba(var(--accent-rgb), 0.04)' : '',
                          transition: 'background 0.2s ease'
                        }}>
                          <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedWlIds.includes(w.id)}
                              onChange={() => {
                                if (selectedWlIds.includes(w.id)) {
                                  setSelectedWlIds(selectedWlIds.filter(id => id !== w.id))
                                } else {
                                  setSelectedWlIds([...selectedWlIds, w.id])
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            {isEditing ? (
                              <input 
                                type="email" 
                                className="form-input" 
                                value={editWlEmail} 
                                onChange={(e) => setEditWlEmail(e.target.value)} 
                                style={{ padding: '4px 8px', fontSize: 12, margin: 0 }}
                              />
                            ) : (
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{w.email}</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            {isEditing ? (
                              <input 
                                type="text" 
                                className="form-input" 
                                value={editWlName} 
                                onChange={(e) => setEditWlName(e.target.value)} 
                                style={{ padding: '4px 8px', fontSize: 12, margin: 0 }}
                              />
                            ) : (
                              <span>{w.name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>
                            {w.created_at ? new Date(w.created_at).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : '—'}
                          </td>
                          <td style={{ textAlign: 'center', padding: '10px 16px' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                              {isEditing ? (
                                <>
                                  <button 
                                    className="btn-icon" 
                                    style={{ color: 'var(--success)', padding: 4, background: 'rgba(34,197,94,0.1)', borderRadius: 4 }} 
                                    onClick={() => handleSaveEditWl(w.id)}
                                    title="บันทึก"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button 
                                    className="btn-icon" 
                                    style={{ color: 'var(--text-muted)', padding: 4, background: 'var(--bg-subtle)', borderRadius: 4 }} 
                                    onClick={() => setEditingWlId(null)}
                                    title="ยกเลิก"
                                  >
                                    <X size={14} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    className="btn-icon" 
                                    style={{ color: 'var(--accent)', padding: 4, background: 'rgba(var(--accent-rgb), 0.08)', borderRadius: 4 }} 
                                    onClick={() => {
                                      setEditingWlId(w.id)
                                      setEditWlEmail(w.email)
                                      setEditWlName(w.name || '')
                                    }}
                                    title="แก้ไขรายชื่อ"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button 
                                    className="btn-icon" 
                                    style={{ color: 'var(--danger)', padding: 4, background: 'rgba(239,68,68,0.08)', borderRadius: 4 }} 
                                    onClick={() => handleDeleteWhitelist(w.email)} 
                                    title="ลบออกจาก Whitelist และระบบ"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {currentWlRows.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <Globe size={24} style={{ color: 'var(--text-muted)' }} />
                            <span>{whitelistSearch ? 'ไม่พบข้อมูลที่ค้นหา' : 'ยังไม่มีอีเมลใน Whitelist'}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ตัวควบคุมหน้า (Pagination) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 12 }}>
                <div style={{ color: 'var(--text-muted)' }}>
                  แสดง {sortedWhitelist.length > 0 ? indexOfFirstWlRow + 1 : 0} - {Math.min(indexOfLastWlRow, sortedWhitelist.length)} จาก {sortedWhitelist.length} รายการ
                </div>
                {totalWlPages > 1 && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: 12, height: 'auto' }} 
                      disabled={wlCurrentPage === 1} 
                      onClick={() => setWlCurrentPage(p => Math.max(1, p - 1))}
                    >
                      ย้อนกลับ
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px' }}>
                      <span style={{ fontWeight: 600 }}>หน้า {wlCurrentPage} / {totalWlPages}</span>
                    </div>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: 12, height: 'auto' }} 
                      disabled={wlCurrentPage === totalWlPages} 
                      onClick={() => setWlCurrentPage(p => Math.min(totalWlPages, p + 1))}
                    >
                      ถัดไป
                    </button>
                  </div>
                )}
              </div>
            </div>
            </div>
          )}

          {view === 'audit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Search & Rows Per Page controls */}
              <div className="card" style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ paddingLeft: 34, fontSize: 13, height: 'auto', paddingTop: 8, paddingBottom: 8 }} 
                    placeholder="ค้นหาตามกิจกรรม, ประเภทข้อมูล, อีเมลผู้ใช้, ชื่อ หรือ IP Address..." 
                    value={auditSearch} 
                    onChange={(e) => setAuditSearch(e.target.value)} 
                  />
                </div>
                {auditSearch && (
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '6px 12px', fontSize: 12, height: 'auto' }} 
                    onClick={() => setAuditSearch('')}
                  >
                    ล้างค่า
                  </button>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>แสดง:</span>
                  <select 
                    className="form-input" 
                    style={{ width: 90, fontSize: 12, height: 'auto', paddingTop: 7, paddingBottom: 7, paddingLeft: 6, paddingRight: 6 }} 
                    value={auditRowsPerPage} 
                    onChange={(e) => setAuditRowsPerPage(Number(e.target.value))}
                  >
                    <option value={10}>10 แถว</option>
                    <option value={20}>20 แถว</option>
                    <option value={50}>50 แถว</option>
                    <option value={100}>100 แถว</option>
                    <option value={250}>250 แถว</option>
                    <option value={500}>500 แถว</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: '#ffffff', boxShadow: 'var(--shadow-sm)' }}>
                <table className="custom-table" style={{ margin: 0, fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle)' }}>
                      <th style={{ width: 160 }}>วันเวลา</th>
                      <th>ผู้ใช้งาน (User)</th>
                      <th>กิจกรรม</th>
                      <th>ประเภทข้อมูล</th>
                      <th>ที่อยู่ IP</th>
                      <th>เบราว์เซอร์ / รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentAuditRows.map(log => (
                      <tr key={log.id}>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {log.created_at ? new Date(log.created_at.endsWith('Z') || log.created_at.includes('+') ? log.created_at : log.created_at + 'Z').toLocaleString('th-TH') : '—'}
                        </td>
                        <td>
                          {log.actor_email ? (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.actor_name || 'ไม่ทราบชื่อ'}</span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.actor_email}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>👤 ระบบ / แขกผู้เข้าชม</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${getActionBadge(log.action)}`}>
                            {getActionLabel(log.action)}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-primary">{log.entity_type}</span>
                        </td>
                        <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                          {log.ip_address || 'ภายใน'}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.user_agent}>
                          {log.user_agent || 'ระบบ'}
                        </td>
                      </tr>
                    ))}
                    {currentAuditRows.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <Shield size={24} style={{ color: 'var(--text-muted)' }} />
                            <span>{auditSearch ? 'ไม่พบข้อมูลบันทึกที่ตรงตามเงื่อนไข' : 'ยังไม่มีบันทึกกิจกรรมในระบบ'}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 12 }}>
                <div style={{ color: 'var(--text-muted)' }}>
                  แสดง {filteredAuditLogs.length > 0 ? indexOfFirstAuditRow + 1 : 0} - {Math.min(indexOfLastAuditRow, filteredAuditLogs.length)} จาก {filteredAuditLogs.length} รายการ
                </div>
                {totalAuditPages > 1 && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: 12, height: 'auto' }} 
                      disabled={auditCurrentPage === 1} 
                      onClick={() => setAuditCurrentPage(p => Math.max(1, p - 1))}
                    >
                      ย้อนกลับ
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px' }}>
                      <span style={{ fontWeight: 600 }}>หน้า {auditCurrentPage} / {totalAuditPages}</span>
                    </div>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: 12, height: 'auto' }} 
                      disabled={auditCurrentPage === totalAuditPages} 
                      onClick={() => setAuditCurrentPage(p => Math.min(totalAuditPages, p + 1))}
                    >
                      ถัดไป
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Floating Bulk Action Bar */}
      {selectedWlIds.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
          zIndex: 9999,
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ 
              background: 'var(--accent)', 
              color: '#ffffff', 
              padding: '2px 8px', 
              borderRadius: 20, 
              fontSize: 11 
            }}>
              {selectedWlIds.length}
            </span>
            <span>รายการที่เลือกอยู่</span>
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }}></div>
          <button 
            type="button" 
            className="btn btn-danger" 
            style={{ padding: '6px 16px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={handleBulkDeleteWl}
          >
            <Trash2 size={13} /> ลบที่เลือก
          </button>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={() => setSelectedWlIds([])}
          >
            ยกเลิก
          </button>
        </div>
      )}
    </div>
  )
}

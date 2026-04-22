
export function StudioDark() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
        .sf2-serif { font-family: 'Playfair Display', Georgia, serif; }
        .sf2-sans  { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="sf2-sans min-h-screen flex" style={{ background: '#131416', color: '#E8E6E2' }}>

        {/* Sidebar — narrow icon + label style */}
        <aside style={{ width: 200, background: '#0D0E10', borderRight: '1px solid #222427', flexShrink: 0 }} className="flex flex-col py-8">
          <div className="px-5 mb-10">
            <div className="sf2-serif" style={{ fontSize: 18, fontWeight: 600, color: '#E8E6E2', letterSpacing: '0.01em' }}>StudioFlow</div>
            <div style={{ fontSize: 10.5, color: '#5A5C62', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>Studio Dashboard</div>
          </div>
          <nav className="flex-1 px-3 space-y-0.5">
            {[
              { label: 'Dashboard', active: true },
              { label: 'Projects' },
              { label: 'Galleries' },
              { label: 'Clients' },
              { label: 'AI Tools' },
              { label: 'Settings' },
            ].map(item => (
              <div key={item.label}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: item.active ? '#C9A96E18' : 'transparent',
                  color: item.active ? '#C9A96E' : '#6A6C72',
                  fontSize: 13,
                  fontWeight: item.active ? 500 : 400,
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                  borderLeft: item.active ? '2px solid #C9A96E' : '2px solid transparent',
                  marginLeft: 0,
                }}
              >
                {item.label}
              </div>
            ))}
          </nav>
          <div className="px-4 mt-4">
            <div style={{ padding: '12px', borderRadius: 8, background: '#18191C', border: '1px solid #222427' }}>
              <div style={{ fontSize: 10.5, color: '#5A5C62', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Studio Plan</div>
              <div style={{ height: 3, background: '#222427', borderRadius: 99, marginBottom: 6 }}>
                <div style={{ width: '42%', height: '100%', background: '#C9A96E', borderRadius: 99 }} />
              </div>
              <div style={{ fontSize: 11.5, color: '#6A6C72' }}>4.2 / 10 GB</div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto">
          {/* Header */}
          <header style={{ borderBottom: '1px solid #1E2024', padding: '12px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#5A5C62' }}>April 22, 2026</span>
              <span style={{ color: '#2E3035', fontSize: 12 }}>·</span>
              <span style={{ fontSize: 12, color: '#5A5C62' }}>4 active projects</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#C9A96E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0D0E10', fontSize: 12, fontWeight: 600 }}>A</div>
              <span style={{ fontSize: 13, color: '#A8A6A2' }}>Alex Rivera</span>
            </div>
          </header>

          <div style={{ padding: '32px 28px' }}>

            {/* Heading */}
            <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, color: '#5A5C62', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Welcome back</div>
                <h1 className="sf2-serif" style={{ fontSize: 34, fontWeight: 600, color: '#E8E6E2', lineHeight: 1, letterSpacing: '-0.01em' }}>Alex Rivera</h1>
              </div>
              <button style={{ background: '#C9A96E', color: '#0D0E10', border: 'none', borderRadius: 6, padding: '9px 16px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em' }}>
                + New Project
              </button>
            </div>

            {/* Featured active project — cinematic panel */}
            <div style={{ borderRadius: 10, marginBottom: 24, border: '1px solid #222427', overflow: 'hidden', background: 'linear-gradient(135deg, #1A1B1F 0%, #131416 100%)', display: 'flex', gap: 0 }}>
              {/* Property image placeholder */}
              <div style={{ width: 220, flexShrink: 0, background: 'linear-gradient(145deg, #2A2B30 0%, #1A1B1F 100%)', position: 'relative', minHeight: 160 }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 30%, rgba(13,14,16,0.7) 100%)' }} />
                <div style={{ position: 'absolute', bottom: 14, left: 14 }}>
                  <div style={{ fontSize: 9.5, color: '#C9A96E', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4, fontWeight: 500 }}>Active Shoot</div>
                  <div className="sf2-serif" style={{ fontSize: 15, color: '#E8E6E2', fontWeight: 500 }}>147 Maple Drive</div>
                  <div style={{ fontSize: 11, color: '#6A6C72', marginTop: 2 }}>Sonoma, CA</div>
                </div>
              </div>
              <div style={{ flex: 1, padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <span style={{ background: '#C9A96E1A', color: '#C9A96E', fontSize: 10.5, fontWeight: 500, borderRadius: 99, padding: '2px 9px', letterSpacing: '0.04em' }}>In Progress</span>
                    <span style={{ background: '#222427', color: '#6A6C72', fontSize: 10.5, borderRadius: 99, padding: '2px 9px' }}>Sarah Chen</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#7A7C82', lineHeight: 1.6 }}>48 photos · 12 edited · 2 AI jobs pending<br />Luxury 3BD / 2BA · Estimated value $1.4M</div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#5A5C62', marginBottom: 5 }}>
                    <span>Delivery progress</span>
                    <span style={{ color: '#C9A96E' }}>65%</span>
                  </div>
                  <div style={{ height: 3, background: '#222427', borderRadius: 99 }}>
                    <div style={{ width: '65%', height: '100%', background: 'linear-gradient(90deg, #C9A96E, #E8C87A)', borderRadius: 99 }} />
                  </div>
                </div>
              </div>
              <div style={{ borderLeft: '1px solid #1E2024', padding: '20px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 140 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#5A5C62', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Next Steps</div>
                  {['Color grade exteriors', 'Sky replacement', 'Deliver gallery'].map((s, i) => (
                    <div key={i} style={{ fontSize: 11.5, color: i === 0 ? '#A8A6A2' : '#4A4C52', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: i === 0 ? '#C9A96E' : '#2E3035', flexShrink: 0 }} />
                      {s}
                    </div>
                  ))}
                </div>
                <button style={{ fontSize: 12, color: '#C9A96E', background: 'none', border: '1px solid #C9A96E30', borderRadius: 6, padding: '7px 12px', cursor: 'pointer', textAlign: 'center' }}>
                  Open Project
                </button>
              </div>
            </div>

            {/* 3-column grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

              {/* Recent projects */}
              <div style={{ gridColumn: '1 / 3' }}>
                <div style={{ fontSize: 11, color: '#5A5C62', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 500 }}>Recent Projects</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[
                    { addr: '218 Ocean Blvd, Malibu', client: 'James Whitfield', status: 'Delivered', color: '#3E8C6A' },
                    { addr: '73 Vista Peak, Sedona', client: 'Priya Sharma', status: 'Editing', color: '#B8860B' },
                    { addr: '901 Lakefront Dr, Tahoe', client: 'Marcus Teller', status: 'Uploading', color: '#5A5C62' },
                  ].map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 7, background: '#18191C', cursor: 'pointer', border: '1px solid #1E2024', marginBottom: 2 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 5, background: `hsl(${210 + i * 30}, 15%, ${20 + i * 5}%)`, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#D8D6D2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.addr}</div>
                        <div style={{ fontSize: 11.5, color: '#5A5C62', marginTop: 1 }}>{p.client}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 500, color: p.color, background: p.color + '18', borderRadius: 99, padding: '2px 9px', whiteSpace: 'nowrap' }}>{p.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#5A5C62', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 500 }}>Client Galleries</div>
                  {['Oakwood Residence', 'Pacific Heights'].map((g, i) => (
                    <div key={i} style={{ padding: '10px 12px', background: '#18191C', borderRadius: 7, border: '1px solid #1E2024', marginBottom: 6 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: '#D8D6D2' }}>{g}</div>
                      <div style={{ fontSize: 11, color: '#5A5C62', marginTop: 2 }}>{i === 0 ? '24 views · 3 days ago' : '11 views · 1 week ago'}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#5A5C62', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 500 }}>AI Tools</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {['Virtual Staging', 'Sky Replace', 'Day to Dusk', 'Declutter'].map((t, i) => (
                      <div key={i} style={{ padding: '9px 10px', background: '#18191C', borderRadius: 7, border: '1px solid #1E2024', cursor: 'pointer', fontSize: 11.5, color: '#8A8C92', fontWeight: 500 }}>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </>
  );
}

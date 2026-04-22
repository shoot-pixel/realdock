
export function StudioLight() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
        .sf-serif { font-family: 'Cormorant Garamond', Georgia, serif; }
        .sf-sans  { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="sf-sans min-h-screen flex" style={{ background: '#F8F6F2', color: '#1C1C1E' }}>

        {/* Sidebar */}
        <aside style={{ width: 220, background: '#EFEDE8', borderRight: '1px solid #E0DDD6', flexShrink: 0 }} className="flex flex-col py-8">
          <div className="px-6 mb-10">
            <span className="sf-serif text-xl font-semibold tracking-wide" style={{ color: '#1C1C1E', letterSpacing: '0.02em' }}>StudioFlow</span>
          </div>
          <nav className="flex-1 px-3 space-y-0.5">
            {[
              { label: 'Dashboard', active: true },
              { label: 'Projects' },
              { label: 'Galleries' },
              { label: 'Clients' },
              { label: 'AI Tools' },
            ].map(item => (
              <div key={item.label}
                style={{
                  padding: '9px 14px',
                  borderRadius: 6,
                  background: item.active ? '#1C1C1E' : 'transparent',
                  color: item.active ? '#FAFAF9' : '#5C5A56',
                  fontSize: 13.5,
                  fontWeight: item.active ? 500 : 400,
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                }}
              >
                {item.label}
              </div>
            ))}
          </nav>
          <div className="px-4 mt-8">
            <div style={{ borderRadius: 8, padding: '14px', background: '#E8E5DF', border: '1px solid #D9D5CD' }}>
              <div style={{ fontSize: 11, color: '#8C8881', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>Storage</div>
              <div style={{ height: 4, background: '#CCC9C2', borderRadius: 99, marginBottom: 6 }}>
                <div style={{ width: '42%', height: '100%', background: '#4D8C7A', borderRadius: 99 }} />
              </div>
              <div style={{ fontSize: 12, color: '#6E6C68' }}>4.2 GB of 10 GB</div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto">
          {/* Top bar */}
          <header style={{ borderBottom: '1px solid #E0DDD6', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8F6F2' }}>
            <div style={{ fontSize: 13, color: '#8C8881' }}>Tuesday, April 22</div>
            <div className="flex items-center gap-3">
              <div style={{ fontSize: 13, color: '#5C5A56' }}>Alex Rivera</div>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#4D8C7A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 500 }}>A</div>
            </div>
          </header>

          <div style={{ padding: '36px 32px', maxWidth: 1100 }}>

            {/* Page heading */}
            <div className="flex items-end justify-between mb-8">
              <div>
                <div style={{ fontSize: 12, color: '#8C8881', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 500 }}>Good morning</div>
                <h1 className="sf-serif" style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.1, color: '#1C1C1E', letterSpacing: '-0.01em' }}>Alex Rivera</h1>
              </div>
              <button style={{ background: '#1C1C1E', color: '#FAFAF9', border: 'none', borderRadius: 6, padding: '10px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', letterSpacing: '0.01em' }}>
                + New Project
              </button>
            </div>

            {/* Active shoot — featured hero panel */}
            <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 28, display: 'flex', height: 180, border: '1px solid #E0DDD6', background: '#EFEDE8' }}>
              <div style={{ width: 260, background: 'linear-gradient(135deg, #3A3A3A 0%, #5C5A56 100%)', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.3, background: 'linear-gradient(180deg, transparent 40%, #1C1C1E 100%)' }} />
                <div style={{ position: 'absolute', bottom: 16, left: 16, color: '#fff' }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 4 }}>Active Shoot</div>
                  <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'Cormorant Garamond, serif' }}>147 Maple Drive</div>
                </div>
              </div>
              <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1C1C1E' }}>147 Maple Drive, Sonoma, CA</span>
                    <span style={{ fontSize: 11, background: '#4D8C7A20', color: '#4D8C7A', borderRadius: 99, padding: '2px 10px', fontWeight: 500 }}>In Progress</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#6E6C68', lineHeight: 1.5 }}>Sarah Chen · 3-bed / 2-bath · Luxury listing<br />48 photos · 12 edited · 2 AI jobs pending</div>
                </div>
                <div className="flex items-center gap-4">
                  <div style={{ flex: 1, height: 3, background: '#E0DDD6', borderRadius: 99 }}>
                    <div style={{ width: '65%', height: '100%', background: '#4D8C7A', borderRadius: 99 }} />
                  </div>
                  <span style={{ fontSize: 11.5, color: '#6E6C68', whiteSpace: 'nowrap' }}>65% delivered</span>
                  <button style={{ fontSize: 12, color: '#4D8C7A', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>View Project →</button>
                </div>
              </div>
            </div>

            {/* Two-column layout */}
            <div className="flex gap-6">

              {/* Left — Recent shoots */}
              <div style={{ flex: '1 1 55%' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 style={{ fontSize: 13, fontWeight: 500, color: '#1C1C1E', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Recent Shoots</h2>
                  <span style={{ fontSize: 12, color: '#8C8881', cursor: 'pointer' }}>See all</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[
                    { address: '218 Ocean Blvd, Malibu', client: 'James Whitfield', status: 'Delivered', count: '62 photos', pct: 100 },
                    { address: '73 Vista Peak, Sedona', client: 'Priya Sharma', status: 'Editing', count: '38 photos', pct: 55 },
                    { address: '901 Lakefront Dr, Tahoe', client: 'Marcus Teller', status: 'Uploading', count: '19 photos', pct: 28 },
                  ].map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 8, background: i === 0 ? '#EFEDE8' : 'transparent', cursor: 'pointer' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 6, background: `hsl(${30 + i * 30}, 20%, ${75 - i * 6}%)`, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500, color: '#1C1C1E', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.address}</div>
                        <div style={{ fontSize: 12, color: '#8C8881' }}>{p.client} · {p.count}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: 11.5, fontWeight: 500, color: p.status === 'Delivered' ? '#4D8C7A' : p.status === 'Editing' ? '#B8860B' : '#8C8881', background: p.status === 'Delivered' ? '#4D8C7A15' : p.status === 'Editing' ? '#B8860B15' : '#E0DDD6', borderRadius: 99, padding: '3px 10px' }}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right column */}
              <div style={{ flex: '1 1 40%', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Client galleries */}
                <div>
                  <h2 style={{ fontSize: 13, fontWeight: 500, color: '#1C1C1E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>Client Galleries</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { name: 'Oakwood Residence', views: '24 views', shared: '3 days ago' },
                      { name: 'Pacific Heights Condo', views: '11 views', shared: '1 week ago' },
                    ].map((g, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 7, border: '1px solid #E0DDD6', background: '#FAFAF8' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#1C1C1E' }}>{g.name}</div>
                          <div style={{ fontSize: 11.5, color: '#8C8881', marginTop: 1 }}>Shared {g.shared}</div>
                        </div>
                        <div style={{ fontSize: 11.5, color: '#4D8C7A', fontWeight: 500 }}>{g.views}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Tools */}
                <div>
                  <h2 style={{ fontSize: 13, fontWeight: 500, color: '#1C1C1E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>AI Tools</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { label: 'Virtual Staging', desc: 'Add furniture' },
                      { label: 'Sky Replace', desc: 'Brighten exteriors' },
                      { label: 'Day to Dusk', desc: 'Twilight effect' },
                      { label: 'Declutter', desc: 'Remove objects' },
                    ].map((t, i) => (
                      <div key={i} style={{ padding: '11px 12px', borderRadius: 7, border: '1px solid #E0DDD6', background: '#FAFAF8', cursor: 'pointer' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#1C1C1E', marginBottom: 2 }}>{t.label}</div>
                        <div style={{ fontSize: 11, color: '#8C8881' }}>{t.desc}</div>
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

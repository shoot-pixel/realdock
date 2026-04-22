
export function SlateEditorial() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');
        .sf3-serif { font-family: 'DM Serif Display', Georgia, serif; }
        .sf3-sans  { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <div className="sf3-sans min-h-screen flex" style={{ background: '#F4F2EE', color: '#2B2926' }}>

        {/* Sidebar — deep evergreen */}
        <aside style={{ width: 210, background: '#1E2A24', flexShrink: 0 }} className="flex flex-col py-8">
          <div className="px-5 mb-10">
            <div className="sf3-serif" style={{ fontSize: 20, color: '#F4F2EE', letterSpacing: '-0.01em' }}>StudioFlow</div>
            <div style={{ width: 24, height: 2, background: '#5A8C6A', borderRadius: 1, marginTop: 8 }} />
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
                  padding: '9px 12px',
                  borderRadius: 5,
                  background: item.active ? 'rgba(90,140,106,0.2)' : 'transparent',
                  color: item.active ? '#A8D4B4' : '#6A8472',
                  fontSize: 13.5,
                  fontWeight: item.active ? 500 : 400,
                  cursor: 'pointer',
                }}
              >
                {item.label}
              </div>
            ))}
          </nav>
          <div className="px-4">
            <div style={{ padding: '14px', borderRadius: 8, background: '#162018', border: '1px solid #2A3A2E' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#5A7A64', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Storage</span>
                <span style={{ fontSize: 11, color: '#6A8472' }}>42%</span>
              </div>
              <div style={{ height: 3, background: '#2A3A2E', borderRadius: 99 }}>
                <div style={{ width: '42%', height: '100%', background: '#5A8C6A', borderRadius: 99 }} />
              </div>
              <div style={{ fontSize: 11.5, color: '#4A6454', marginTop: 6 }}>4.2 GB of 10 GB</div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">

          {/* Header */}
          <header style={{ padding: '14px 32px', borderBottom: '1px solid #E4E0D8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F4F2EE' }}>
            <div style={{ display: 'flex', gap: 24 }}>
              <span style={{ fontSize: 13, color: '#8C8880' }}>April 22, 2026</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button style={{ fontSize: 12.5, color: '#2B2926', background: '#E4E0D8', border: 'none', borderRadius: 5, padding: '7px 14px', cursor: 'pointer', fontWeight: 500 }}>
                + New Project
              </button>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#1E2A24', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A8D4B4', fontSize: 12.5, fontWeight: 600 }}>A</div>
            </div>
          </header>

          <div style={{ padding: '32px 32px 40px', maxWidth: 1060 }}>

            {/* Greeting — editorial style */}
            <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #E4E0D8' }}>
              <div style={{ fontSize: 11, color: '#9C9890', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 500 }}>Studio Overview · April 22</div>
              <h1 className="sf3-serif" style={{ fontSize: 40, color: '#2B2926', lineHeight: 1, marginBottom: 10, fontWeight: 400 }}>Good morning, Alex.</h1>
              <p style={{ fontSize: 14, color: '#7C7870', lineHeight: 1.6 }}>You have <strong style={{ color: '#2B2926', fontWeight: 500 }}>4 active projects</strong> and <strong style={{ color: '#2B2926', fontWeight: 500 }}>2 galleries</strong> awaiting client review.</p>
            </div>

            {/* Editorial grid — magazine-style columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>

              {/* Hero column — active project */}
              <div style={{ gridColumn: '1 / 3' }}>
                <div style={{ fontSize: 10.5, color: '#9C9890', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14, fontWeight: 500 }}>Active Project</div>
                <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #E4E0D8', background: '#FDFCF9' }}>
                  <div style={{ height: 140, background: 'linear-gradient(135deg, #2B3A32 0%, #3D4E44 50%, #2A3A2E 100%)', position: 'relative' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(43,41,38,0.6) 100%)' }} />
                    <div style={{ position: 'absolute', bottom: 16, left: 20, right: 16 }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Sonoma, CA</div>
                      <div className="sf3-serif" style={{ fontSize: 22, color: '#F4F2EE', fontWeight: 400 }}>147 Maple Drive</div>
                    </div>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: '#1E2A24', background: '#1E2A2415', borderRadius: 4, padding: '3px 8px' }}>In Progress</span>
                      <span style={{ fontSize: 11, color: '#7C7870', background: '#F0EDE7', borderRadius: 4, padding: '3px 8px' }}>Sarah Chen</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#6C6A66', lineHeight: 1.5, marginBottom: 12 }}>
                      48 photos · 12 edited · 2 AI jobs pending<br />
                      Luxury 3-bed / 2-bath · Delivery due Friday
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 5 }}>
                        <span style={{ color: '#9C9890' }}>Delivery progress</span>
                        <span style={{ color: '#1E2A24', fontWeight: 500 }}>65%</span>
                      </div>
                      <div style={{ height: 3, background: '#E4E0D8', borderRadius: 99 }}>
                        <div style={{ width: '65%', height: '100%', background: '#1E2A24', borderRadius: 99 }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent shoots — list editorial style */}
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 10.5, color: '#9C9890', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 500 }}>Recent Shoots</div>
                  <div style={{ background: '#FDFCF9', borderRadius: 8, border: '1px solid #E4E0D8', overflow: 'hidden' }}>
                    {[
                      { addr: '218 Ocean Blvd, Malibu', client: 'James Whitfield', status: 'Delivered', photos: '62' },
                      { addr: '73 Vista Peak, Sedona', client: 'Priya Sharma', status: 'Editing', photos: '38' },
                      { addr: '901 Lakefront Dr, Tahoe', client: 'Marcus Teller', status: 'Uploading', photos: '19' },
                    ].map((p, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px', borderBottom: i < 2 ? '1px solid #EEE9E2' : 'none', cursor: 'pointer' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 5, background: `hsl(${35 + i * 20}, ${20 - i * 3}%, ${82 - i * 8}%)`, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 500, color: '#2B2926', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.addr}</div>
                          <div style={{ fontSize: 12, color: '#9C9890', marginTop: 1 }}>{p.client} · {p.photos} photos</div>
                        </div>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 500,
                          color: p.status === 'Delivered' ? '#1E5C3A' : p.status === 'Editing' ? '#6B4A0E' : '#5A5855',
                          background: p.status === 'Delivered' ? '#D4EDD8' : p.status === 'Editing' ? '#FAECCC' : '#EEEBE5',
                          borderRadius: 4, padding: '3px 9px',
                        }}>
                          {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Stats — vertical summary */}
                <div>
                  <div style={{ fontSize: 10.5, color: '#9C9890', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 500 }}>At a Glance</div>
                  <div style={{ background: '#FDFCF9', border: '1px solid #E4E0D8', borderRadius: 8, overflow: 'hidden' }}>
                    {[
                      { label: 'Active Projects', value: '4' },
                      { label: 'Media Assets', value: '847' },
                      { label: 'Galleries Shared', value: '6' },
                      { label: 'AI Jobs / Month', value: '18' },
                    ].map((s, i) => (
                      <div key={i} style={{ padding: '11px 16px', borderBottom: i < 3 ? '1px solid #EEE9E2' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12.5, color: '#6C6A66' }}>{s.label}</span>
                        <span className="sf3-serif" style={{ fontSize: 18, color: '#2B2926', fontWeight: 400 }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Galleries */}
                <div>
                  <div style={{ fontSize: 10.5, color: '#9C9890', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 500 }}>Client Galleries</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { name: 'Oakwood Residence', views: '24 views', ago: '3d ago' },
                      { name: 'Pacific Heights Condo', views: '11 views', ago: '1w ago' },
                    ].map((g, i) => (
                      <div key={i} style={{ padding: '11px 14px', background: '#FDFCF9', border: '1px solid #E4E0D8', borderRadius: 7, cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#2B2926' }}>{g.name}</span>
                          <span style={{ fontSize: 11, color: '#1E5C3A', fontWeight: 500 }}>{g.views}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: '#9C9890', marginTop: 2 }}>Shared {g.ago}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Tools */}
                <div>
                  <div style={{ fontSize: 10.5, color: '#9C9890', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 500 }}>AI Tools</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                    {[
                      { label: 'Virtual Staging', icon: '◻' },
                      { label: 'Sky Replace', icon: '◇' },
                      { label: 'Day to Dusk', icon: '◑' },
                      { label: 'Declutter', icon: '○' },
                    ].map((t, i) => (
                      <div key={i} style={{ padding: '10px 11px', background: '#FDFCF9', border: '1px solid #E4E0D8', borderRadius: 7, cursor: 'pointer' }}>
                        <div style={{ fontSize: 12, color: '#1E2A24', marginBottom: 1 }}>{t.icon}</div>
                        <div style={{ fontSize: 12, color: '#4C4A46', fontWeight: 500, lineHeight: 1.3 }}>{t.label}</div>
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

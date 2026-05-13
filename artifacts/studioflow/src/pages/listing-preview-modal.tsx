import { useState, useEffect, useCallback } from "react";
import { useGenerateListingPreview } from "@workspace/api-client-react";
import type { ListingPreview } from "@workspace/api-client-react";
import { X, ChevronLeft, ChevronRight, Sparkles, Loader2, Bed, Bath, Maximize2, MapPin, Check } from "lucide-react";

// ─── Mini photo carousel ───────────────────────────────────────────────────

function PhotoCarousel({ photos, aspectRatio = "aspect-[16/9]" }: { photos: string[]; aspectRatio?: string }) {
  const [idx, setIdx] = useState(0);
  const prev = useCallback(() => setIdx(i => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIdx(i => Math.min(photos.length - 1, i + 1)), [photos.length]);

  if (!photos.length) return null;
  return (
    <div className={`relative w-full ${aspectRatio} overflow-hidden bg-gray-100`}>
      <img src={photos[idx]} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
      {photos.length > 1 && (
        <>
          <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
            <button
              onClick={e => { e.stopPropagation(); prev(); }}
              disabled={idx === 0}
              className="pointer-events-auto w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 disabled:opacity-30 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); next(); }}
              disabled={idx === photos.length - 1}
              className="pointer-events-auto w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 disabled:opacity-30 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute bottom-2 right-3 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded-full tabular-nums">
            {idx + 1} / {photos.length}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Platform tabs ─────────────────────────────────────────────────────────

function ZillowTab({ data }: { data: ListingPreview }) {
  return (
    <div className="bg-white text-gray-900 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Nav bar */}
      <div className="bg-[#006AFF] px-4 py-3 flex items-center gap-2">
        <span className="text-white font-black text-xl tracking-tight select-none">Z</span>
        <span className="text-white font-bold text-base">zillow</span>
      </div>

      {/* Photo */}
      <PhotoCarousel photos={data.photoUrls} />

      {/* Details */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <p className="text-3xl font-bold text-gray-900">{data.suggestedPrice}</p>
            <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>{data.address}</span>
            </div>
          </div>
          <span className="shrink-0 text-[11px] font-semibold bg-[#006AFF]/10 text-[#006AFF] border border-[#006AFF]/20 rounded px-2 py-1">Zestimate®</span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 py-3 border-y border-gray-100 mb-4 text-sm text-gray-700">
          <div className="flex items-center gap-1.5">
            <Bed className="w-4 h-4 text-gray-400" />
            <span className="font-semibold">{data.bedrooms ?? "—"}</span>
            <span className="text-gray-400 text-xs">bds</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bath className="w-4 h-4 text-gray-400" />
            <span className="font-semibold">{data.bathrooms ?? "—"}</span>
            <span className="text-gray-400 text-xs">ba</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Maximize2 className="w-4 h-4 text-gray-400" />
            <span className="font-semibold">{data.squareFeet ?? "—"}</span>
            <span className="text-gray-400 text-xs">sqft</span>
          </div>
          <span className="ml-auto text-[11px] bg-green-50 text-green-700 border border-green-200 rounded px-2 py-0.5 font-medium">For Sale</span>
        </div>

        <h2 className="text-base font-bold text-gray-900 mb-2">{data.headline}</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">{data.description}</p>

        <div className="space-y-2 mb-5">
          {data.highlights.slice(0, 6).map((h, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <Check className="w-4 h-4 text-[#006AFF] shrink-0 mt-0.5" />
              <span>{h}</span>
            </div>
          ))}
        </div>

        <button className="w-full bg-[#006AFF] hover:bg-[#0055CC] text-white font-semibold py-3 rounded-lg text-sm transition">
          Contact Agent
        </button>
      </div>
    </div>
  );
}

function RedfinTab({ data }: { data: ListingPreview }) {
  return (
    <div className="bg-white text-gray-900 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Nav bar */}
      <div className="bg-[#CC0000] px-4 py-3 flex items-center gap-2">
        <span className="text-white font-black text-lg select-none">redfin</span>
      </div>

      {/* For Sale badge + Photo */}
      <div className="relative">
        <PhotoCarousel photos={data.photoUrls} />
        <span className="absolute top-3 left-3 bg-[#CC0000] text-white text-[11px] font-bold px-2.5 py-1 rounded">
          FOR SALE
        </span>
      </div>

      <div className="p-5">
        <p className="text-3xl font-bold text-gray-900 mb-1">{data.suggestedPrice}</p>
        <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>{data.address}</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg mb-4 text-center">
          {[
            { label: "Beds", val: data.bedrooms ?? "—" },
            { label: "Baths", val: data.bathrooms ?? "—" },
            { label: "Sq Ft", val: data.squareFeet ?? "—" },
          ].map(({ label, val }) => (
            <div key={label}>
              <p className="text-base font-bold text-gray-900">{String(val)}</p>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>

        <h2 className="text-base font-bold text-gray-900 mb-2">{data.headline}</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">{data.description}</p>

        <div className="space-y-2 mb-5">
          {data.highlights.slice(0, 6).map((h, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <div className="w-4 h-4 rounded-full bg-[#CC0000]/10 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#CC0000]" />
              </div>
              <span>{h}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button className="flex-1 bg-[#CC0000] hover:bg-[#AA0000] text-white font-semibold py-3 rounded-lg text-sm transition">
            Schedule Tour
          </button>
          <button className="flex-1 border border-[#CC0000] text-[#CC0000] hover:bg-red-50 font-semibold py-3 rounded-lg text-sm transition">
            Contact Agent
          </button>
        </div>
      </div>
    </div>
  );
}

function RealtorTab({ data }: { data: ListingPreview }) {
  const mainPhoto = data.photoUrls[0];
  const secondaryPhotos = data.photoUrls.slice(1, 3);

  return (
    <div className="bg-white text-gray-900 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Nav bar */}
      <div className="bg-[#D92228] px-4 py-3">
        <span className="text-white font-black text-base select-none tracking-wide">realtor.com®</span>
      </div>

      {/* Photo grid */}
      {mainPhoto && (
        <div className="relative">
          {secondaryPhotos.length >= 2 ? (
            <div className="grid grid-cols-3 gap-0.5 bg-black">
              <div className="col-span-2 aspect-[4/3] overflow-hidden relative">
                <img src={mainPhoto} alt="Main" className="w-full h-full object-cover" />
                <span className="absolute top-2 left-2 bg-[#D92228] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  NEW LISTING
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="aspect-[3/2] overflow-hidden">
                  <img src={secondaryPhotos[0]} alt="2" className="w-full h-full object-cover" />
                </div>
                <div className="aspect-[3/2] overflow-hidden">
                  <img src={secondaryPhotos[1]} alt="3" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <PhotoCarousel photos={data.photoUrls} />
              <span className="absolute top-3 left-3 bg-[#D92228] text-white text-[10px] font-bold px-2.5 py-1 rounded">
                NEW LISTING
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-3xl font-bold text-gray-900">{data.suggestedPrice}</p>
          <span className="text-xs bg-[#D92228]/10 text-[#D92228] border border-[#D92228]/20 font-semibold px-2 py-0.5 rounded">Active</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>{data.address}</span>
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
          <span><strong>{data.bedrooms ?? "—"}</strong> bd</span>
          <span className="text-gray-200">|</span>
          <span><strong>{data.bathrooms ?? "—"}</strong> ba</span>
          <span className="text-gray-200">|</span>
          <span><strong>{data.squareFeet ?? "—"}</strong> sqft</span>
        </div>

        <h2 className="text-base font-bold text-gray-900 mb-2">{data.headline}</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">{data.description}</p>

        <div className="space-y-2 mb-5">
          {data.highlights.slice(0, 6).map((h, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
              <Check className="w-4 h-4 text-[#D92228] shrink-0 mt-0.5" />
              <span>{h}</span>
            </div>
          ))}
        </div>

        <button className="w-full bg-[#D92228] hover:bg-[#B51E22] text-white font-semibold py-3 rounded-lg text-sm transition">
          Request a Tour
        </button>
      </div>
    </div>
  );
}

function CompassTab({ data }: { data: ListingPreview }) {
  return (
    <div className="bg-white text-gray-900 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      {/* Nav bar — minimal black */}
      <div className="bg-black px-5 py-3 flex items-center justify-between">
        <span className="text-white font-bold text-base tracking-[0.15em] select-none">COMPASS</span>
        <span className="text-gray-400 text-xs tracking-widest">EXCLUSIVE</span>
      </div>

      {/* Full-width hero */}
      <div className="relative w-full aspect-[16/9] overflow-hidden">
        {data.photoUrls[0] ? (
          <img src={data.photoUrls[0]} alt="Hero" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-100" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <p className="text-white text-4xl font-light tracking-tight">{data.suggestedPrice}</p>
        </div>
      </div>

      {/* Secondary photos strip */}
      {data.photoUrls.length > 1 && (
        <div className="grid grid-cols-4 gap-0.5 bg-black">
          {data.photoUrls.slice(1, 5).map((url, i) => (
            <div key={i} className="aspect-square overflow-hidden">
              <img src={url} alt={`${i + 2}`} className="w-full h-full object-cover hover:opacity-90 transition cursor-pointer" />
            </div>
          ))}
        </div>
      )}

      <div className="p-6">
        <div className="flex items-center gap-1.5 text-gray-400 text-sm mb-4">
          <MapPin className="w-3.5 h-3.5" />
          <span className="font-medium tracking-wide">{data.address.toUpperCase()}</span>
        </div>

        <div className="flex items-center gap-6 pb-5 border-b border-gray-100 mb-5 text-sm">
          <div className="text-center">
            <p className="text-xl font-light text-gray-900">{data.bedrooms ?? "—"}</p>
            <p className="text-[11px] text-gray-400 tracking-widest">BEDS</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-light text-gray-900">{data.bathrooms ?? "—"}</p>
            <p className="text-[11px] text-gray-400 tracking-widest">BATHS</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-light text-gray-900">{data.squareFeet ?? "—"}</p>
            <p className="text-[11px] text-gray-400 tracking-widest">SQ FT</p>
          </div>
        </div>

        <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-2xl font-semibold text-gray-900 mb-4 leading-snug">
          {data.headline}
        </h2>

        <p className="text-sm text-gray-500 leading-relaxed mb-5" style={{ fontFamily: "Georgia, serif" }}>
          {data.description}
        </p>

        <div className="space-y-2.5 mb-6">
          {data.highlights.slice(0, 6).map((h, i) => (
            <div key={i} className="flex items-start gap-3 text-sm text-gray-600">
              <div className="w-px h-4 bg-black shrink-0 mt-0.5" />
              <span>{h}</span>
            </div>
          ))}
        </div>

        <button className="w-full bg-black hover:bg-gray-900 text-white font-medium py-3.5 rounded text-sm tracking-wider transition">
          INQUIRE
        </button>
      </div>
    </div>
  );
}

// ─── Loading skeleton ──────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-48 bg-white/10 rounded-xl" />
      <div className="space-y-3 p-4">
        <div className="h-8 w-40 bg-white/10 rounded" />
        <div className="h-4 w-56 bg-white/8 rounded" />
        <div className="h-4 w-full bg-white/8 rounded" />
        <div className="h-4 w-5/6 bg-white/8 rounded" />
        <div className="h-4 w-4/5 bg-white/8 rounded" />
      </div>
    </div>
  );
}

// ─── Platform tab config ───────────────────────────────────────────────────

const PLATFORMS = [
  { key: "zillow",   label: "Zillow",       color: "#006AFF" },
  { key: "redfin",   label: "Redfin",       color: "#CC0000" },
  { key: "realtor",  label: "Realtor.com",  color: "#D92228" },
  { key: "compass",  label: "Compass",      color: "#000000" },
] as const;

type PlatformKey = typeof PLATFORMS[number]["key"];

// ─── Main modal ────────────────────────────────────────────────────────────

interface Props {
  token: string;
  onClose: () => void;
}

export default function ListingPreviewModal({ token, onClose }: Props) {
  const [activePlatform, setActivePlatform] = useState<PlatformKey>("zillow");

  const { data, isPending, isError, mutate } = useGenerateListingPreview();

  useEffect(() => {
    mutate({ token });
  }, [token, mutate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const activePlatformMeta = PLATFORMS.find(p => p.key === activePlatform)!;

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex flex-col" data-testid="listing-preview-modal">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">AI Listing Preview</p>
            {data && <p className="text-[11px] text-white/40 leading-tight">{data.address}</p>}
          </div>
        </div>
        <button
          onClick={onClose}
          data-testid="button-close-listing-preview"
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Platform tab bar */}
      <div className="flex items-center gap-1 px-5 sm:px-8 py-3 border-b border-white/10 overflow-x-auto shrink-0">
        <span className="text-[11px] text-white/30 uppercase tracking-widest mr-3 whitespace-nowrap">Preview as:</span>
        {PLATFORMS.map(p => (
          <button
            key={p.key}
            onClick={() => setActivePlatform(p.key)}
            style={activePlatform === p.key ? { backgroundColor: p.color, color: "#fff" } : {}}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activePlatform === p.key
                ? "shadow-lg"
                : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
        {isPending && (
          <div className="ml-auto flex items-center gap-1.5 text-white/40 text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Generating with AI…</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          {isPending && <LoadingSkeleton />}

          {isError && (
            <div className="text-center py-20">
              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-white/30" />
              </div>
              <p className="text-white/50 text-sm">Could not generate listing preview. Please try again.</p>
              <button
                onClick={() => mutate({ token })}
                className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition"
              >
                Retry
              </button>
            </div>
          )}

          {data && !isPending && (
            <>
              {activePlatform === "zillow"  && <ZillowTab  data={data} />}
              {activePlatform === "redfin"  && <RedfinTab  data={data} />}
              {activePlatform === "realtor" && <RealtorTab data={data} />}
              {activePlatform === "compass" && <CompassTab data={data} />}

              <p className="text-center text-[10px] text-white/20 mt-6">
                AI-generated mockup — not affiliated with {activePlatformMeta.label} · Powered by RealDock
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

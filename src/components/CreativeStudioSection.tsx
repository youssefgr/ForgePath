import React, { useState } from 'react';
import { Download, Image as ImageIcon, Loader2, Music, Volume2 } from 'lucide-react';

interface CreativeStudioSectionProps {
  isOnline: boolean;
  activeGameTrackUrl: string | null;
  onSelectGameTrack: (url: string) => void;
}

type StudioTab = 'artwork' | 'soundtrack';
type ImageResolution = '1K' | '2K' | '4K';
type AspectOption = '16:9' | '4:3' | '1:1';
type MusicMode = 'clip' | 'pro';

interface GeneratedImageItem {
  id: number;
  prompt: string;
  imageUrl: string;
  imageSize: ImageResolution;
  aspectRatio: AspectOption;
}

interface GeneratedTrackItem {
  id: number;
  prompt: string;
  audioDataUrl: string;
  notes: string;
  model: string;
}

const ARTWORK_PRESETS = [
  'Isometric brutalist sci-fi game arena with obsidian platforms and warm amber lighting',
  'Sleek matte-black cross-platform mobile and web architecture mockup on basalt stone',
  'Procedural low-poly mountain terrain wireframe glowing in brushed gold on matte black',
];

const MUSIC_PRESETS = [
  'Driving dark synthwave tactical arena boss loop with crisp percussion and warm analog bass',
  'Minimalist ambient electronic deep-focus coding soundtrack with warm Rhodes chords and soft pulse',
  'Heroic orchestral hybrid game menu theme with brass swells and subtle ticking arpeggio',
];

export const CreativeStudioSection: React.FC<CreativeStudioSectionProps> = ({
  isOnline,
  activeGameTrackUrl,
  onSelectGameTrack,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('artwork');

  // High-res image generator state (gemini-3-pro-image-preview)
  const [imagePrompt, setImagePrompt] = useState(ARTWORK_PRESETS[0]);
  const [imageSize, setImageSize] = useState<ImageResolution>('2K');
  const [aspectRatio, setAspectRatio] = useState<AspectOption>('16:9');
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageItem[]>([]);

  // Music generator state (lyria-3-clip-preview / lyria-3-pro-preview)
  const [musicPrompt, setMusicPrompt] = useState(MUSIC_PRESETS[0]);
  const [musicMode, setMusicMode] = useState<MusicMode>('clip');
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicError, setMusicError] = useState<string | null>(null);
  const [generatedTracks, setGeneratedTracks] = useState<GeneratedTrackItem[]>([]);

  const handleGenerateImage = async (e: React.FormEvent) => {
    e.preventDefault();
    setImageError(null);
    if (imagePrompt.trim().length < 5) {
      setImageError('Describe the showcase visual in at least 5 characters.');
      return;
    }
    if (!isOnline) {
      setImageError('Visual asset generation requires an active internet connection.');
      return;
    }

    setImageLoading(true);
    try {
      const res = await fetch('/api/studio/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt.trim(),
          imageSize,
          aspectRatio,
        }),
      });
      const data = (await res.json()) as {
        imageUrl?: string;
        imageSize?: ImageResolution;
        aspectRatio?: AspectOption;
        error?: string;
      };
      if (!res.ok || !data.imageUrl) {
        throw new Error(data.error || 'Failed to generate high-resolution visual.');
      }
      setGeneratedImages((prev) => [
        {
          id: Date.now(),
          prompt: imagePrompt.trim(),
          imageUrl: data.imageUrl!,
          imageSize: data.imageSize ?? imageSize,
          aspectRatio: data.aspectRatio ?? aspectRatio,
        },
        ...prev,
      ]);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Image generation failed.');
    } finally {
      setImageLoading(false);
    }
  };

  const handleGenerateMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    setMusicError(null);
    if (musicPrompt.trim().length < 5) {
      setMusicError('Describe the soundtrack mood or instrumentation in at least 5 characters.');
      return;
    }
    if (!isOnline) {
      setMusicError('Music generation requires an active internet connection.');
      return;
    }

    setMusicLoading(true);
    try {
      const res = await fetch('/api/studio/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: musicPrompt.trim(),
          mode: musicMode,
        }),
      });
      const data = (await res.json()) as {
        audioDataUrl?: string;
        notes?: string;
        model?: string;
        error?: string;
      };
      if (!res.ok || !data.audioDataUrl) {
        throw new Error(data.error || 'Failed to compose soundtrack.');
      }
      setGeneratedTracks((prev) => [
        {
          id: Date.now(),
          prompt: musicPrompt.trim(),
          audioDataUrl: data.audioDataUrl!,
          notes: data.notes ?? '',
          model: data.model ?? (musicMode === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview'),
        },
        ...prev,
      ]);
    } catch (err) {
      setMusicError(err instanceof Error ? err.message : 'Music generation failed.');
    } finally {
      setMusicLoading(false);
    }
  };

  return (
    <section id="studio" className="border-t border-white/[0.08] py-20 lg:py-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-amber-400">05. Creative Asset &amp; Audio Lab</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#F4F4F6] sm:text-4xl">
              Portfolio Media &amp; Game Soundtrack Studio
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Generate high-resolution project cover visuals in 1K, 2K, or 4K resolution and compose bespoke 30-second game loops or full-length focus soundtracks for your portfolio and playable demos.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Creative studio mode"
            className="flex max-w-full flex-wrap items-center gap-1.5 self-start rounded-xl border border-white/[0.08] bg-[#12141A] p-1.5 lg:self-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'artwork'}
              onClick={() => setActiveTab('artwork')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'artwork'
                  ? 'bg-amber-500 text-[#0A0B0E] font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Visual Assets (1K–4K)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'soundtrack'}
              onClick={() => setActiveTab('soundtrack')}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'soundtrack'
                  ? 'bg-amber-500 text-[#0A0B0E] font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <Music className="h-3.5 w-3.5" aria-hidden="true" />
              Soundtrack Composer
            </button>
          </div>
        </div>

        {/* TAB 1: HIGH-RESOLUTION IMAGE STUDIO */}
        {activeTab === 'artwork' && (
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
            <form
              onSubmit={handleGenerateImage}
              className="rounded-xl border border-white/[0.08] bg-[#12141A] p-6 lg:col-span-5"
            >
              <label htmlFor="studio-img-prompt" className="block text-xs font-medium text-zinc-300">
                Project Cover or Concept Art Prompt
              </label>
              <textarea
                id="studio-img-prompt"
                rows={4}
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {ARTWORK_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImagePrompt(preset)}
                    className="rounded-md border border-white/10 bg-[#0A0B0E] px-2.5 py-1 text-[11px] text-zinc-400 hover:border-amber-500/40 hover:text-zinc-200 cursor-pointer"
                  >
                    Preset 0{idx + 1}
                  </button>
                ))}
              </div>

              {/* Explicit Resolution Selector: 1K, 2K, 4K */}
              <div className="mt-5">
                <p className="text-xs font-medium text-zinc-300">Output Resolution</p>
                <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Image resolution">
                  {(['1K', '2K', '4K'] as ImageResolution[]).map((size) => (
                    <button
                      key={size}
                      type="button"
                      role="radio"
                      aria-checked={imageSize === size}
                      onClick={() => setImageSize(size)}
                      className={`rounded-lg border py-2 font-mono text-xs font-semibold transition-colors cursor-pointer ${
                        imageSize === size
                          ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                          : 'border-white/10 bg-[#0A0B0E] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-medium text-zinc-300">Aspect Ratio</p>
                <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Aspect ratio">
                  {(['16:9', '4:3', '1:1'] as AspectOption[]).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      role="radio"
                      aria-checked={aspectRatio === ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`rounded-lg border py-2 font-mono text-xs font-medium transition-colors cursor-pointer ${
                        aspectRatio === ratio
                          ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                          : 'border-white/10 bg-[#0A0B0E] text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              {imageError && (
                <p role="alert" className="mt-3 text-xs font-medium text-rose-400">
                  {imageError}
                </p>
              )}

              <button
                type="submit"
                disabled={imageLoading}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-[#0A0B0E] transition-colors hover:bg-amber-400 disabled:opacity-60 cursor-pointer"
              >
                {imageLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Rendering {imageSize} Visual…
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4" aria-hidden="true" />
                    Generate {imageSize} Artwork
                  </>
                )}
              </button>
            </form>

            <div className="rounded-xl border border-white/[0.08] bg-[#12141A] p-6 lg:col-span-7">
              {generatedImages.length === 0 ? (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
                  <ImageIcon className="h-8 w-8 text-zinc-600" aria-hidden="true" />
                  <p className="mt-3 font-display text-base font-semibold text-zinc-200">
                    High-Resolution Showcase Canvas
                  </p>
                  <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-500">
                    Choose 1K, 2K, or 4K resolution and generate project headers, level concept art, or architecture illustrations directly for your portfolio.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {generatedImages.map((img) => (
                    <div key={img.id} className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#0A0B0E]">
                      <img
                        src={img.imageUrl}
                        alt={img.prompt}
                        referrerPolicy="no-referrer"
                        className="w-full object-cover"
                      />
                      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-xs text-amber-400">
                            {img.imageSize} · {img.aspectRatio}
                          </p>
                          <p className="mt-1 truncate text-xs text-zinc-300">{img.prompt}</p>
                        </div>
                        <a
                          href={img.imageUrl}
                          download={`forgepath-${img.imageSize.toLowerCase()}-${img.id}.png`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:border-amber-500/40 hover:text-white whitespace-nowrap"
                        >
                          <Download className="h-3.5 w-3.5" aria-hidden="true" />
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LYRIA MUSIC & GAME SOUNDTRACK COMPOSER */}
        {activeTab === 'soundtrack' && (
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
            <form
              onSubmit={handleGenerateMusic}
              className="rounded-xl border border-white/[0.08] bg-[#12141A] p-6 lg:col-span-5"
            >
              <label htmlFor="studio-music-prompt" className="block text-xs font-medium text-zinc-300">
                Soundtrack Direction &amp; Instrumentation
              </label>
              <textarea
                id="studio-music-prompt"
                rows={4}
                value={musicPrompt}
                onChange={(e) => setMusicPrompt(e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {MUSIC_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMusicPrompt(preset)}
                    className="rounded-md border border-white/10 bg-[#0A0B0E] px-2.5 py-1 text-[11px] text-zinc-400 hover:border-amber-500/40 hover:text-zinc-200 cursor-pointer"
                  >
                    Preset 0{idx + 1}
                  </button>
                ))}
              </div>

              <div className="mt-5">
                <p className="text-xs font-medium text-zinc-300">Track Format</p>
                <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Music track length">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={musicMode === 'clip'}
                    onClick={() => setMusicMode('clip')}
                    className={`rounded-lg border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                      musicMode === 'clip'
                        ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                        : 'border-white/10 bg-[#0A0B0E] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <p className="text-xs font-semibold">30s Game Loop</p>
                    <p className="mt-0.5 font-mono text-[10px] opacity-75">Lyria Clip</p>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={musicMode === 'pro'}
                    onClick={() => setMusicMode('pro')}
                    className={`rounded-lg border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                      musicMode === 'pro'
                        ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                        : 'border-white/10 bg-[#0A0B0E] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <p className="text-xs font-semibold">Full-Length Track</p>
                    <p className="mt-0.5 font-mono text-[10px] opacity-75">Lyria Pro</p>
                  </button>
                </div>
              </div>

              {musicError && (
                <p role="alert" className="mt-3 text-xs font-medium text-rose-400">
                  {musicError}
                </p>
              )}

              <button
                type="submit"
                disabled={musicLoading}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-[#0A0B0E] transition-colors hover:bg-amber-400 disabled:opacity-60 cursor-pointer"
              >
                {musicLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Composing Soundtrack…
                  </>
                ) : (
                  <>
                    <Music className="h-4 w-4" aria-hidden="true" />
                    Generate {musicMode === 'pro' ? 'Full Track' : '30s Clip'}
                  </>
                )}
              </button>
            </form>

            <div className="rounded-xl border border-white/[0.08] bg-[#12141A] p-6 lg:col-span-7">
              {generatedTracks.length === 0 ? (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
                  <Volume2 className="h-8 w-8 text-zinc-600" aria-hidden="true" />
                  <p className="mt-3 font-display text-base font-semibold text-zinc-200">
                    Game Audio &amp; Focus Track Deck
                  </p>
                  <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-500">
                    Compose original audio loops with Lyria Clip (30s) or full-length soundtracks with Lyria Pro, then play them here or assign them directly as the Shard Breaker arena soundtrack.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {generatedTracks.map((track) => {
                    const isAssigned = activeGameTrackUrl === track.audioDataUrl;
                    return (
                      <div
                        key={track.id}
                        className="rounded-lg border border-white/[0.08] bg-[#0A0B0E] p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-mono text-xs text-amber-400">{track.model}</p>
                          <button
                            type="button"
                            onClick={() => onSelectGameTrack(track.audioDataUrl)}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                              isAssigned
                                ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                                : 'border-white/12 text-zinc-300 hover:border-amber-500/40 hover:text-white'
                            }`}
                          >
                            {isAssigned ? 'Active in Shard Breaker' : 'Use as Arcade Soundtrack'}
                          </button>
                        </div>

                        <p className="mt-2 text-sm text-zinc-200">{track.prompt}</p>

                        <audio
                          controls
                          src={track.audioDataUrl}
                          className="mt-4 w-full"
                        />

                        {track.notes && (
                          <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-zinc-400">
                            {track.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

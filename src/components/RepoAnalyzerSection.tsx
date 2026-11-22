import React, { useMemo, useState } from 'react';
import { ExternalLink, GitBranch, Loader2, Search, Trash2 } from 'lucide-react';
import {
  parseGitHubRepoUrl,
  type RepoCategory,
  type RepositoryInsight,
} from '../utils/portfolioLogic';

interface RepoAnalyzerSectionProps {
  repositories: RepositoryInsight[];
  isOnline: boolean;
  onAnalyzeRepo: (repoUrl: string, category: RepoCategory) => Promise<RepositoryInsight>;
  onRemoveRepo: (id: number) => Promise<void>;
}

const CATEGORY_LABELS: Record<RepoCategory, string> = {
  csharp_game: 'C# Game Dev',
  web: 'Web Dev',
  mobile: 'Mobile Dev',
};

export const RepoAnalyzerSection: React.FC<RepoAnalyzerSectionProps> = ({
  repositories,
  isOnline,
  onAnalyzeRepo,
  onRemoveRepo,
}) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [category, setCategory] = useState<RepoCategory>('csharp_game');
  const [filter, setFilter] = useState<'all' | RepoCategory>('all');
  const [analyzing, setAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const filteredRepos = useMemo(() => {
    if (filter === 'all') return repositories;
    return repositories.filter((r) => r.category === filter);
  }, [repositories, filter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const parsed = parseGitHubRepoUrl(repoUrl);
    if (!parsed) {
      setErrorMsg('Enter a valid public GitHub repository URL, such as https://github.com/owner/repository');
      return;
    }

    if (!isOnline) {
      setErrorMsg('You are currently offline. Reconnect to inspect live GitHub codebases.');
      return;
    }

    setAnalyzing(true);
    try {
      const result = await onAnalyzeRepo(parsed.canonicalUrl, category);
      setRepoUrl('');
      setSuccessMsg(`Analyzed ${result.owner}/${result.repoName} and added its architecture profile below.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to analyze repository.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <section id="repositories" className="border-t border-white/[0.08] py-20 lg:py-24">
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-amber-400">02. Codebase Intelligence</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#F4F4F6] sm:text-4xl">
            GitHub Repository Architecture Analyzer
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Link your public C# game development, web engineering, or mobile repositories. Our deep-thinking analyzer inspects the repository layout, languages, and documentation to generate structured architecture insights for your portfolio.
          </p>
        </div>

        {/* Repository Submission Form */}
        <form
          onSubmit={handleSubmit}
          className="mt-8 rounded-xl border border-white/[0.08] bg-[#12141A] p-6"
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-6">
              <label htmlFor="github-repo-url" className="block text-xs font-medium text-zinc-300">
                GitHub Repository URL
              </label>
              <input
                id="github-repo-url"
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/username/project-repo"
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0A0B0E] px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="lg:col-span-3">
              <label htmlFor="github-repo-category" className="block text-xs font-medium text-zinc-300">
                Portfolio Track
              </label>
              <select
                id="github-repo-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as RepoCategory)}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0A0B0E] px-3.5 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
              >
                <option value="csharp_game">C# Game Dev</option>
                <option value="web">Web Dev (Frontend & Backend)</option>
                <option value="mobile">Mobile Dev</option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <button
                type="submit"
                disabled={analyzing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-[#0A0B0E] transition-colors hover:bg-amber-400 disabled:opacity-60 whitespace-nowrap cursor-pointer"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Deep Analyzing…
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" aria-hidden="true" />
                    Analyze Repository
                  </>
                )}
              </button>
            </div>
          </div>

          {errorMsg && (
            <p role="alert" className="mt-3 text-xs font-medium text-rose-400">
              {errorMsg}
            </p>
          )}
          {successMsg && (
            <p role="status" className="mt-3 text-xs font-medium text-emerald-400">
              {successMsg}
            </p>
          )}
        </form>

        {/* Category Filter Bar */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div
            role="tablist"
            aria-label="Filter analyzed repositories by category"
            className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#12141A] p-1.5"
          >
            {(['all', 'csharp_game', 'web', 'mobile'] as const).map((tab) => {
              const active = filter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(tab)}
                  className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-amber-500 text-[#0A0B0E] font-semibold'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  {tab === 'all' ? 'All Repositories' : CATEGORY_LABELS[tab]}
                </button>
              );
            })}
          </div>

          <p className="font-mono text-xs tabular-nums text-zinc-500">
            Showing {filteredRepos.length} analyzed {filteredRepos.length === 1 ? 'codebase' : 'codebases'}
          </p>
        </div>

        {/* Loading Skeleton during deep reasoning */}
        {analyzing && (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-[#12141A] p-6 animate-pulse">
            <div className="h-4 w-48 rounded bg-white/10" />
            <div className="mt-3 h-6 w-80 rounded bg-white/10" />
            <div className="mt-4 h-16 w-full rounded bg-white/[0.06]" />
            <p className="mt-4 text-xs text-amber-400">
              Inspecting GitHub repository tree, language breakdown, and running high-thinking architecture synthesis…
            </p>
          </div>
        )}

        {/* Repository Insight Cards */}
        <div className="mt-6 grid grid-cols-1 gap-6">
          {filteredRepos.length === 0 ? (
            <div className="rounded-xl border border-white/[0.08] bg-[#12141A] p-10 text-center">
              <p className="text-sm text-zinc-400">
                No analyzed repositories in this track yet. Submit a GitHub link above to generate an architecture dossier.
              </p>
            </div>
          ) : (
            filteredRepos.map((repo) => (
              <article
                key={repo.id}
                className="rounded-xl border border-white/[0.08] bg-[#12141A] p-6 lg:p-7"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
                      <span className="text-amber-400 font-medium">
                        {CATEGORY_LABELS[repo.category]}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{repo.primaryLanguage}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{repo.stars} stars</span>
                      <span aria-hidden="true">·</span>
                      <span>{repo.complexityLevel}</span>
                    </div>

                    <h3 className="mt-2 flex items-center gap-2.5 font-display text-lg font-bold text-[#F4F4F6] sm:text-xl">
                      <GitBranch className="h-4 w-4 text-zinc-500 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 break-all sm:break-words">
                        {repo.owner}/{repo.repoName}
                      </span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={repo.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0A0B0E] px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-amber-500/40 hover:text-white whitespace-nowrap"
                    >
                      View on GitHub
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      onClick={() => onRemoveRepo(repo.id)}
                      aria-label={`Remove ${repo.owner}/${repo.repoName} from portfolio`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#0A0B0E] text-zinc-500 transition-colors hover:border-rose-500/40 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <p className="mt-4 max-w-[75ch] text-sm leading-relaxed text-zinc-300">
                  {repo.summary}
                </p>

                <div className="mt-5 border-t border-white/[0.08] pt-5 grid grid-cols-1 gap-6 lg:grid-cols-12">
                  <div className="lg:col-span-4">
                    <p className="text-xs font-medium text-zinc-400">Architecture Pattern</p>
                    <p className="mt-1.5 text-sm font-semibold text-[#F4F4F6]">
                      {repo.architecturePattern}
                    </p>

                    <p className="mt-5 text-xs font-medium text-zinc-400">Detected Stack</p>
                    <p className="mt-1.5 font-mono text-xs leading-relaxed text-zinc-300">
                      {repo.techStack.join('  /  ')}
                    </p>
                  </div>

                  <div className="lg:col-span-5">
                    <p className="text-xs font-medium text-zinc-400">Codebase Insights</p>
                    <ul className="mt-2 space-y-2 text-sm text-zinc-300">
                      {repo.codebaseHighlights.map((item, idx) => (
                        <li key={idx} className="leading-relaxed">
                          <span className="mr-2 font-mono text-xs text-amber-400">
                            0{idx + 1}.
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="lg:col-span-3">
                    <p className="text-xs font-medium text-zinc-400">Recommended Next Steps</p>
                    <ul className="mt-2 space-y-2 text-xs leading-relaxed text-zinc-400">
                      {repo.nextSteps.map((step, idx) => (
                        <li key={idx}>— {step}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

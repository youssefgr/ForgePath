import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { requireAuth, optionalAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  addStreakLogForUser,
  createMilestoneForUser,
  deleteMilestoneForUser,
  deleteRepositoryForUser,
  getFullPortfolioByUid,
  recordGameScoreForUser,
  saveAnalyzedRepositoryForUser,
  updateMilestoneStatusForUser,
} from './src/db/queries.ts';
import {
  parseGitHubRepoUrl,
  type DisciplineTrack,
  type MilestoneStatus,
  type RepoCategory,
} from './src/utils/portfolioLogic.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_TRACKS: DisciplineTrack[] = ['csharp_game', 'web_frontend', 'web_backend', 'mobile'];
const VALID_STATUSES: MilestoneStatus[] = ['planned', 'in_progress', 'completed'];
const VALID_REPO_CATEGORIES: RepoCategory[] = ['csharp_game', 'web', 'mobile'];
const VALID_IMAGE_SIZES = ['1K', '2K', '4K'] as const;
const VALID_ASPECT_RATIOS = ['16:9', '4:3', '1:1'] as const;

function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function fetchGitHubContext(owner: string, repo: string) {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ForgePath-Portfolio-Analyzer',
  };

  const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const [metaRes, langRes, contentsRes, readmeRes] = await Promise.all([
    fetch(base, { headers }),
    fetch(`${base}/languages`, { headers }),
    fetch(`${base}/contents`, { headers }),
    fetch(`${base}/readme`, { headers }),
  ]);

  if (!metaRes.ok) {
    if (metaRes.status === 404) {
      throw new Error(`Repository ${owner}/${repo} was not found or is private on GitHub.`);
    }
    throw new Error(`GitHub API responded with HTTP ${metaRes.status} while inspecting ${owner}/${repo}.`);
  }

  const meta = (await metaRes.json()) as {
    name?: string;
    description?: string | null;
    language?: string | null;
    stargazers_count?: number;
    forks_count?: number;
    topics?: string[];
    default_branch?: string;
  };

  const languages = langRes.ok ? ((await langRes.json()) as Record<string, number>) : {};
  const contentsRaw = contentsRes.ok ? ((await contentsRes.json()) as Array<{ name: string; type: string }>) : [];
  const rootEntries = Array.isArray(contentsRaw)
    ? contentsRaw.slice(0, 40).map((item) => `${item.type}:${item.name}`)
    : [];

  let readmeSnippet = '';
  if (readmeRes.ok) {
    const readmeJson = (await readmeRes.json()) as { content?: string; encoding?: string };
    if (readmeJson.content && readmeJson.encoding === 'base64') {
      readmeSnippet = Buffer.from(readmeJson.content, 'base64').toString('utf-8').slice(0, 4500);
    }
  }

  return {
    name: meta.name ?? repo,
    description: meta.description ?? '',
    primaryLanguage: meta.language ?? Object.keys(languages)[0] ?? 'Unknown',
    stars: typeof meta.stargazers_count === 'number' ? meta.stargazers_count : 0,
    forks: typeof meta.forks_count === 'number' ? meta.forks_count : 0,
    topics: Array.isArray(meta.topics) ? meta.topics.slice(0, 12) : [],
    languages,
    rootEntries,
    readmeSnippet,
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Load authenticated user's complete portfolio from Cloud SQL PostgreSQL
  app.get('/api/portfolio', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email ?? `${uid}@user.local`;
      const data = await getFullPortfolioByUid(
        uid,
        email,
        req.user!.name ?? null,
        req.user!.picture ?? null
      );
      res.json(data);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch portfolio';
      res.status(500).json({ error: msg });
    }
  });

  // Create roadmap milestone
  app.post('/api/milestones', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { title, track, phase, status, xpReward, description, techStack, targetQuarter } = req.body ?? {};
      if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 140) {
        return res.status(400).json({ error: 'Milestone title must be between 3 and 140 characters.' });
      }
      if (!VALID_TRACKS.includes(track)) {
        return res.status(400).json({ error: 'Invalid engineering discipline track.' });
      }
      const safeStatus: MilestoneStatus = VALID_STATUSES.includes(status) ? status : 'planned';
      const safePhase = typeof phase === 'string' && phase.trim() ? phase.trim().slice(0, 80) : 'Phase 04 · Expansion';
      const safeDesc = typeof description === 'string' ? description.trim().slice(0, 600) : '';
      const safeQuarter = typeof targetQuarter === 'string' && targetQuarter.trim() ? targetQuarter.trim().slice(0, 24) : 'Q1 2027';
      const safeXp = Number.isFinite(Number(xpReward)) ? Math.min(500, Math.max(50, Math.round(Number(xpReward)))) : 150;
      const safeStack = Array.isArray(techStack)
        ? techStack.filter((t): t is string => typeof t === 'string' && t.trim().length > 0).map((t) => t.trim().slice(0, 32)).slice(0, 8)
        : [];

      const result = await createMilestoneForUser(
        req.user!.uid,
        req.user!.email ?? `${req.user!.uid}@user.local`,
        {
          title: title.trim(),
          track,
          phase: safePhase,
          status: safeStatus,
          xpReward: safeXp,
          description: safeDesc || 'Custom technical roadmap milestone.',
          techStack: safeStack,
          targetQuarter: safeQuarter,
        }
      );

      res.status(201).json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create milestone';
      res.status(500).json({ error: msg });
    }
  });

  // Update milestone status
  app.patch('/api/milestones/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body ?? {};
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid milestone ID.' });
      }
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid milestone status.' });
      }

      const result = await updateMilestoneStatusForUser(
        req.user!.uid,
        req.user!.email ?? `${req.user!.uid}@user.local`,
        id,
        status
      );
      if (!result) {
        return res.status(404).json({ error: 'Milestone not found.' });
      }
      res.json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to update milestone';
      res.status(500).json({ error: msg });
    }
  });

  // Delete milestone
  app.delete('/api/milestones/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid milestone ID.' });
      }
      const ok = await deleteMilestoneForUser(
        req.user!.uid,
        req.user!.email ?? `${req.user!.uid}@user.local`,
        id
      );
      if (!ok) return res.status(404).json({ error: 'Milestone not found.' });
      res.json({ deleted: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to delete milestone';
      res.status(500).json({ error: msg });
    }
  });

  // Log daily learning streak session
  app.post('/api/streaks', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { logDate, track, minutesSpent, note } = req.body ?? {};
      if (typeof logDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
        return res.status(400).json({ error: 'Valid YYYY-MM-DD logDate is required.' });
      }
      if (!VALID_TRACKS.includes(track)) {
        return res.status(400).json({ error: 'Invalid learning track.' });
      }
      const mins = Number(minutesSpent);
      if (!Number.isFinite(mins) || mins < 5 || mins > 720) {
        return res.status(400).json({ error: 'Minutes spent must be between 5 and 720.' });
      }
      if (typeof note !== 'string' || note.trim().length < 3 || note.trim().length > 280) {
        return res.status(400).json({ error: 'Session note must be between 3 and 280 characters.' });
      }

      const result = await addStreakLogForUser(
        req.user!.uid,
        req.user!.email ?? `${req.user!.uid}@user.local`,
        {
          logDate,
          track,
          minutesSpent: Math.round(mins),
          note: note.trim(),
        }
      );
      res.status(201).json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to record learning session';
      res.status(500).json({ error: msg });
    }
  });

  // Persist game high score
  app.post('/api/game-scores', requireAuth, async (req: AuthRequest, res) => {
    try {
      const score = Number(req.body?.score);
      const waveReached = Number(req.body?.waveReached);
      const enemiesDefeated = Number(req.body?.enemiesDefeated);
      if (!Number.isFinite(score) || score < 0 || !Number.isFinite(waveReached) || waveReached < 1) {
        return res.status(400).json({ error: 'Invalid score payload.' });
      }
      const result = await recordGameScoreForUser(
        req.user!.uid,
        req.user!.email ?? `${req.user!.uid}@user.local`,
        {
          score: Math.round(score),
          waveReached: Math.round(waveReached),
          enemiesDefeated: Number.isFinite(enemiesDefeated) ? Math.max(0, Math.round(enemiesDefeated)) : 0,
        }
      );
      res.status(201).json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to save game score';
      res.status(500).json({ error: msg });
    }
  });

  // Analyze GitHub repository using gemini-4-carbon with ThinkingLevel.HIGH (no maxOutputTokens)
  app.post('/api/repos/analyze', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const { repoUrl, category } = req.body ?? {};
      if (typeof repoUrl !== 'string') {
        return res.status(400).json({ error: 'Please enter a valid GitHub repository URL.' });
      }
      const parsed = parseGitHubRepoUrl(repoUrl);
      if (!parsed) {
        return res.status(400).json({
          error: 'Only public GitHub repository URLs (https://github.com/owner/repo) are supported.',
        });
      }
      const safeCategory: RepoCategory = VALID_REPO_CATEGORIES.includes(category) ? category : 'web';

      const ghData = await fetchGitHubContext(parsed.owner, parsed.repo);
      const ai = getGenAI();

      const prompt = [
        `Perform a deep software architecture analysis of this GitHub repository for a developer portfolio.`,
        `Target Category: ${safeCategory}`,
        `Repository: ${parsed.owner}/${parsed.repo}`,
        `Description: ${ghData.description || 'None provided'}`,
        `Primary Language: ${ghData.primaryLanguage}`,
        `Languages Breakdown (bytes): ${JSON.stringify(ghData.languages)}`,
        `Topics: ${ghData.topics.join(', ') || 'None'}`,
        `Root Directory Entries: ${ghData.rootEntries.join(', ') || 'Unavailable'}`,
        `README Excerpt:\n${ghData.readmeSnippet || 'No README available.'}`,
        ``,
        `Provide a concise, technically accurate engineering breakdown grounded strictly in the repository structure, languages, and README above.`,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-carbon',
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
          systemInstruction:
            'You are a Principal Systems Architect evaluating a developer portfolio repository across C# game development, web frontend/backend, and mobile engineering. Be grounded, concrete, and concise. Never fabricate files or metrics not supported by the provided repository snapshot.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: '2-3 sentence architectural overview of what the codebase builds and how it is structured.',
              },
              architecturePattern: {
                type: Type.STRING,
                description: 'Concise name of the core architecture pattern (e.g., Layered REST + Drizzle ORM, Data-Oriented ECS).',
              },
              codebaseHighlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 concrete technical highlights inferred from the directory layout, languages, and README.',
              },
              techStack: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Up to 6 detected core technologies, languages, or frameworks.',
              },
              nextSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2 actionable architectural recommendations to advance this project.',
              },
              complexityLevel: {
                type: Type.STRING,
                description: 'Short tier label such as Core Foundation, Production Full-Stack, or Senior Systems.',
              },
            },
            required: [
              'summary',
              'architecturePattern',
              'codebaseHighlights',
              'techStack',
              'nextSteps',
              'complexityLevel',
            ],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        return res.status(502).json({ error: 'Architecture analysis returned an empty response.' });
      }

      const analysis = JSON.parse(rawText) as {
        summary: string;
        architecturePattern: string;
        codebaseHighlights: string[];
        techStack: string[];
        nextSteps: string[];
        complexityLevel: string;
      };

      const insightPayload = {
        repoUrl: parsed.canonicalUrl,
        owner: parsed.owner,
        repoName: ghData.name,
        category: safeCategory,
        primaryLanguage: ghData.primaryLanguage,
        stars: ghData.stars,
        summary: String(analysis.summary || '').slice(0, 800),
        architecturePattern: String(analysis.architecturePattern || 'Modular Architecture').slice(0, 120),
        codebaseHighlights: Array.isArray(analysis.codebaseHighlights)
          ? analysis.codebaseHighlights.slice(0, 4).map((s) => String(s).slice(0, 260))
          : [],
        techStack: Array.isArray(analysis.techStack)
          ? analysis.techStack.slice(0, 6).map((s) => String(s).slice(0, 40))
          : [ghData.primaryLanguage],
        nextSteps: Array.isArray(analysis.nextSteps)
          ? analysis.nextSteps.slice(0, 3).map((s) => String(s).slice(0, 260))
          : [],
        complexityLevel: String(analysis.complexityLevel || 'Production Ready').slice(0, 48),
      };

      if (req.user) {
        const saved = await saveAnalyzedRepositoryForUser(
          req.user.uid,
          req.user.email ?? `${req.user.uid}@user.local`,
          insightPayload
        );
        return res.status(201).json({
          repository: {
            ...insightPayload,
            id: saved.repository.id,
            analyzedAt: saved.repository.analyzedAt?.toISOString() ?? new Date().toISOString(),
          },
          totalXp: saved.totalXp,
          persisted: true,
        });
      }

      return res.status(200).json({
        repository: {
          ...insightPayload,
          id: Date.now(),
          analyzedAt: new Date().toISOString(),
        },
        persisted: false,
      });
    } catch (error) {
      console.error('GitHub analysis error:', error);
      const msg = error instanceof Error ? error.message : 'Failed to analyze repository.';
      res.status(500).json({ error: msg });
    }
  });

  app.delete('/api/repos/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid repository ID.' });
      }
      const ok = await deleteRepositoryForUser(
        req.user!.uid,
        req.user!.email ?? `${req.user!.uid}@user.local`,
        id
      );
      if (!ok) return res.status(404).json({ error: 'Repository not found.' });
      res.json({ deleted: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to delete repository';
      res.status(500).json({ error: msg });
    }
  });

  // High-resolution visual asset generation via gemini-3-pro-image-preview (1K / 2K / 4K)
  app.post('/api/studio/image', async (req, res) => {
    try {
      const { prompt, imageSize, aspectRatio } = req.body ?? {};
      if (typeof prompt !== 'string' || prompt.trim().length < 5 || prompt.trim().length > 600) {
        return res.status(400).json({ error: 'Please provide an image prompt between 5 and 600 characters.' });
      }
      const safeSize = VALID_IMAGE_SIZES.includes(imageSize) ? imageSize : '1K';
      const safeAspect = VALID_ASPECT_RATIOS.includes(aspectRatio) ? aspectRatio : '16:9';

      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
            {
              text: `${prompt.trim()}. Clean dark-mode studio composition, high engineering craft, crisp lighting, no watermarks.`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: safeAspect,
            imageSize: safeSize,
          },
        },
      });

      let imageUrl: string | null = null;
      let caption = '';

      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          caption += part.text;
        }
      }

      if (!imageUrl) {
        return res.status(502).json({ error: 'The model did not return an image. Please refine your prompt.' });
      }

      res.json({
        imageUrl,
        caption: caption.trim(),
        imageSize: safeSize,
        aspectRatio: safeAspect,
        model: 'gemini-3-pro-image-preview',
      });
    } catch (error) {
      console.error('Image generation error:', error);
      const msg = error instanceof Error ? error.message : 'Image generation failed.';
      res.status(500).json({ error: msg });
    }
  });

  // Music & Game Soundtrack generation via Lyria (lyria-3-clip-preview / lyria-3-pro-preview)
  app.post('/api/studio/music', async (req, res) => {
    try {
      const { prompt, mode } = req.body ?? {};
      if (typeof prompt !== 'string' || prompt.trim().length < 5 || prompt.trim().length > 500) {
        return res.status(400).json({ error: 'Please provide a music prompt between 5 and 500 characters.' });
      }

      const model = mode === 'pro' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';
      const ai = getGenAI();

      const stream = await ai.models.generateContentStream({
        model,
        contents: prompt.trim(),
      });

      const audioChunks: Buffer[] = [];
      let notes = '';
      let mimeType = 'audio/mpeg';

      for await (const chunk of stream) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (audioChunks.length === 0 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
          }
          if (part.text) {
            notes += part.text;
          }
        }
      }

      if (audioChunks.length === 0) {
        return res.status(502).json({ error: 'No audio data returned by Lyria. Please try another prompt.' });
      }

      const audioBase64 = Buffer.concat(audioChunks).toString('base64');
      res.json({
        audioDataUrl: `data:${mimeType};base64,${audioBase64}`,
        notes: notes.trim(),
        model,
      });
    } catch (error) {
      console.error('Music generation error:', error);
      const msg = error instanceof Error ? error.message : 'Music generation failed.';
      res.status(500).json({ error: msg });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ForgePath server running on http://localhost:${PORT}`);
  });
}

startServer();

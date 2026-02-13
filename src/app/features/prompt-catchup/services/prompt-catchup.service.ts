import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of } from 'rxjs';
import {
  Agent,
  Group,
  RecommendStatus,
  ScoreboardCardData,
  SidebarLink,
  SortBy,
  PromptCatalog,
  SharedPrompt,
} from '../models/prompt-catchup.models';
import { AGENTS, GROUPS, SCOREBOARD_DATA, SIDEBAR_LINKS } from '../data/prompt-catchup.data';

const MY_UPVOTES_KEY = 'pcu_my_upvotes';
const PROMPT_UPVOTES_KEY = 'pcu_prompt_upvotes';

export interface MyUpvoteEntry {
  agentId: number;
  promptId: number;
  title?: string;
  description?: string;
  author?: string;
  upvotes?: number;
}

@Injectable({ providedIn: 'root' })
export class PromptCatchupService {
  private readonly SHARED_PROMPTS_KEY = 'pcu_shared_prompts';

  constructor(private http: HttpClient) {}

  getScoreboards(): Observable<ScoreboardCardData[]> {
    return of(SCOREBOARD_DATA);
  }

  getGroups(): Observable<Group[]> {
    const myUpvotesCount = this.getMyUpvotes().length;
    const groups = GROUPS.map((g) =>
      g.slug === 'my-upvotes' ? { ...g, count: myUpvotesCount } : g
    );
    return of(groups);
  }

  getSidebarLinks(): Observable<SidebarLink[]> {
    return of(SIDEBAR_LINKS);
  }

  getAgents(): Observable<Agent[]> {
    return of(AGENTS);
  }

  getPromptCatalog(agentId: number): Observable<PromptCatalog> {
    return this.http
      .get<PromptCatalog[]>('/assets/prompt-catalog-sample.json')
      .pipe(
        map((list) => {
          const base = list.find((c) => c.agentId === agentId) ?? list[0];
          const shared = this.getSharedPrompts();

          // Only include shared prompts that are tagged for this agent
          const sharedForAgent = shared.filter((p) => {
            const audience = (p.audience ?? '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            return audience.includes(`agent:${agentId}`);
          });

          const sharedItems: PromptCatalog['prompts'] = sharedForAgent.map(
            (p, index) => ({
              id: 1000 + index,
              title: p.title,
              prompt: p.prompt,
              description: p.description || p.prompt,
              certified: false,
              upvotes: 0,
              author: p.createdBy,
            })
          );

          const prompts = [...base.prompts, ...sharedItems].map((p) => ({
            ...p,
            upvotes:
              this.getStoredUpvoteCount(base.agentId, p.id) ?? p.upvotes,
          }));
          return {
            ...base,
            totalPrompts: base.totalPrompts + sharedItems.length,
            prompts,
          };
        })
      );
  }

  getMyUpvotes(): MyUpvoteEntry[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(MY_UPVOTES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as MyUpvoteEntry[]) : [];
    } catch {
      return [];
    }
  }

  getStoredUpvoteCount(agentId: number, promptId: number): number | undefined {
    if (typeof localStorage === 'undefined') return undefined;
    try {
      const raw = localStorage.getItem(PROMPT_UPVOTES_KEY);
      if (!raw) return undefined;
      const obj = JSON.parse(raw) as Record<string, number>;
      const key = `${agentId}_${promptId}`;
      return obj[key];
    } catch {
      return undefined;
    }
  }

  upvotePrompt(
    agentId: number,
    promptId: number,
    currentCount: number,
    details?: { title: string; description: string; author: string }
  ): void {
    const myUpvotes = this.getMyUpvotes();
    const key = `${agentId}_${promptId}`;
    if (myUpvotes.some((e) => e.agentId === agentId && e.promptId === promptId)) {
      return;
    }
    const newCount = currentCount + 1;
    myUpvotes.push({
      agentId,
      promptId,
      title: details?.title,
      description: details?.description,
      author: details?.author,
      upvotes: newCount,
    });
    try {
      localStorage.setItem(MY_UPVOTES_KEY, JSON.stringify(myUpvotes));
    } catch {
      // ignore
    }
    const raw = localStorage.getItem(PROMPT_UPVOTES_KEY);
    const counts = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    counts[key] = newCount;
    try {
      localStorage.setItem(PROMPT_UPVOTES_KEY, JSON.stringify(counts));
    } catch {
      // ignore
    }
  }

  hasUpvoted(agentId: number, promptId: number): boolean {
    return this.getMyUpvotes().some(
      (e) => e.agentId === agentId && e.promptId === promptId
    );
  }

  addSharedPrompt(prompt: SharedPrompt): void {
    const current = this.getSharedPrompts();
    current.push({ ...prompt });
    try {
      localStorage.setItem(this.SHARED_PROMPTS_KEY, JSON.stringify(current));
    } catch {
      // ignore storage errors
    }
  }

  getSharedPrompts(): SharedPrompt[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    try {
      const raw = localStorage.getItem(this.SHARED_PROMPTS_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as SharedPrompt[];
      }
      return [];
    } catch {
      return [];
    }
  }

  filterAgents(
    agents: Agent[],
    search: string,
    status: RecommendStatus,
    sort: SortBy,
    groupSlug: string | null
  ): Agent[] {
    let result = [...agents];

    if (groupSlug) {
      result = result.filter((a) => a.category === groupSlug);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
      );
    }

    if (status !== 'all') {
      const mapped = status === 'adopt' ? 'ADOPT' : 'UNDER_EVALUATION';
      result = result.filter((a) => a.status === mapped);
    }

    switch (sort) {
      case 'most_prompts':
        result.sort((a, b) => b.promptCount - a.promptCount);
        break;
      case 'newest':
        result.sort(
          (a, b) =>
            new Date(b.updatedDate ?? '').getTime() -
            new Date(a.updatedDate ?? '').getTime()
        );
        break;
      case 'alphabetical':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }
}

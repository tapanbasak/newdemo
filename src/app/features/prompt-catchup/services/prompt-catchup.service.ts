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

@Injectable({ providedIn: 'root' })
export class PromptCatchupService {
  private readonly SHARED_PROMPTS_KEY = 'pcu_shared_prompts';

  constructor(private http: HttpClient) {}

  getScoreboards(): Observable<ScoreboardCardData[]> {
    return of(SCOREBOARD_DATA);
  }

  getGroups(): Observable<Group[]> {
    const extra = this.getSharedPrompts().length;
    const groups = GROUPS.map((g) =>
      g.slug === 'my-upvotes' ? { ...g, count: g.count + extra } : g
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

          const sharedItems: PromptCatalog['prompts'] = shared.map(
            (p, index) => ({
              id: 1000 + index,
              title: p.title,
              description: p.prompt,
              certified: false,
              upvotes: 0,
              author: p.createdBy,
            })
          );

          return {
            ...base,
            totalPrompts: base.totalPrompts + sharedItems.length,
            prompts: [...base.prompts, ...sharedItems],
          };
        })
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

    if (groupSlug && groupSlug !== 'agents') {
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

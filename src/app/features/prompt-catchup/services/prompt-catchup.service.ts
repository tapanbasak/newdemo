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
} from '../models/prompt-catchup.models';
import { AGENTS, GROUPS, SCOREBOARD_DATA, SIDEBAR_LINKS } from '../data/prompt-catchup.data';

@Injectable({ providedIn: 'root' })
export class PromptCatchupService {
  constructor(private http: HttpClient) {}

  getScoreboards(): Observable<ScoreboardCardData[]> {
    return of(SCOREBOARD_DATA);
  }

  getGroups(): Observable<Group[]> {
    return of(GROUPS);
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
        map((list) => list.find((c) => c.agentId === agentId) ?? list[0])
      );
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

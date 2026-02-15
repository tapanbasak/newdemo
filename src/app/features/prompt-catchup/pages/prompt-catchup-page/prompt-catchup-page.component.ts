import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { BannerComponent } from '../../components/banner/banner.component';
import { ScoreboardComponent } from '../../components/scoreboard/scoreboard.component';
import { GroupsSidebarComponent } from '../../components/groups-sidebar/groups-sidebar.component';
import { SearchFilterBarComponent } from '../../components/search-filter-bar/search-filter-bar.component';
import { AgentGridComponent } from '../../components/agent-grid/agent-grid.component';
import { PromptCatchupService } from '../../services/prompt-catchup.service';
import {
  Agent,
  Group,
  RecommendStatus,
  SidebarLink,
  SortBy,
} from '../../models/prompt-catchup.models';

export interface MyUpvotesPromptRow {
  title: string;
  description: string;
  certified: boolean;
  upvotes: number;
  author: string;
}

@Component({
  selector: 'app-prompt-catchup-page',
  standalone: true,
  imports: [
    BannerComponent,
    ScoreboardComponent,
    GroupsSidebarComponent,
    SearchFilterBarComponent,
    AgentGridComponent,
  ],
  templateUrl: './prompt-catchup-page.component.html',
  styleUrl: './prompt-catchup-page.component.css',
})
export class PromptCatchupPageComponent implements OnInit {
  private service = inject(PromptCatchupService);
  private router = inject(Router);

  allAgents = signal<Agent[]>([]);
  promptTextsByAgent = signal<Record<number, string[]>>({});
  groups = signal<Group[]>([]);
  sidebarLinks = signal<SidebarLink[]>([]);

  search = signal('');
  status = signal<RecommendStatus>('all');
  sort = signal<SortBy>('most_prompts');
  selectedGroup = signal<string | null>(null);

  showCertifiedOnly = signal(false);
  promptSearch = signal('');

  filteredAgents = computed(() => {
    const agents = this.allAgents();
    const q = this.search().toLowerCase().trim();
    const textsByAgent = this.promptTextsByAgent();
    // Filter by group, status (no name/description search - we use prompt text)
    let result = this.service.filterAgents(
      agents,
      '',
      this.status(),
      this.sort(),
      this.selectedGroup()
    );
    if (q) {
      result = result.filter((a) => {
        const texts = textsByAgent[a.id];
        if (!texts?.length) return false;
        return texts.some((t) => t.toLowerCase().includes(q));
      });
    }
    return result;
  });

  /** Groups with counts updated to reflect current search (prompt text) and status filters. */
  groupsWithCounts = computed(() => {
    const base = this.groups();
    const agents = this.allAgents();
    const q = this.search().toLowerCase().trim();
    const status = this.status();
    const textsByAgent = this.promptTextsByAgent();
    return base.map((g) => {
      if (g.slug === 'my-upvotes') {
        return { ...g, count: this.service.getMyUpvotes().length };
      }
      let filtered = this.service.filterAgents(
        agents,
        '',
        status,
        'most_prompts',
        g.slug
      );
      if (q) {
        filtered = filtered.filter((a) => {
          const texts = textsByAgent[a.id];
          if (!texts?.length) return false;
          return texts.some((t) => t.toLowerCase().includes(q));
        });
      }
      return { ...g, count: filtered.length };
    });
  });

  filteredMyUpvotesPrompts = computed((): MyUpvotesPromptRow[] => {
    if (this.selectedGroup() !== 'my-upvotes') {
      return [];
    }
    const upvoted = this.service.getMyUpvotes();
    const q = this.promptSearch().toLowerCase().trim();
    let list: MyUpvotesPromptRow[] = upvoted.map((e) => ({
      title: e.title ?? 'Unknown',
      description: e.description ?? '',
      certified: false,
      upvotes: e.upvotes ?? 0,
      author: e.author ?? '',
    }));
    if (q) {
      list = list.filter(
        (row) =>
          row.title.toLowerCase().includes(q) ||
          row.description.toLowerCase().includes(q) ||
          row.author.toLowerCase().includes(q)
      );
    }
    if (this.showCertifiedOnly()) {
      list = list.filter((row) => row.certified);
    }
    return list;
  });

  ngOnInit(): void {
    // Load agents immediately so group counts are correct from first render
    this.service.getAgents().subscribe((agents) => this.allAgents.set(agents));
    this.service.getPromptData().subscribe((promptData) => {
      const current = this.allAgents();
      const merged = current.map((a) => ({
        ...a,
        promptCount: promptData.counts[a.id] ?? 0,
      }));
      this.allAgents.set(merged);
      this.promptTextsByAgent.set(promptData.textsByAgent);
    });
    this.refreshGroups();
    this.service.getSidebarLinks().subscribe((l) => this.sidebarLinks.set(l));
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (e.urlAfterRedirects === '/prompt-catchup' || e.urlAfterRedirects === '/prompt-catchup/') {
          this.refreshGroups();
        }
      });
  }

  private refreshGroups(): void {
    this.service.getGroups().subscribe((g) => this.groups.set(g));
  }

  onSearchChanged(value: string): void {
    this.search.set(value);
  }

  onStatusChanged(value: RecommendStatus): void {
    this.status.set(value);
  }

  onSortChanged(value: SortBy): void {
    this.sort.set(value);
  }

  onGroupSelected(slug: string): void {
    this.selectedGroup.set(this.selectedGroup() === slug ? null : slug);
  }

  onClearAll(): void {
    this.search.set('');
    this.status.set('all');
    this.sort.set('most_prompts');
    this.selectedGroup.set(null);
    this.promptSearch.set('');
    this.showCertifiedOnly.set(false);
  }

  onClearMyUpvotesFilters(): void {
    this.promptSearch.set('');
    this.showCertifiedOnly.set(false);
  }

  onPromptSearchChanged(value: string): void {
    this.promptSearch.set(value);
  }

  toggleCertified(checked: boolean): void {
    this.showCertifiedOnly.set(checked);
  }

  showCopiedMessage = signal(false);

  /** Copy prompt text to clipboard, then open contact page in new tab. */
  onRunPrompt(row: MyUpvotesPromptRow): void {
    const text = row.description ?? '';
    if (!text) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.showCopiedMessage.set(true);
        setTimeout(() => this.showCopiedMessage.set(false), 2500);
        window.open('https://www.vortexiq.ai/contact-us', '_blank', 'noopener,noreferrer');
      }).catch(() => {});
    } else {
      window.open('https://www.vortexiq.ai/contact-us', '_blank', 'noopener,noreferrer');
    }
  }
}

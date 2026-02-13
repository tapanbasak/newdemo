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
  groups = signal<Group[]>([]);
  sidebarLinks = signal<SidebarLink[]>([]);

  search = signal('');
  status = signal<RecommendStatus>('all');
  sort = signal<SortBy>('most_prompts');
  selectedGroup = signal<string | null>(null);

  showCertifiedOnly = signal(false);
  promptSearch = signal('');

  filteredAgents = computed(() =>
    this.service.filterAgents(
      this.allAgents(),
      this.search(),
      this.status(),
      this.sort(),
      this.selectedGroup()
    )
  );

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
    this.service.getAgents().subscribe((a) => this.allAgents.set(a));
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
}

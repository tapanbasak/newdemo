import { Component, computed, inject, OnInit, signal } from '@angular/core';
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

  allAgents = signal<Agent[]>([]);
  groups = signal<Group[]>([]);
  sidebarLinks = signal<SidebarLink[]>([]);

  search = signal('');
  status = signal<RecommendStatus>('all');
  sort = signal<SortBy>('most_prompts');
  selectedGroup = signal<string | null>(null);

  filteredAgents = computed(() =>
    this.service.filterAgents(
      this.allAgents(),
      this.search(),
      this.status(),
      this.sort(),
      this.selectedGroup()
    )
  );

  ngOnInit(): void {
    this.service.getAgents().subscribe((a) => this.allAgents.set(a));
    this.service.getGroups().subscribe((g) => this.groups.set(g));
    this.service.getSidebarLinks().subscribe((l) => this.sidebarLinks.set(l));
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
  }
}

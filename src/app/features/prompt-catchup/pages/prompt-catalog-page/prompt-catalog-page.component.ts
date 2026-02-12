import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PromptCatchupService } from '../../services/prompt-catchup.service';
import { PromptCatalog } from '../../models/prompt-catchup.models';

@Component({
  selector: 'app-prompt-catalog-page',
  standalone: true,
  imports: [NgIf, NgForOf, RouterLink],
  templateUrl: './prompt-catalog-page.component.html',
  styleUrl: './prompt-catalog-page.component.css',
})
export class PromptCatalogPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(PromptCatchupService);

  catalog = signal<PromptCatalog | null>(null);
  showCertifiedOnly = signal(false);

  filteredPrompts = computed(() => {
    const current = this.catalog();
    if (!current) {
      return [];
    }

    if (!this.showCertifiedOnly()) {
      return current.prompts;
    }

    return current.prompts.filter((p) => p.certified);
  });

  ngOnInit(): void {
    const agentId = Number(this.route.snapshot.paramMap.get('agentId'));
    this.service
      .getPromptCatalog(agentId)
      .subscribe((data) => this.catalog.set(data));
  }

  toggleCertified(checked: boolean): void {
    this.showCertifiedOnly.set(checked);
  }
}


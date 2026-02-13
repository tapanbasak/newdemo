import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PromptCatchupService } from '../../services/prompt-catchup.service';
import { PromptCatalog, PromptCatalogItem } from '../../models/prompt-catchup.models';

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
  agentId = signal<number>(0);

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
    const id = Number(this.route.snapshot.paramMap.get('agentId'));
    this.agentId.set(id);
    this.loadCatalog();
  }

  loadCatalog(): void {
    this.service
      .getPromptCatalog(this.agentId())
      .subscribe((data) => this.catalog.set(data));
  }

  toggleCertified(checked: boolean): void {
    this.showCertifiedOnly.set(checked);
  }

  onUpvote(prompt: PromptCatalogItem): void {
    // Prevent double upvoting
    if (this.hasUpvoted(prompt)) {
      return;
    }

    // Optimistically update the UI immediately
    const currentCatalog = this.catalog();
    if (currentCatalog) {
      const updatedPrompts = currentCatalog.prompts.map((p) => {
        if (p.id === prompt.id) {
          return {
            ...p,
            upvotes: p.upvotes + 1,
          };
        }
        return p;
      });

      this.catalog.set({
        ...currentCatalog,
        prompts: updatedPrompts,
      });
    }

    // Update localStorage
    this.service.upvotePrompt(
      this.agentId(),
      prompt.id,
      prompt.upvotes,
      {
        title: prompt.title,
        description: prompt.description,
        author: prompt.author,
      }
    );

    // Reload catalog to ensure consistency
    this.loadCatalog();
  }

  hasUpvoted(prompt: PromptCatalogItem): boolean {
    return this.service.hasUpvoted(this.agentId(), prompt.id);
  }
}


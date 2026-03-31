import { Component, OnInit, inject, signal } from '@angular/core';
import { NgForOf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PromptCatchupService, StoredComment } from '../../services/prompt-catchup.service';
import { PromptCatalog, PromptCatalogItem } from '../../models/prompt-catchup.models';

@Component({
  selector: 'app-prompt-detail-page',
  standalone: true,
  imports: [NgForOf, RouterLink],
  templateUrl: './prompt-detail-page.component.html',
  styleUrl: './prompt-detail-page.component.css',
})
export class PromptDetailPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(PromptCatchupService);

  catalog = signal<PromptCatalog | null>(null);
  prompt = signal<PromptCatalogItem | null>(null);
  agentId = signal<number>(0);
  promptId = signal<number>(0);
  showCopiedMessage = signal(false);
  comments = signal<StoredComment[]>([]);
  newCommentText = signal('');

  ngOnInit(): void {
    const aid = Number(this.route.snapshot.paramMap.get('agentId'));
    const pid = Number(this.route.snapshot.paramMap.get('promptId'));
    this.agentId.set(aid);
    this.promptId.set(pid);
    this.loadCatalogAndPrompt();
    this.loadComments();
  }

  loadCatalogAndPrompt(): void {
    this.service.getPromptCatalog(this.agentId()).subscribe((data) => {
      this.catalog.set(data);
      const p = data.prompts.find((x) => x.id === this.promptId());
      this.prompt.set(p ?? null);
    });
  }

  loadComments(): void {
    const comments = this.service.getComments(this.agentId(), this.promptId());
    this.comments.set(comments);
  }

  onRunPrompt(p: PromptCatalogItem): void {
    const text = p.prompt ?? p.description ?? '';
    if (!text) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          this.showCopiedMessage.set(true);
          setTimeout(() => this.showCopiedMessage.set(false), 2500);
          window.open('https://www.vortexiq.ai/contact-us', '_blank', 'noopener,noreferrer');
        })
        .catch(() => {});
    } else {
      window.open('https://www.vortexiq.ai/contact-us', '_blank', 'noopener,noreferrer');
    }
  }

  onUpvote(p: PromptCatalogItem): void {
    if (this.service.hasUpvoted(this.agentId(), p.id)) return;
    const current = this.catalog();
    if (!current) return;
    const updatedPrompts = current.prompts.map((x) =>
      x.id === p.id ? { ...x, upvotes: x.upvotes + 1 } : x
    );
    this.catalog.set({ ...current, prompts: updatedPrompts });
    this.prompt.set(updatedPrompts.find((x) => x.id === p.id) ?? null);
    this.service.upvotePrompt(this.agentId(), p.id, p.upvotes, {
      title: p.title,
      description: p.description,
      author: p.author,
    });
  }

  hasUpvoted(p: PromptCatalogItem): boolean {
    return this.service.hasUpvoted(this.agentId(), p.id);
  }

  onCopyToClipboard(p: PromptCatalogItem): void {
    const text = p.prompt ?? p.description ?? '';
    if (!text) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          this.showCopiedMessage.set(true);
          setTimeout(() => this.showCopiedMessage.set(false), 2500);
        })
        .catch(() => {});
    }
  }

  onAddComment(): void {
    const text = this.newCommentText().trim();
    if (!text) return;
    const comment: StoredComment = {
      id: crypto.randomUUID(),
      author: 'Current User',
      role: 'USER',
      text,
      timeAgo: 'Just now',
    };
    this.service.addComment(this.agentId(), this.promptId(), comment);
    this.comments.set(this.service.getComments(this.agentId(), this.promptId()));
    this.newCommentText.set('');
  }
}

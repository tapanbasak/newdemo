import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PromptCatchupService } from '../../services/prompt-catchup.service';
import { Agent, Group, SharedPrompt } from '../../models/prompt-catchup.models';

@Component({
  selector: 'app-share-prompt-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './share-prompt-page.component.html',
  styleUrl: './share-prompt-page.component.css',
})
export class SharePromptPageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(PromptCatchupService);

  groups: Group[] = [];
  // Groups that can be selected in the audience control (exclude My Upvotes)
  audienceGroups: Group[] = [];
  agents: Agent[] = [];
  expandedGroups: Set<string> = new Set();

  form = this.fb.group({
    title: ['', Validators.required],
    createdBy: ['', Validators.required],
    createdBySoeid: ['', Validators.required],
    audience: [''],
    prompt: ['', Validators.required],
    description: [''],
    attachments: [''],
  });

  ngOnInit(): void {
    this.service.getGroups().subscribe((g) => {
      this.groups = g;
      this.audienceGroups = g.filter((group) => group.slug !== 'my-upvotes');
    });
    this.service.getAgents().subscribe((a) => (this.agents = a));
  }

  getAgentsForGroup(groupSlug: string): Agent[] {
    return this.agents.filter((a) => a.category === groupSlug);
  }

  toggleGroupExpanded(slug: string): void {
    if (this.expandedGroups.has(slug)) {
      this.expandedGroups.delete(slug);
    } else {
      this.expandedGroups.add(slug);
    }
  }

  isGroupExpanded(slug: string): boolean {
    return this.expandedGroups.has(slug);
  }

  onAttachmentsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    const names = files ? Array.from(files).map((f) => f.name).join(', ') : '';
    this.form.patchValue({ attachments: names });
  }

  isAudienceSelected(identifier: string): boolean {
    const value = this.form.value.audience ?? '';
    const parts = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.includes(identifier);
  }

  onAudienceToggle(identifier: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const value = this.form.value.audience ?? '';
    const current = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const next = checked
      ? Array.from(new Set([...current, identifier]))
      : current.filter((s) => s !== identifier);

    this.form.patchValue({ audience: next.join(', ') });
  }

  showSuccessMessage = signal(false);

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.service.addSharedPrompt(this.form.getRawValue() as SharedPrompt);
    this.form.reset({
      title: '',
      createdBy: '',
      createdBySoeid: '',
      audience: '',
      prompt: '',
      description: '',
      attachments: '',
    });
    this.showSuccessMessage.set(true);
  }
}


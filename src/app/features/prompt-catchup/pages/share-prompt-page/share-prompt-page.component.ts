import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PromptCatchupService } from '../../services/prompt-catchup.service';
import { SharedPrompt } from '../../models/prompt-catchup.models';

@Component({
  selector: 'app-share-prompt-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './share-prompt-page.component.html',
  styleUrl: './share-prompt-page.component.css',
})
export class SharePromptPageComponent {
  private fb = inject(FormBuilder);
  private service = inject(PromptCatchupService);
  private router = inject(Router);

  form = this.fb.group({
    title: ['', Validators.required],
    createdBy: ['', Validators.required],
    createdBySoeid: ['', Validators.required],
    audience: [''],
    prompt: ['', Validators.required],
    description: [''],
    attachments: [''],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.service.addSharedPrompt(this.form.getRawValue() as SharedPrompt);
    this.router.navigate(['/prompt-catchup']);
  }
}


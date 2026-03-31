import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Agent } from '../../models/prompt-catchup.models';

@Component({
  selector: 'app-agent-card',
  standalone: true,
  imports: [],
  templateUrl: './agent-card.component.html',
  styleUrl: './agent-card.component.css',
})
export class AgentCardComponent {
  @Input({ required: true }) agent!: Agent;

  private router = inject(Router);

  get statusClass(): string {
    return this.agent.status === 'ADOPT' ? 'badge-adopt' : 'badge-evaluation';
  }

  get statusLabel(): string {
    return this.agent.status === 'ADOPT' ? 'ADOPT' : 'UNDER EVALUATION';
  }

  goToCatalog(): void {
    this.router.navigate(['/prompt-catchup', 'catalog', this.agent.id]);
  }
}

import { Component, Input } from '@angular/core';
import { Agent } from '../../models/prompt-catchup.models';
import { AgentCardComponent } from '../agent-card/agent-card.component';

@Component({
  selector: 'app-agent-grid',
  standalone: true,
  imports: [AgentCardComponent],
  templateUrl: './agent-grid.component.html',
  styleUrl: './agent-grid.component.css',
})
export class AgentGridComponent {
  @Input({ required: true }) agents: Agent[] = [];
}

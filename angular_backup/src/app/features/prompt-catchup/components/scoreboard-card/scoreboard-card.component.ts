import { Component, Input } from '@angular/core';
import { ScoreboardCardData } from '../../models/prompt-catchup.models';

@Component({
  selector: 'app-scoreboard-card',
  standalone: true,
  templateUrl: './scoreboard-card.component.html',
  styleUrl: './scoreboard-card.component.css',
})
export class ScoreboardCardComponent {
  @Input({ required: true }) data!: ScoreboardCardData;
}

import { Component, inject, OnInit } from '@angular/core';
import { ScoreboardCardComponent } from '../scoreboard-card/scoreboard-card.component';
import { ScoreboardCardData } from '../../models/prompt-catchup.models';
import { PromptCatchupService } from '../../services/prompt-catchup.service';

@Component({
  selector: 'app-scoreboard',
  standalone: true,
  imports: [ScoreboardCardComponent],
  templateUrl: './scoreboard.component.html',
  styleUrl: './scoreboard.component.css',
})
export class ScoreboardComponent implements OnInit {
  private service = inject(PromptCatchupService);
  scoreboards: ScoreboardCardData[] = [];

  ngOnInit(): void {
    this.service.getScoreboards().subscribe((data) => (this.scoreboards = data));
  }
}

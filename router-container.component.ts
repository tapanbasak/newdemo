import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PromptCatchupWidgetService } from '../../services/prompt-catchup-widget.service';

@Component({
  selector: 'app-router-container',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './router-container.component.html',
})
export class RouterContainerComponent implements OnInit, OnDestroy {
  private promptCatchupWidgetService = inject(PromptCatchupWidgetService);

  ngOnInit(): void {
    this.promptCatchupWidgetService.init();
  }

  ngOnDestroy(): void {
    this.promptCatchupWidgetService.destroy();
  }
}

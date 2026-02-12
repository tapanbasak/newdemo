import { Routes } from '@angular/router';
import { PromptCatchupPageComponent } from './pages/prompt-catchup-page/prompt-catchup-page.component';
import { PromptCatalogPageComponent } from './pages/prompt-catalog-page/prompt-catalog-page.component';

export const PROMPT_CATCHUP_ROUTES: Routes = [
  { path: '', component: PromptCatchupPageComponent },
  { path: 'catalog/:agentId', component: PromptCatalogPageComponent },
];

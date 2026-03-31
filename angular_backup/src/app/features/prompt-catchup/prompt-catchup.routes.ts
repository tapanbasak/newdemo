import { Routes } from '@angular/router';
import { PromptCatchupPageComponent } from './pages/prompt-catchup-page/prompt-catchup-page.component';
import { PromptCatalogPageComponent } from './pages/prompt-catalog-page/prompt-catalog-page.component';
import { PromptDetailPageComponent } from './pages/prompt-detail-page/prompt-detail-page.component';
import { SharePromptPageComponent } from './pages/share-prompt-page/share-prompt-page.component';

export const PROMPT_CATCHUP_ROUTES: Routes = [
  { path: '', component: PromptCatchupPageComponent },
  { path: 'catalog/:agentId', component: PromptCatalogPageComponent },
  { path: 'catalog/:agentId/prompt/:promptId', component: PromptDetailPageComponent },
  { path: 'share', component: SharePromptPageComponent },
];

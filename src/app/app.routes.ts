import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'prompt-catchup',
    loadChildren: () =>
      import('./features/prompt-catchup/prompt-catchup.routes').then(
        (m) => m.PROMPT_CATCHUP_ROUTES
      ),
  },
  { path: '', redirectTo: 'prompt-catchup', pathMatch: 'full' },
];

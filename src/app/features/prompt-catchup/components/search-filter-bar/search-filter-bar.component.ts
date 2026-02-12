import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RecommendStatus, SortBy } from '../../models/prompt-catchup.models';

@Component({
  selector: 'app-search-filter-bar',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './search-filter-bar.component.html',
  styleUrl: './search-filter-bar.component.css',
})
export class SearchFilterBarComponent {
  search = '';
  status: RecommendStatus = 'all';
  sort: SortBy = 'most_prompts';

  @Output() searchChanged = new EventEmitter<string>();
  @Output() statusChanged = new EventEmitter<RecommendStatus>();
  @Output() sortChanged = new EventEmitter<SortBy>();
  @Output() clearAll = new EventEmitter<void>();

  onSearchInput(): void {
    this.searchChanged.emit(this.search);
  }

  onStatusChange(): void {
    this.statusChanged.emit(this.status);
  }

  onSortChange(): void {
    this.sortChanged.emit(this.sort);
  }

  onClearAll(): void {
    this.search = '';
    this.status = 'all';
    this.sort = 'most_prompts';
    this.clearAll.emit();
  }
}

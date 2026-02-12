import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Group, SidebarLink } from '../../models/prompt-catchup.models';

@Component({
  selector: 'app-groups-sidebar',
  standalone: true,
  imports: [],
  templateUrl: './groups-sidebar.component.html',
  styleUrl: './groups-sidebar.component.css',
})
export class GroupsSidebarComponent {
  @Input({ required: true }) groups: Group[] = [];
  @Input() selectedGroup: string | null = null;
  @Input() links: SidebarLink[] = [];
  @Output() groupSelected = new EventEmitter<string>();

  private router = inject(Router);

  selectGroup(slug: string): void {
    this.groupSelected.emit(slug);
  }

  navigate(link: SidebarLink, event: MouseEvent): void {
    if (!link.route) {
      return;
    }
    event.preventDefault();
    this.router.navigate(link.route);
  }
}

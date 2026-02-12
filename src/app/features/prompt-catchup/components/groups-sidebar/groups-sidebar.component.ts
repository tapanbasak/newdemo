import { Component, EventEmitter, Input, Output } from '@angular/core';
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

  selectGroup(slug: string): void {
    this.groupSelected.emit(slug);
  }
}

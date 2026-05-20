import { Component, Input, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HamburgerIcon } from '../../icons';
import { Select, SelectOption } from '../../inputs/select/select.component';
import { SquareButton } from '../../buttons/square-button/square-button.component';



export interface NavLink {
    label: string;
    link?: string;
    hasOptions?: boolean;
    options?: { label: string; value: string }[];
}



@Component({
  selector: 'nc-topnav',
  standalone: true,
  imports: [CommonModule, RouterLink, HamburgerIcon, Select, SquareButton],
  templateUrl: './topnav.component.html',
  styleUrl: './topnav.component.css',
})



export class TopNav {
  @Input() links: NavLink[] = [];
  @Input() class: string = '';
  @Input() style: { [key: string]: string } = {};
  @Input() id: string = '';

  private router = inject(Router);

  getHamburgerOptions(): SelectOption[] {
    return this.links.flatMap(link => {
      if (link.hasOptions) return link.options?.map(option => ({ label: option.label, value: option.value })) || [];
      return [{ label: link.label, value: link.link || '' }];
    });
  }

  navigateToLink(value: string | string[]) {
    if (typeof value === 'string') this.router.navigate([value]);
  }

}
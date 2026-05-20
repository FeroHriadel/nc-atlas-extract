// ng component

import { Component, Input } from '@angular/core';
import { TimesIcon } from '../../icons';


@Component({
  selector: 'nc-close-button',
  standalone: true,
  templateUrl: './close-button.component.html',
  styleUrl: './close-button.component.css',
  imports: [TimesIcon]
})



export class CloseButton {
    @Input() id?: string;
    @Input() ariaLabel: string = 'Close';
    @Input() disabled: boolean = false;
    @Input() class: string = '';
    @Input() style: { [key: string]: string } = {};
    @Input() size: number = 20;
    @Input() color: string = 'var(--nc-red-900)';

}
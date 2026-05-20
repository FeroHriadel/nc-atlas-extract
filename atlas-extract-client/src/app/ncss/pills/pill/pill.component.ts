import { Component, Input } from '@angular/core';
import { TimesIcon } from '../../icons';



@Component({
  selector: 'nc-pill',
  standalone: true,
  templateUrl: './pill.component.html',
  styleUrl: './pill.component.css',
  imports: [TimesIcon]
})



export class Pill {
  @Input() style: { [key: string]: string } = {};
  @Input() class: string = '';
  @Input() id: string = '';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() closable: boolean = false;
  @Input() onClose: () => void = () => {};
}
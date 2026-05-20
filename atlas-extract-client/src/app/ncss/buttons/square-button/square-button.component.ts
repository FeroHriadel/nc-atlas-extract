import { Component, Input } from '@angular/core';



@Component({
  selector: 'nc-square-button',
  standalone: true,
  imports: [],
  templateUrl: './square-button.component.html',
  styleUrl: './square-button.component.css',
})



export class SquareButton {
  @Input() class?: string = '';
  @Input() style?: { [key: string]: string } = {};
  @Input() id?: string = '';
  @Input() size?: string = '2.5rem';
  @Input() disabled?: boolean = false;
  @Input() type?: 'button' | 'submit' = 'button';
  @Input() onClick?: () => void;
  @Input() variant?: 'dark' | 'outline' | 'ghost' | 'red' = 'ghost';
  @Input() ariaLabel?: string = 'button';
}

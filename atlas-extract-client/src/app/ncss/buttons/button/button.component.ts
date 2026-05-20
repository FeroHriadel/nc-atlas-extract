import { Component, Input } from '@angular/core';



@Component({
  selector: 'nc-button',
  standalone: true,
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.css',
})



export class Button {
  @Input() class?: string = '';
  @Input() style?: { [key: string]: string } = {};
  @Input() id?: string = '';
  @Input() width?: string = '';
  @Input() disabled?: boolean = false;
  @Input() type?: 'button' | 'submit' = 'button';
  @Input() onClick?: () => void;
  @Input() variant?: 'dark' | 'outline' | 'ghost' | 'red' = 'dark';
  @Input() ariaLabel?: string = 'button';
  @Input() title?: string = '';
  @Input() size?: 'small' | 'medium' | 'large' = 'medium';
}
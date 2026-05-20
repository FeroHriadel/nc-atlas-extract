import { Component, Input } from '@angular/core';



@Component({
  selector: 'nc-card',
  standalone: true,
  imports: [],
  templateUrl: './card.component.html',
  styleUrl: './card.component.css',
})



export class Card {
  @Input() class?: string = '';
  @Input() style?: { [key: string]: string } = {};
  @Input() id?: string = '';
  @Input() width?: string = '100%';
  @Input() onClick?: () => void = () => {};
}
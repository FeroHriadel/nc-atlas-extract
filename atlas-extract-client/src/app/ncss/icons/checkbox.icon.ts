import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'nc-checkbox-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.id]="id()"
      [attr.class]="class()"
      [ngStyle]="style()"
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 512 512"
      [attr.stroke]="color()"
      [attr.fill]="color()"
      stroke-width="0"
      xmlns="http://www.w3.org/2000/svg"
      [style.display]="'inline-block'"
      [style.vertical-align]="'middle'"
    >
      <path
        fill="none"
        [attr.stroke]="color()"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="32"
        d="M352 176 217.6 336 160 272"
      ></path>
      <rect
        width="384"
        height="384"
        x="64"
        y="64"
        fill="none"
        [attr.stroke]="color()"
        stroke-linejoin="round"
        stroke-width="32"
        rx="48"
        ry="48"
      ></rect>
    </svg>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
  `],
})

export class CheckboxIcon {
  size = input<number>(24);
  color = input<string>('currentColor');
  class = input<string>('');
  id = input<string>('');
  style = input<{ [key: string]: string }>({});
}

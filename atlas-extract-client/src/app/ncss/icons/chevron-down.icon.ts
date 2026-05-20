import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'nc-chevron-down-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.id]="id()"
      [attr.class]="class()"
      [ngStyle]="style()"
      [attr.width]="size()"
      [attr.height]="size()"
      [attr.viewBox]="'0 0 ' + size() + ' ' + size()"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      [style.display]="'inline-block'"
      [style.vertical-align]="'middle'"
    >
      <g [attr.transform]="'scale(' + size() / 24 + ')'">
        <path
          d="M6 9l6 6 6-6"
          [attr.stroke]="color()"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
        />
      </g>
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

export class ChevronDownIcon {
  size = input<number>(24);
  color = input<string>('currentColor');
  class = input<string>('');
  id = input<string>('');
  style = input<{ [key: string]: string }>({});
}

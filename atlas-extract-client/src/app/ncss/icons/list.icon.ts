import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'nc-list-icon',
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
        <!-- First row -->
        <rect
          x="3"
          y="4"
          width="3"
          height="3"
          [attr.fill]="color()"
        />
        <rect
          x="8"
          y="4"
          width="13"
          height="3"
          [attr.fill]="color()"
        />
        <!-- Second row -->
        <rect
          x="3"
          y="10.5"
          width="3"
          height="3"
          [attr.fill]="color()"
        />
        <rect
          x="8"
          y="10.5"
          width="13"
          height="3"
          [attr.fill]="color()"
        />
        <!-- Third row -->
        <rect
          x="3"
          y="17"
          width="3"
          height="3"
          [attr.fill]="color()"
        />
        <rect
          x="8"
          y="17"
          width="13"
          height="3"
          [attr.fill]="color()"
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

export class ListIcon {
  size = input<number>(24);
  color = input<string>('currentColor');
  class = input<string>('');
  id = input<string>('');
  style = input<{ [key: string]: string }>({});
}

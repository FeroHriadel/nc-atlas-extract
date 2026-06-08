import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-sample-text-output',
  imports: [],
  templateUrl: './sample-text-output.component.html',
})
export class SampleTextOutputComponent {
  @Input() sampleText = '';
  @Input() loading = false;
}

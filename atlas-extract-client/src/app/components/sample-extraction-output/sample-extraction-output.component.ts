import { Component, inject } from '@angular/core';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { ExtractionService } from '../../services/extraction.service';

@Component({
  selector: 'app-sample-extraction-output',
  imports: [AsyncPipe, JsonPipe],
  templateUrl: './sample-extraction-output.component.html',
})
export class SampleExtractionOutputComponent {
  public extractionService = inject(ExtractionService);
}

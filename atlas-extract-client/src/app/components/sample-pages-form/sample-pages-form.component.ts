import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { getDocument } from 'pdfjs-dist';
import { Button } from '../../ncss/buttons/button/button.component';
import { ToastService } from '../../ncss/services/toast.service';

@Component({
  selector: 'app-sample-pages-form',
  imports: [Button],
  templateUrl: './sample-pages-form.component.html',
})
export class SamplePagesFormComponent {
  private toast = inject(ToastService);

  @Input() sourceUrl!: string;
  @Input() totalPages = 0;
  @Output() sampleTextChange = new EventEmitter<string>();
  @Output() sampleTextLoadingChange = new EventEmitter<boolean>();

  public async getSampleText(startVal: string, endVal: string): Promise<void> {
    const start = parseInt(startVal);
    const end   = parseInt(endVal);

    if (!start || !end || start < 1 || end < start) {
      this.toast.error({ text: 'Please enter a valid page range.' });
      return;
    }
    if (this.totalPages && end > this.totalPages) {
      this.toast.error({ text: `Page range exceeds the document length (${this.totalPages} pages).` });
      return;
    }
    if (end - start + 1 > 50) {
      this.toast.error({ text: 'Page range cannot exceed 50 pages.' });
      return;
    }

    this.sampleTextLoadingChange.emit(true);
    this.sampleTextChange.emit('');

    const pdf = await getDocument(this.sourceUrl).promise;
    let result = '';
    for (let pageNum = start; pageNum <= end; pageNum++) {
      const page    = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const text    = content.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');
      result += `\n--- Page ${pageNum} ---\n${text}`;
    }

    this.sampleTextChange.emit(result);
    this.sampleTextLoadingChange.emit(false);
    setTimeout(() => {
      document.getElementById('describe-structure-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }
}

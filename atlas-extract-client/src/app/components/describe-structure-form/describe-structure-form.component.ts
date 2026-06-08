import { AfterViewInit, ChangeDetectorRef, Component, Input, inject } from '@angular/core';
import { filter, take } from 'rxjs/operators';
import { ExtractionService } from '../../services/extraction.service';
import { FormService } from '../../ncss/services/form.service';
import { ToastService } from '../../ncss/services/toast.service';
import { ExtractSampleReq } from '../../types/ExtractSampleReq';
import { Button } from '../../ncss/buttons/button/button.component';

@Component({
  selector: 'app-describe-structure-form',
  imports: [Button],
  templateUrl: './describe-structure-form.component.html',
})
export class DescribeStructureFormComponent implements AfterViewInit {
  private cdr = inject(ChangeDetectorRef);
  private extractionService = inject(ExtractionService);
  private formService = inject(FormService);
  private toast = inject(ToastService);

  @Input() sampleText!: string;
  @Input() sourceId!: string;
  @Input() totalPages = 0;

  public submitting = false;
  public readonly formId = 'sample-extraction-form';
  private readonly descriptionStorageKey = 'sampleDescription';

  ngAfterViewInit(): void {
    // the form's DOM must exist before FormService can query it by id — not yet the case in ngOnInit
    this.loadDescription();
  }

  private checkPayload(payload: ExtractSampleReq): string | null {
    const errors: string[] = [];
    if (!payload.text) errors.push('Sample text is empty. Please extract sample text from the PDF first.');
    if (!payload.sourceLanguage) errors.push('Source language is required.');
    if (!payload.sourceTopic) errors.push('Source topic is required.');
    if (!payload.structureDescription) errors.push('Structure description is required.');
    return errors.length ? errors.join(' ') : null;
  }

  public extractSample(e: Event): void {
    e.preventDefault();
    const formValues = this.formService.getFormValues(this.formId);
    const payload: ExtractSampleReq = {
      text: this.sampleText,
      startPage: parseInt(formValues['startPage'] as string) || 1,
      endPage: parseInt(formValues['endPage'] as string) || this.totalPages,
      sourceId: this.sourceId,
      sourceLanguage: formValues['sourceLanguage'] as string,
      sourceTopic: formValues['sourceTopic'] as string,
      structureDescription: formValues['structureDescription'] as string,
      ignore: formValues['ignore'] as string,
      descriptionLength: formValues['descriptionLength'] as string,
      additionalInstructions: formValues['additionalInstructions'] as string,
    };
    const error = this.checkPayload(payload);
    if (error) {
      this.submitting = false;
      this.toast.error({ text: error });
      return;
    }
    this.submitting = true;
    this.extractionService.extractSample(payload);

    this.extractionService.extractSampleRes$
      .pipe(filter(v => !!v), take(1))
      .subscribe(() => {
        this.submitting = false;
        this.cdr.detectChanges();
        setTimeout(() => document.getElementById('sample-extraction-output')?.scrollIntoView({ behavior: 'smooth' }), 50);
      });

    this.extractionService.extractSampleErr$
      .pipe(filter(v => !!v), take(1))
      .subscribe(() => { this.submitting = false; });
  }

  public saveDescription(): void {
    const formValues = this.formService.getFormValues(this.formId);
    localStorage.setItem(this.descriptionStorageKey, JSON.stringify(formValues));
    this.toast.toast({ text: 'Description saved' });
  }

  private loadDescription(): void {
    const stringified = localStorage.getItem(this.descriptionStorageKey);
    if (!stringified) return;
    this.formService.setFormValues(this.formId, JSON.parse(stringified));
  }

  public clearDescription(): void {
    localStorage.removeItem(this.descriptionStorageKey);
    this.formService.clearFormValues(this.formId);
  }
}

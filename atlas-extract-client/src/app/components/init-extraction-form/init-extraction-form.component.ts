import { Component, Input, OnInit } from '@angular/core';
import { Card } from '../../ncss/cards/card/card.component';
import { Button } from '../../ncss/buttons/button/button.component';
import { WarningIcon } from '../../ncss/icons/warning.icon';
import { ExtractionService } from '../../services/extraction.service';
import { FormService } from '../../ncss/services/form.service';
import { AsyncPipe } from '@angular/common';
import { ToastService } from '../../ncss/services/toast.service';
import { Router } from '@angular/router';
import { filter, take } from 'rxjs';



@Component({
  selector: 'app-init-extraction-form',
  standalone: true,
  imports: [Card, Button, WarningIcon, AsyncPipe],
  templateUrl: './init-extraction-form.component.html',
})



export class InitExtractionFormComponent implements OnInit {
  @Input() sourceId!: string;
  @Input() totalPages = 0;

  public readonly formId = 'init-extraction-form';
  public readonly sampleExtractionFormId = 'sample-extraction-form';


  constructor(
    public extractionService: ExtractionService,
    private formService: FormService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.redirectAfterExtraction();
  }

  private redirectAfterExtraction() {
    this.extractionService.extractionStartRes$.pipe(filter(res => !!res), take(1)).subscribe(res => {
      this.router.navigate(['/extraction', res.extractionId]);
    });
  }

  private validatePageRanges(pageRanges: string): boolean {
    const rangePattern = /^\s*(\d+\s*-\s*\d+)\s*(,\s*(\d+\s*-\s*\d+)\s*)*$/;
    if (!rangePattern.test(pageRanges)) return false;
    return pageRanges.split(',').every(range => {
      const [start, end] = range.split('-').map(n => parseInt(n.trim(), 10));
      return start >= 1 && end <= this.totalPages && start <= end;
    });
  }

  private isFormValid(payload: { [key: string]: any }): boolean {
    let isValid = true;
    const requiredFields = ['friendlyName', 'pageRanges', 'sourceLanguage', 'sourceTopic', 'structureDescription', 'descriptionLength'];
    if (!this.validatePageRanges(payload['pageRanges'] || '')) {
      this.toastService.error({ text: 'Page ranges are invalid. Please use the format "1-5, 8-10".', duration: 3000 });
      isValid = false;
    }
    requiredFields.forEach(field => {
      if (!payload[field]) {
        this.toastService.error({ text: `${field} is required.`, duration: 3000 });
        isValid = false;
      }
    });
    return isValid;
  }

  public onInitExtraction(event: Event): void {
    event.preventDefault();
    const initExtractionData = this.formService.getFormValues(this.formId);
    const sampleExtractionData = this.formService.getFormValues(this.sampleExtractionFormId);
    const payload: { [key: string]: any } = {
      ...initExtractionData,
      ...sampleExtractionData,
      sourceId: this.sourceId
    };
    if (!this.isFormValid(payload)) return;
    const { friendlyName, pageRanges: pageRangesStr, sourceLanguage, sourceTopic, structureDescription, ignore, descriptionLength, additionalInstructions } = payload;
    const pageRanges = pageRangesStr.split(',').map((range: string) => {
      const [start, end] = range.split('-').map((n: string) => parseInt(n.trim(), 10));
      return { startPage: start, endPage: end };
    });
    this.extractionService.startExtraction({
      pageRanges,
      friendlyName,
      sourceId: this.sourceId,
      sourceLanguage,
      sourceTopic,
      structureDescription,
      ignore,
      descriptionLength,
      additionalInstructions
    });
  }

}

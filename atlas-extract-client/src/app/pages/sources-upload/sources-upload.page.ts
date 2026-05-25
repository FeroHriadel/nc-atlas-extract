import { Component, inject, OnInit } from '@angular/core';
import { Card } from '../../ncss/cards/card/card.component';
import { Button } from '../../ncss/buttons/button/button.component';
import { AppContainer } from '../../components/app-container/app-container.component';
import { FileUpload } from '../../ncss/inputs/file-upload/file-upload.component';
import { FormService } from '../../ncss/services/form.service';
import { ToastService } from '../../ncss/services/toast.service';
import { CheckIcon } from '../../ncss/icons';
import { UploadService } from '../../services/upload.service';
import { AsyncPipe, NgClass } from '@angular/common';



@Component({
  selector: 'app-sources-upload',
  templateUrl: './sources-upload.page.html',
  styleUrls: ['./sources-upload.page.css'],
  standalone: true,
  imports: [AppContainer, Card, Button, FileUpload, CheckIcon, AsyncPipe, NgClass]
})



export class SourcesUploadPage implements OnInit {
    private formService = inject(FormService);
    private toastService = inject(ToastService);
    public uploadService = inject(UploadService);
    public formId: string = 'source-upload-form';
    public sourceType: string = "";
    public submitting: boolean = false;


    ngOnInit(): void {

    }


    public onTypeChange(event: Event): void {
        const selectElement = event.target as HTMLSelectElement;
        const selectedType = selectElement.value;
        this.sourceType = selectedType;
    }

    public checkPdfForm(formValues: {[key: string]: any}): boolean {
        let isValid = true;
        let errors = [];
        if (!formValues['friendlyName'] || (formValues['friendlyName'] as string).trim() === '') {
            errors.push('Friendly Name is required');
            isValid = false;
        }
        if (!formValues['file'] || (formValues['file'] as File[]).length === 0) {
            errors.push('PDF file is required');
            isValid = false;
        }
        if (errors.length > 0) {
            this.toastService.error({ text: errors.join(' and ') });
        }
        return isValid;
    }

    public onPdfSubmit(e: Event): void {
        e.preventDefault();
        if (this.submitting) return;
        const formValues = this.formService.getFormValues(this.formId);
        if (!this.checkPdfForm(formValues)) return;
        this.submitting = true;
        const file: File = (formValues['file'] as File[])[0];
        this.uploadService.initUpload(file);
    }

}
import { Component, inject } from '@angular/core';
import { Card } from '../../ncss/cards/card/card.component';
import { Button } from '../../ncss/buttons/button/button.component';
import { AppContainer } from '../../components/app-container/app-container.component';
import { FileUpload } from '../../ncss/inputs/file-upload/file-upload.component';
import { FormService } from '../../ncss/services/form.service';
import { ToastService } from '../../ncss/services/toast.service';


@Component({
  selector: 'app-sources-upload',
  templateUrl: './sources-upload.page.html',
  styleUrls: ['./sources-upload.page.css'],
  standalone: true,
  imports: [AppContainer, Card, Button, FileUpload]
})



export class SourcesUploadPage {
    private formService = inject(FormService);
    private toastService = inject(ToastService);
    public formId: string = 'source-upload-form';
    public sourceType: string = "";
    public submitting: boolean = false;
    public uploadStage: string = "none";

    public uploadStages: {[key: string]: string} = {
        "none": "No upload in progress. Please select a source type to start.",
        "type selected": "Source type selected. Please fill out the form and submit to start upload.",
    };

    public onTypeChange(event: Event): void {
        const selectElement = event.target as HTMLSelectElement;
        const selectedType = selectElement.value;
        this.sourceType = selectedType;
        this.uploadStage = "type selected";
    }

    public checkPdfForm(formValues: {[key: string]: any}): boolean {
        let isValid = true;
        let errors = [];
        if (!formValues['friendlyName'] || (formValues['friendlyName'] as string).trim() === '') {
            errors.push('Friendly Name is required');
            isValid = false;
        }
        if (!formValues['file']) {
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
        console.log('Form values:', formValues);
    }

}
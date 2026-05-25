import { Component, inject, OnInit } from '@angular/core';
import { Card } from '../../ncss/cards/card/card.component';
import { Button } from '../../ncss/buttons/button/button.component';
import { AppContainer } from '../../components/app-container/app-container.component';
import { FileUpload } from '../../ncss/inputs/file-upload/file-upload.component';
import { FormService } from '../../ncss/services/form.service';
import { ToastService } from '../../ncss/services/toast.service';
import { CheckIcon } from '../../ncss/icons';
import { UploadService } from '../../services/upload.service';
import { SourcesService } from '../../services/sources.service';
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
    private sourcesService = inject(SourcesService);
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

    public async onPdfSubmit(e: Event): Promise<void> {
        e.preventDefault();
        if (this.submitting) return;
        const formValues = this.formService.getFormValues(this.formId);
        if (!this.checkPdfForm(formValues)) return;
        this.submitting = true;
        const file: File = (formValues['file'] as File[])[0];

        try {
            const { uploadId, objectKey } = await this.uploadService.initUpload(file);
            const parts = await this.uploadService.uploadParts(file, uploadId, objectKey);
            await this.uploadService.completeUpload(uploadId, objectKey, parts);
            await this.sourcesService.createSource({
                friendlyName: formValues['friendlyName'] as string,
                title:        formValues['title']        as string || '',
                author:       formValues['author']       as string || '',
                description:  formValues['description']  as string || '',
                isbn:         formValues['ISBN']         as string || '',
                type:         this.sourceType,
                url:          '',
                objectKey,
            });
        } catch (err) {
            // errors are toasted inside the service — just unblock the form
        } finally {
            this.submitting = false;
        }
    }

}
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
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



export class SourcesUploadPage implements OnInit, OnDestroy {
    private formService = inject(FormService);
    private toastService = inject(ToastService);
    private sourcesService = inject(SourcesService);
    public uploadService = inject(UploadService);
    public formId: string = 'source-upload-form';
    public sourceType: string = "pdf";
    public submitting: boolean = false;


    ngOnInit(): void {
        window.addEventListener('beforeunload', this.onBeforeUnload);
    }

    ngOnDestroy(): void {
        window.removeEventListener('beforeunload', this.onBeforeUnload);
    }

    private onBeforeUnload = (e: BeforeUnloadEvent): void => {
        if (this.uploadService.isUploading.getValue()) {
            e.preventDefault();
        }
    };


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

    public async onAbort(): Promise<void> {
        const confirmed = confirm('Abort the upload? All progress will be lost.');
        if (!confirmed) return;

        const { activeUploadId, activeObjectKey } = this.uploadService;
        if (activeUploadId && activeObjectKey) {
            await this.uploadService.abortUpload(activeUploadId, activeObjectKey);
        } else {
            this.uploadService.reset();
        }

        this.submitting = false;
        this.formService.clearFormValues(this.formId);
    }

    public async onPdfSubmit(e: Event): Promise<void> {
        e.preventDefault();
        if (this.submitting) return;
        const formValues = this.formService.getFormValues(this.formId);
        if (!this.checkPdfForm(formValues)) return;
        this.submitting = true;
        const file: File = (formValues['file'] as File[])[0];

        let uploadId: string | null = null;
        let objectKey: string | null = null;

        try {
            ({ uploadId, objectKey } = await this.uploadService.initUpload(file));
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
            // Abort the multipart upload so S3 doesn't hold partial parts
            if (uploadId && objectKey) {
                await this.uploadService.abortUpload(uploadId, objectKey);
            }
        } finally {
            this.submitting = false;
            this.formService.clearFormValues(this.formId);
        }
    }

}
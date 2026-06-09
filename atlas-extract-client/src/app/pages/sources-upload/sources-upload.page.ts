import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Card } from '../../ncss/cards/card/card.component';
import { Button } from '../../ncss/buttons/button/button.component';
import { AppContainer } from '../../components/app-container/app-container.component';
import { FileUpload } from '../../ncss/inputs/file-upload/file-upload.component';
import { CheckIcon } from '../../ncss/icons';
import { FormService } from '../../ncss/services/form.service';
import { ToastService } from '../../ncss/services/toast.service';
import { UploadService } from '../../services/upload.service';
import { SourcesService } from '../../services/sources.service';



@Component({
  selector: 'app-sources-upload',
  templateUrl: './sources-upload.page.html',
  styleUrl: './sources-upload.page.css',
  imports: [AppContainer, Card, Button, FileUpload, CheckIcon, AsyncPipe, RouterLink]
})
export class SourcesUploadPage implements OnInit, OnDestroy {
    private readonly formService = inject(FormService);
    private readonly toastService = inject(ToastService);
    private readonly sourcesService = inject(SourcesService);
    private readonly uploadService = inject(UploadService);

    protected readonly formId = 'source-upload-form';
    protected sourceType = 'pdf';
    protected submitting = false;
    protected uploadComplete = false;
    protected readonly messages$ = this.uploadService.messages$;

    ngOnInit(): void {
        window.addEventListener('beforeunload', this.onBeforeUnload);
    }

    ngOnDestroy(): void {
        window.removeEventListener('beforeunload', this.onBeforeUnload);
    }

    private readonly onBeforeUnload = (e: BeforeUnloadEvent): void => {
        if (this.uploadService.isUploadingNow) e.preventDefault();
    };

    protected onTypeChange(event: Event): void {
        this.sourceType = (event.target as HTMLSelectElement).value;
    }

    protected async onAbort(): Promise<void> {
        if (!confirm('Abort the upload? All progress will be lost.')) return;
        await this.uploadService.tryAbort();
        this.submitting = false;
        this.uploadComplete = false;
        this.formService.clearFormValues(this.formId);
    }

    protected async onPdfSubmit(e: Event): Promise<void> {
        e.preventDefault();
        if (this.submitting) return;
        const formValues = this.formService.getFormValues(this.formId);
        if (!this.checkPdfForm(formValues)) return;

        this.submitting = true;
        this.uploadComplete = false;
        const file = (formValues['file'] as File[])[0];

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
            this.uploadComplete = true;
            setTimeout(() => this.uploadService.reset(), 2000);
        } catch {
            if (uploadId && objectKey) await this.uploadService.tryAbort();
        } finally {
            this.submitting = false;
            this.formService.clearFormValues(this.formId);
        }
    }

    private checkPdfForm(formValues: { [key: string]: any }): boolean {
        const errors: string[] = [];
        if (!formValues['friendlyName'] || (formValues['friendlyName'] as string).trim() === '')
            errors.push('Friendly Name is required');
        if (!formValues['file'] || (formValues['file'] as File[]).length === 0)
            errors.push('PDF file is required');
        if (errors.length > 0) this.toastService.error({ text: errors.join(' and ') });
        return errors.length === 0;
    }
}

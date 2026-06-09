import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { UploadService } from '../services/upload.service';



export const uploadActiveGuard: CanDeactivateFn<unknown> = async () => {
    const uploadService = inject(UploadService);

    if (!uploadService.isUploadingNow) return true;

    const confirmed = confirm(
        'An upload is in progress. Navigating away will abort it. Leave anyway?'
    );

    if (confirmed) await uploadService.tryAbort();

    return confirmed;
};

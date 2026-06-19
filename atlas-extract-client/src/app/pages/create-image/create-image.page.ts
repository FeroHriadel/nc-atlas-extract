import { ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { AppContainer } from '../../components/app-container/app-container.component';
import { Card } from '../../ncss/cards/card/card.component';
import { Button } from '../../ncss/buttons/button/button.component';
import { FormService } from '../../ncss/services/form.service';
import { ToastService } from '../../ncss/services/toast.service';
import { ImageService } from '../../services/image.service';
import { CreateImageReq } from '../../types/CreateImageReq';

@Component({
  selector: 'app-create-image',
  imports: [AppContainer, Card, Button],
  templateUrl: './create-image.page.html',
  styleUrl: './create-image.page.css',
})
export class CreateImagePage implements OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly formService = inject(FormService);
  private readonly toast = inject(ToastService);
  private readonly imageService = inject(ImageService);

  public readonly formId = 'create-image-form';
  protected submitting = false;
  protected image1024Url: string | null = null;
  protected image350Url: string | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private checkPayload(payload: CreateImageReq): string | null {
    const errors: string[] = [];
    if (!payload.title) errors.push('Title is required.');
    if (!payload.description) errors.push('Description is required.');
    if (!payload.category) errors.push('Category is required.');
    return errors.length ? errors.join(' ') : null;
  }

  protected async createImage(e: Event): Promise<void> {
    e.preventDefault();
    const formValues = this.formService.getFormValues(this.formId);
    const tagsRaw = (formValues['tags'] as string) ?? '';
    const payload: CreateImageReq = {
      title: formValues['title'] as string,
      description: formValues['description'] as string,
      category: formValues['category'] as string,
      tags: tagsRaw.split(',').map(t => t.trim()).filter(t => !!t),
    };

    const error = this.checkPayload(payload);
    if (error) {
      this.toast.error({ text: error });
      return;
    }

    this.submitting = true;
    this.image1024Url = null;
    this.image350Url = null;

    try {
      const { jobId } = await this.imageService.createImage(payload);
      this.startPolling(jobId);
    } catch (err) {
      this.submitting = false;
      this.toast.error({ text: 'Failed to start image generation' });
      console.error('Error starting image generation:', err);
      this.cdr.detectChanges();
    }
  }

  private startPolling(jobId: string): void {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(async () => {
      try {
        const status = await this.imageService.getImageJobStatus(jobId);
        if (status.status === 'completed') {
          this.stopPolling();
          this.submitting = false;
          this.image1024Url = status.image1024Url ?? null;
          this.image350Url = status.image350Url ?? null;
          this.cdr.detectChanges();
        } else if (status.status === 'failed') {
          this.stopPolling();
          this.submitting = false;
          this.toast.error({ text: 'Image generation failed' });
          this.cdr.detectChanges();
        }
      } catch (err) {
        this.stopPolling();
        this.submitting = false;
        this.toast.error({ text: 'Failed to check image generation status' });
        console.error('Error polling image job status:', err);
        this.cdr.detectChanges();
      }
    }, 3000);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // <img> loads/errors outside Angular's tracked context — force a refresh so the page doesn't
  // need an unrelated click to repaint once the browser finishes fetching the image bytes
  protected onImageLoad(): void {
    this.cdr.detectChanges();
  }

  protected async downloadImage(url: string, filename: string): Promise<void> {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      this.toast.error({ text: 'Failed to download image' });
      console.error('Error downloading image:', err);
    }
  }
}

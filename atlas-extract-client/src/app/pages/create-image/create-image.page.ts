import { ChangeDetectorRef, Component, inject } from '@angular/core';
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
export class CreateImagePage {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly formService = inject(FormService);
  private readonly toast = inject(ToastService);
  private readonly imageService = inject(ImageService);

  public readonly formId = 'create-image-form';
  protected submitting = false;
  protected image1024B64: string | null = null;
  protected image350B64: string | null = null;

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
    this.image1024B64 = null;
    this.image350B64 = null;

    try {
      const res = await this.imageService.createImage(payload);
      this.image1024B64 = res.image;
      this.image350B64 = await this.makeThumbnailB64(res.image);
    } catch (err) {
      this.toast.error({ text: 'Failed to generate image' });
      console.error('Error generating image:', err);
    } finally {
      this.submitting = false;
      this.cdr.detectChanges();
    }
  }

  private makeThumbnailB64(base64: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 350;
        canvas.height = 350;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, 350, 350);
        resolve(canvas.toDataURL('image/png').split(',')[1]);
      };
      img.onerror = () => reject(new Error('Failed to load generated image'));
      img.src = `data:image/png;base64,${base64}`;
    });
  }

  protected downloadImage(base64: string, filename: string): void {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

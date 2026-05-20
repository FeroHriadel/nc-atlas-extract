// ng component
import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { CloseButton } from '../../buttons/close-button/close-button.component';
import { Button } from '../../buttons/button/button.component';



@Component({
  selector: 'nc-modal',
  standalone: true,
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.css'],
  imports: [CloseButton, Button]
})



export class Modal {
  @Input() id: string = '';
  @Input() class: string = '';
  @Input() style: { [key: string]: string } = {};
  @Input() width: string = '';
  @Input() height: string = '';
  @Input() closeButton: boolean = true;
  @Input() actionButtons: boolean = true;
  @Input() onConfirm: () => void = () => {};
  @Input() onClose: () => void = () => {};
  @ViewChild('modal') modal!: ElementRef<HTMLDialogElement>;

  public isOpen(): boolean {
    return this.modal.nativeElement.open;
  }

  public openModal(): void {
    this.modal.nativeElement.showModal();
  }

  public closeModal(): void {
    if (this.onClose) this.onClose();
    this.modal.nativeElement.close();
  }

  public confirm(): void {
    if (this.onConfirm) this.onConfirm();
    this.closeModal();
  }

}
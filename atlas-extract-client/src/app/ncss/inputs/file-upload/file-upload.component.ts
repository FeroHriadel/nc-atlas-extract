import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { TimesIcon } from '../../icons';




export interface SelectOption {
  value: string;
  label: string;
}




@Component({
  selector: 'nc-file-upload',
  standalone: true,
  imports: [TimesIcon],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.css',
})



export class FileUpload {
    @Input() class?: string = '';
    @Input() style?: { [key: string]: string } = {};
    @Input() inputClass?: string = '';
    @Input() inputStyle?: { [key: string]: string } = {};
    @Input() id?: string = '';
    @Input() width?: string = '';
    @Input() placeholder: string = '';
    @Input() placeholderClass?: string = '';
    @Input() placeholderStyle?: { [key: string]: string } = {};
    @Input() closeButtonClass?: string = '';
    @Input() closeButtonStyle?: { [key: string]: string } = {};
    @Input() disabled: boolean = false;
    @Input() onChange: (value: File | File[] | null) => void = () => {};
    @Input() name: string = '';
    @Input() accept: string = '*';
    @Input() multiple: boolean = false;
    @ViewChild('fileInputRef') fileInputRef!: ElementRef<HTMLInputElement>;

    selectedFiles: File | File[] | null = null;


    onFileUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files) {
            const files = input.files.length === 1 ? input.files[0] : Array.from(input.files);
            this.selectedFiles = files;
            this.onChange(files);
        } else {
            this.selectedFiles = null;
            this.onChange(null);
        }
    }

    public clearFileInput(event: Event) {
        event.stopPropagation();
        this.fileInputRef.nativeElement.value = '';
        this.selectedFiles = null;
        this.onChange(null);
    }

    public clickFileInput() {
        this.fileInputRef.nativeElement.click();
    }

    public getFiles = () => {
        const files = this.fileInputRef.nativeElement.files;
        if (files) {
            return files.length === 1 ? files[0] : Array.from(files);
        } else {
            return null;
        }
    }

    getFileInputText = () => {
        if (!this.selectedFiles) {
            return this.placeholder || 'Choose a file';
        } else if (this.selectedFiles instanceof File) {
            return this.selectedFiles.name;
        } else if (Array.isArray(this.selectedFiles)) {
            return this.selectedFiles.length + ' files selected';
        } else {
            return '';
        }
    }
        
}
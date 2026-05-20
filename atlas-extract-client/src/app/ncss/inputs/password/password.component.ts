import { Component, HostListener, Input, ViewChild, ElementRef, OnInit } from '@angular/core';
import { EyeIcon, EyeCrossedIcon } from '../../icons';
import { SquareButton } from '../../buttons/square-button/square-button.component';




export interface SelectOption {
  value: string;
  label: string;
}




@Component({
  selector: 'nc-password',
  standalone: true,
  imports: [EyeIcon, EyeCrossedIcon, SquareButton],
  templateUrl: './password.component.html',
  styleUrl: './password.component.css',
})



export class Password implements OnInit {
  @Input() class?: string = '';
  @Input() style?: { [key: string]: string } = {};
  @Input() inputClass?: string = '';
  @Input() inputStyle?: { [key: string]: string } = {};
  @Input() id?: string = '';
  @Input() width?: string = '';
  @Input() onClick?: () => void = () => {};
  @Input() placeholder: string = '';
  @Input() disabled: boolean = false;
  @Input() value: string = '';
  @Input() onChange: (value: string) => void = () => {};
  @Input() name: string = '';
  @Input() minLength?: number;
  @Input() maxLength?: number;
  @Input() required: boolean = false;
  @Input() defaultValue: string = '';

  @ViewChild('passwordInputRef') passwordInputRef!: ElementRef<HTMLInputElement>;
  public isPasswordVisible: boolean = false;

  ngOnInit() {
    if (this.defaultValue && !this.value) {
      this.value = this.defaultValue;
    }
  }

  togglePasswordVisibility() {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  onInputChange(event: any) {
    this.value = event.target.value;
    this.onChange(this.value);
  }

  @HostListener('nc-clear')
  onClear() {
    this.clear();
  }

  @HostListener('nc-set-value', ['$event'])
  onSetValue(event: Event) {
    const customEvent = event as CustomEvent;
    if (customEvent.detail && 'value' in customEvent.detail) {
      this.setValue(customEvent.detail.value);
    }
  }

  public getValue() {
    return this.value;
  }

  public setValue(value: string) {
    this.value = value;
    this.passwordInputRef.nativeElement.value = value;
  }

  public clear() {
    this.setValue('');
  }
}
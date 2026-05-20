// ng component
import { Component, HostListener, Input, OnInit } from '@angular/core';



@Component({
  selector: 'nc-switch',
  standalone: true,
  imports: [],
  templateUrl: './switch.component.html',
  styleUrl: './switch.component.css',
})



export class Switch implements OnInit {
    @Input() class?: string = '';
    @Input() style?: { [key: string]: string } = {};
    @Input() id?: string = ''
    @Input() onChange?: () => void = () => {};
    @Input() disabled: boolean = false;
    @Input() name?: string = '';
    @Input() checked?: boolean = false;
    @Input() label?: string = '';

    public isChecked: boolean = false;

    ngOnInit() {
        this.isChecked = this.checked ?? false;
    }

    
    toggleChecked() {
        this.isChecked = !this.isChecked;
        if (this.onChange) { this.onChange(); }
    }

    @HostListener('nc-clear')
    onClear() {
        this.isChecked = false;
    }

    @HostListener('nc-set-value', ['$event'])
    onSetValue(event: Event) {
        const customEvent = event as CustomEvent;
        if (customEvent.detail && 'value' in customEvent.detail) {
            this.setValue(customEvent.detail.value);
        }
    }

    public getValue() {
        return this.isChecked;
    }

    public setValue(value: boolean) {
        this.isChecked = value;
    }

}
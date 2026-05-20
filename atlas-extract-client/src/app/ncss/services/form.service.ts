import { Injectable } from '@angular/core';



@Injectable({
  providedIn: 'root'
})



export class FormService {

  // Get Elements with [name] attribute
  private getFormElements(formId: string): Element[] {
    const form = document.getElementById(formId);
    if (!form) throw new Error(`Form with id "${formId}" not found`);

    // Get all elements with a [name] attribute
    const elements = form.querySelectorAll('[name]');
    return Array.from(elements);
  }


  // Get form values
  public getFormValues(formId: string): { [key: string]: string | string[] | boolean } {
    const elements = this.getFormElements(formId);
    const formValues: { [key: string]: string | string[] | boolean } = {};

    elements.forEach((element) => {
      const name = element.getAttribute('name');
      if (!name) return; // skip elements without name

      // Try to get value from data-value attribute first
      const dataValue = element.getAttribute('data-value');
      
      if (dataValue !== null && dataValue !== '') {
        // Parse booleans
        if (dataValue === 'true') {
          formValues[name] = true;
        } else if (dataValue === 'false') {
          formValues[name] = false;
        }
        // Parse if it looks like JSON array
        else {
          try {
            if (dataValue.startsWith('[') && dataValue.endsWith(']')) {
              formValues[name] = JSON.parse(dataValue);
            } else {
              formValues[name] = dataValue;
            }
          } catch (e) {
            formValues[name] = dataValue;
          }
        }
      }
      // Otherwise try to get value from .value property (native form elements)
      else if ('value' in element) {
        const htmlElement = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        
        // Handle checkboxes (multiple values with same name)
        if (htmlElement instanceof HTMLInputElement && htmlElement.type === 'checkbox') {
          if (htmlElement.checked) {
            if (formValues[name]) {
              // Convert to array if not already
              if (!Array.isArray(formValues[name])) {
                formValues[name] = [formValues[name] as string];
              }
              (formValues[name] as string[]).push(htmlElement.value);
            } else {
              formValues[name] = htmlElement.value;
            }
          }
        }
        // Handle radio buttons
        else if (htmlElement instanceof HTMLInputElement && htmlElement.type === 'radio') {
          if (htmlElement.checked) {
            formValues[name] = htmlElement.value;
          }
        }
        // Handle all other native form elements
        else {
          formValues[name] = htmlElement.value;
        }
      }
    });

    return formValues;
  }


  // Clear form values
  public clearFormValues(formId: string): void {
    const elements = this.getFormElements(formId);

    elements.forEach((element) => {
      const name = element.getAttribute('name');
      if (!name) return; // skip elements without name

      const tagName = element.tagName.toLowerCase();

      // Handle nc-select components
      if (tagName === 'nc-select') {
        const isMultiple = element.hasAttribute('multiple');
        const emptyValue = isMultiple ? '[]' : '';
        
        // Set data-value to proper empty value
        element.setAttribute('data-value', emptyValue);
        
        // Dispatch custom event to notify component to clear
        element.dispatchEvent(new CustomEvent('nc-clear', { bubbles: true }));
        return;
      }

      // Handle nc-checkbox and nc-switch components
      if (tagName === 'nc-checkbox' || tagName === 'nc-switch') {
        // Set data-value to false (unchecked state)
        element.setAttribute('data-value', 'false');
        
        // Dispatch custom event to notify component to clear
        element.dispatchEvent(new CustomEvent('nc-clear', { bubbles: true }));
        return;
      }

      // Handle nc-password component
      if (tagName === 'nc-password') {
        // Set data-value to empty string
        element.setAttribute('data-value', '');
        
        // Dispatch custom event to notify component to clear
        element.dispatchEvent(new CustomEvent('nc-clear', { bubbles: true }));
        return;
      }

      // Clear data-value attribute for other custom components
      element.setAttribute('data-value', '');

      // Clear value for native form elements
      if ('value' in element) {
        const htmlElement = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        
        if (htmlElement instanceof HTMLInputElement) {
          if (htmlElement.type === 'checkbox' || htmlElement.type === 'radio') {
            htmlElement.checked = false;
          } else {
            htmlElement.value = '';
          }
        } else {
          htmlElement.value = '';
        }
      }
    });
  }


  // Set form values programmatically
  public setFormValues(formId: string, values: { [key: string]: string | string[] | boolean }): void {
    const elements = this.getFormElements(formId);

    elements.forEach((element) => {
      const name = element.getAttribute('name');
      if (!name || !(name in values)) return; // skip elements without name or not in values object

      const value = values[name];
      const tagName = element.tagName.toLowerCase();

      // Handle nc-select components
      if (tagName === 'nc-select') {
        const stringValue = Array.isArray(value) ? JSON.stringify(value) : String(value);
        element.setAttribute('data-value', stringValue);
        element.dispatchEvent(new CustomEvent('nc-set-value', { 
          bubbles: true, 
          detail: { value } 
        }));
        return;
      }

      // Handle nc-checkbox and nc-switch components
      if (tagName === 'nc-checkbox' || tagName === 'nc-switch') {
        const boolValue = typeof value === 'boolean' ? value : value === 'true';
        element.setAttribute('data-value', String(boolValue));
        element.dispatchEvent(new CustomEvent('nc-set-value', { 
          bubbles: true, 
          detail: { value: boolValue } 
        }));
        return;
      }

      // Handle nc-password component
      if (tagName === 'nc-password') {
        const stringValue = String(value);
        element.setAttribute('data-value', stringValue);
        element.dispatchEvent(new CustomEvent('nc-set-value', { 
          bubbles: true, 
          detail: { value: stringValue } 
        }));
        return;
      }

      // Handle native form elements
      if ('value' in element) {
        const htmlElement = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        
        if (htmlElement instanceof HTMLInputElement) {
          if (htmlElement.type === 'checkbox') {
            htmlElement.checked = typeof value === 'boolean' ? value : value === 'true';
          } else if (htmlElement.type === 'radio') {
            htmlElement.checked = htmlElement.value === value;
          } else {
            htmlElement.value = String(value);
          }
        } else {
          htmlElement.value = String(value);
        }
      }
    });
  }

}
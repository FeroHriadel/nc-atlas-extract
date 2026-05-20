import { Injectable } from '@angular/core';

import { BehaviorSubject } from 'rxjs';



@Injectable({
  providedIn: 'root'
})



export class ThemeService {
    private themeSubject = new BehaviorSubject<'light' | 'dark'>('light');
    public theme$ = this.themeSubject.asObservable();


    public setTheme(theme: 'light' | 'dark') {
        console.log('ThemeService.setTheme called with:', theme);
        this.applyTheme(theme);
        this.themeSubject.next(theme);
        console.log('Theme applied, checking CSS variable:', getComputedStyle(document.documentElement).getPropertyValue('--nc-input-bg'));
    }

    public getTheme(): 'light' | 'dark' {
        return this.themeSubject.getValue();
    }

    private applyTheme(theme: 'light' | 'dark') {
        const root = document.documentElement;
        if (theme === 'light') {
            root.style.setProperty('--nc-bg-color', 'var(--nc-white-900)');
            root.style.setProperty('--nc-border-radius', '5px');
            root.style.setProperty('--nc-border-color', 'var(--nc-white-100)');
            root.style.setProperty('--nc-disabled-opacity', '0.5');
            root.style.setProperty('--nc-outline-shadow', '0px 0px 1px 1px var(--nc-white-100)');
            root.style.setProperty('--nc-box-shadow', '0px 4px 6px var(--nc-white-100)');
            root.style.setProperty('--nc-box-shadow-strong', '0px 4px 6px var(--nc-white-100), 0px 0px 3px 1px var(--nc-white-300)');
            root.style.setProperty('--nc-hover-bg-light', 'var(--nc-white-800)');
            root.style.setProperty('--nc-button-dark-bg', 'var(--nc-black-600)');
            root.style.setProperty('--nc-button-dark-bg-hover', 'var(--nc-black-700)');
            root.style.setProperty('--nc-button-dark-bg-focus', 'var(--nc-black-800)');
            root.style.setProperty('--nc-button-dark-text-color', 'var(--nc-white-900)');
            root.style.setProperty('--nc-button-outline-bg-focus', 'var(--nc-white-200)');
            root.style.setProperty('--nc-button-red-bg', 'var(--nc-red-900)');
            root.style.setProperty('--nc-button-red-bg-hover', 'var(--nc-red-800)');
            root.style.setProperty('--nc-button-red-bg-focus', 'var(--nc-red-700)');
            root.style.setProperty('--nc-button-red-text-color', 'var(--nc-white-900)');
            root.style.setProperty('--nc-input-bg', 'var(--nc-white-700)');
            root.style.setProperty('--nc-input-bg-hover', 'var(--nc-white-500)');
            root.style.setProperty('--nc-input-bg-focus', 'var(--nc-white-400)');
            root.style.setProperty('--nc-input-width', '260px');
            root.style.setProperty('--nc-input-height', '2.5rem');
            root.style.setProperty('--nc-input-padding', '0.5rem');
            root.style.setProperty('--nc-input-text-color', 'var(--nc-black-500)');
            root.style.setProperty('--nc-input-text-color-hover', 'var(--nc-black-700)');
            root.style.setProperty('--nc-input-text-color-focus', 'var(--nc-black-600)');
            root.style.setProperty('--nc-input-text-size', '0.9rem');
            root.style.setProperty('--nc-input-text-weight', '500');
            root.style.setProperty('--nc-input-text-indent', '0.5rem');
            root.style.setProperty('--nc-input-placeholder-color', 'var(--nc-black-200)');
            root.style.setProperty('--nc-input-placeholder-color-hover', 'var(--nc-black-300)');
            root.style.setProperty('--nc-input-placeholder-color-focus', 'var(--nc-black-400)');
            root.style.setProperty('--nc-input-placeholder-font-style', 'italic');
            root.style.setProperty('--nc-input-placeholder-font-weight', '200');
            root.style.setProperty('--nc-input-placeholder-font-size', '0.9rem');
            root.style.setProperty('--nc-input-display', 'inline-block');
            root.style.setProperty('--nc-select-width', '200px');
            root.style.setProperty('--nc-select-bg', 'transparent');
            root.style.setProperty('--nc-select-options-padding', '0.25rem');
            root.style.setProperty('--nc-select-options-bg', 'var(--nc-white-950)');
            root.style.setProperty('--nc-select-check-color', 'var(--nc-black-500)');
            root.style.setProperty('--nc-label-text-color', 'var(--nc-black-100)');
            root.style.setProperty('--nc-card-bg', 'var(--nc-white-950)');
            root.style.setProperty('--nc-text-color-strong', 'var(--nc-black-600)');
            root.style.setProperty('--nc-text-color-light', 'var(--nc-gray-500)');
            root.style.setProperty('--nc-text-color-stronger', 'var(--nc-black-300)');
            root.style.setProperty('--nc-text-color-lighter', 'var(--nc-gray-200)');
            root.style.setProperty('--nc-pill-bg', 'var(--nc-white-400)');
            root.style.setProperty('--nc-pill-text-color', 'var(--nc-black-500)');
            root.style.setProperty('--nc-toast-bg', 'var(--nc-black-400)');
            root.style.setProperty('--nc-toast-border', '1px solid var(--nc-black-100)');
            root.style.setProperty('--nc-error-toast-bg', 'var(--nc-red-950)');
            root.style.setProperty('--nc-error-toast-border', '1px solid var(--nc-red-300)');
        } 
        else if (theme === 'dark') {
            root.style.setProperty('--nc-bg-color', 'var(--nc-black-600)');
            root.style.setProperty('--nc-border-radius', '5px');
            root.style.setProperty('--nc-border-color', 'var(--nc-black-100)');
            root.style.setProperty('--nc-disabled-opacity', '0.5');
            root.style.setProperty('--nc-outline-shadow', '0px 0px 1px 1px var(--nc-black-100)');
            root.style.setProperty('--nc-box-shadow', '0px 4px 6px var(--nc-black-300)');
            root.style.setProperty('--nc-box-shadow-strong', '0px 4px 6px var(--nc-black-300), 0px 0px 3px 1px var(--nc-black-100)');
            root.style.setProperty('--nc-hover-bg-light', 'var(--nc-black-400)');
            root.style.setProperty('--nc-button-dark-bg', 'var(--nc-black-950)');
            root.style.setProperty('--nc-button-dark-bg-hover', 'var(--nc-black-700)');
            root.style.setProperty('--nc-button-dark-bg-focus', 'var(--nc-black-800)');
            root.style.setProperty('--nc-button-dark-text-color', 'var(--nc-white-900)');
            root.style.setProperty('--nc-button-outline-bg-focus', 'var(--nc-white-200)');
            root.style.setProperty('--nc-button-red-bg', 'var(--nc-red-900)');
            root.style.setProperty('--nc-button-red-bg-hover', 'var(--nc-red-800)');
            root.style.setProperty('--nc-button-red-bg-focus', 'var(--nc-red-700)');
            root.style.setProperty('--nc-button-red-text-color', 'var(--nc-white-900)');
            root.style.setProperty('--nc-input-bg', 'var(--nc-black-600)');
            root.style.setProperty('--nc-input-bg-hover', 'var(--nc-black-500)');
            root.style.setProperty('--nc-input-bg-focus', 'var(--nc-black-400)');
            root.style.setProperty('--nc-input-width', '260px');
            root.style.setProperty('--nc-input-height', '2.5rem');
            root.style.setProperty('--nc-input-padding', '0.5rem');
            root.style.setProperty('--nc-input-text-color', 'var(--nc-white-300)');
            root.style.setProperty('--nc-input-text-color-hover', 'var(--nc-white-500)');
            root.style.setProperty('--nc-input-text-color-focus', 'var(--nc-white-400)');
            root.style.setProperty('--nc-input-text-size', '0.9rem');
            root.style.setProperty('--nc-input-text-weight', '500');
            root.style.setProperty('--nc-input-text-indent', '0.5rem');
            root.style.setProperty('--nc-input-placeholder-color', 'var(--nc-white-200)');
            root.style.setProperty('--nc-input-placeholder-color-hover', 'var(--nc-white-300)');
            root.style.setProperty('--nc-input-placeholder-color-focus', 'var(--nc-white-400)');
            root.style.setProperty('--nc-input-placeholder-font-style', 'italic');
            root.style.setProperty('--nc-input-placeholder-font-weight', '200');
            root.style.setProperty('--nc-input-placeholder-font-size', '0.9rem');
            root.style.setProperty('--nc-input-display', 'inline-block');
            root.style.setProperty('--nc-select-width', '200px');
            root.style.setProperty('--nc-select-bg', 'transparent');
            root.style.setProperty('--nc-select-options-padding', '0.25rem');
            root.style.setProperty('--nc-select-options-bg', 'var(--nc-black-950)');
            root.style.setProperty('--nc-select-check-color', 'var(--nc-white-500)');
            root.style.setProperty('--nc-label-text-color', 'var(--nc-white-50)');
            root.style.setProperty('--nc-card-bg', 'var(--nc-black-700)');
            root.style.setProperty('--nc-text-color-strong', 'var(--nc-white-700)');
            root.style.setProperty('--nc-text-color-light', 'var(--nc-gray-500)');
            root.style.setProperty('--nc-text-color-stronger', 'var(--nc-gray-700)');
            root.style.setProperty('--nc-text-color-lighter', 'var(--nc-gray-200)');
            root.style.setProperty('--nc-pill-bg', 'var(--nc-black-100)');
            root.style.setProperty('--nc-pill-text-color', 'var(--nc-white-300)');
            root.style.setProperty('--nc-toast-bg', 'var(--nc-black-400)');
            root.style.setProperty('--nc-toast-border', '1px solid var(--nc-black-100)');
            root.style.setProperty('--nc-error-toast-bg', 'var(--nc-red-950)');
            root.style.setProperty('--nc-error-toast-border', '1px solid var(--nc-red-300)');
        }
    }

}
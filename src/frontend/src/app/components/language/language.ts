// language.component.ts
import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

const LANGUAGE_KEY = 'ember-language';

interface LanguageOption {
  id: string;
  label: string;
  flag: string;
  desc: string;
}

@Component({
  selector: 'app-language',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './language.html',
  styleUrls: ['./language.css']
})
export class Language implements OnInit {
  selectedLang = signal<string>('en');

  readonly languages: LanguageOption[] = [
    { id: 'en', label: 'English', flag: '🇺🇸', desc: 'Default language' },
    { id: 'de', label: 'Deutsch', flag: '🇩🇪', desc: 'German' },
    { id: 'fr', label: 'Français', flag: '🇫🇷', desc: 'French' },
    { id: 'es', label: 'Español', flag: '🇪🇸', desc: 'Spanish' }
  ];

  ngOnInit(): void {
    this.loadLanguage();
  }

  private loadLanguage(): void {
    const savedLang = localStorage.getItem(LANGUAGE_KEY);
    if (savedLang && this.isValidLanguage(savedLang)) {
      this.selectedLang.set(savedLang);
    }
  }

  selectLanguage(id: string) {
    this.selectedLang.set(id);
    localStorage.setItem(LANGUAGE_KEY, id);
    // TODO: Apply language change when i18n is implemented
  }

  private isValidLanguage(lang: string): boolean {
    return this.languages.some(l => l.id === lang);
  }
}

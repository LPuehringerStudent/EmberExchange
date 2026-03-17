// language.component.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-language',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './language.html',
  styleUrls: ['./language.css']
})
export class Language{
  selectedLang = signal<string>('en');

  readonly languages = [
    { id: 'en', label: 'English', flag: '🇺🇸', desc: 'Default language' },
    { id: 'de', label: 'Deutsch', flag: '🇩🇪', desc: 'German' },
    { id: 'fr', label: 'Français', flag: '🇫🇷', desc: 'French' },
    { id: 'es', label: 'Español', flag: '🇪🇸', desc: 'Spanish' }
  ];

  selectLanguage(id: string) {
    this.selectedLang.set(id);
  }
}

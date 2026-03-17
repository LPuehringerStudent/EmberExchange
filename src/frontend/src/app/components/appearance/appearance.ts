// appearance.component.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-appearance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appearance.html',
  styleUrls: ['./appearance.css']
})
export class Appearance {
  selectedTheme = signal<string>('light');

  readonly themes = [
    { id: 'light', label: 'Light', bg: '#ffffff', border: '#e0e3ff' },
    { id: 'dark', label: 'Dark', bg: '#1a1a2e', border: '#16213e' },
    { id: 'purple', label: 'Purple', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: '#764ba2' },
    { id: 'green', label: 'Forest', bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', border: '#11998e' }
  ];

  selectTheme(id: string) {
    this.selectedTheme.set(id);
  }
}

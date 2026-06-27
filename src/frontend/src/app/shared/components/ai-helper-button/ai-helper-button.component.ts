import { Component, inject } from '@angular/core';
import { AiHelperService } from '../../../core/services/ai-helper.service';

@Component({
  selector: 'app-ai-helper-button',
  standalone: true,
  templateUrl: './ai-helper-button.component.html',
  styleUrls: [],
})
export class AiHelperButtonComponent {
  private service = inject(AiHelperService);
  isOpen = this.service.isOpen;

  toggle(): void {
    this.service.toggle();
  }
}

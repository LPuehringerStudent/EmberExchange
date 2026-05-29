import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ShellComponent } from './core/layout/shell.component';
import { ToastHostComponent } from './shared/components/toast-host.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ShellComponent, ToastHostComponent],
  template: `
    <app-shell />
    <app-toast-host />
  `
})
export class AppComponent {
  private _themeService = inject(ThemeService);
}

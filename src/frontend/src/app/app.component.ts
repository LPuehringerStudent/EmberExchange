import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
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
export class AppComponent implements OnInit {
  private _themeService = inject(ThemeService);
  private _router = inject(Router);

  ngOnInit(): void {
    this._router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
}

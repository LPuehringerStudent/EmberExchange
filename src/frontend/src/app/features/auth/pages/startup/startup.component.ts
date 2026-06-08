import { Component, OnInit, AfterViewInit, ChangeDetectionStrategy, inject, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-startup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule],
  templateUrl: './startup.component.html',
  styleUrls: ['./startup.component.css']
})
export class StartupComponent implements OnInit, AfterViewInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      void this.router.navigate(['/home']);
    }
  }

  ngAfterViewInit(): void {
    const nodes = this.elementRef.nativeElement.querySelectorAll('.reveal');
    const reveals = Array.from(nodes) as HTMLElement[];

    if (!reveals.length || typeof IntersectionObserver === 'undefined') {
      reveals.forEach((el) => el.classList.add('revealed'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    reveals.forEach((el) => observer.observe(el));
  }
}

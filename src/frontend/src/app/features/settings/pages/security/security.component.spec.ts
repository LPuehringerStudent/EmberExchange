import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AuthService } from '@core/services/auth.service';

import { SecurityComponent } from './security.component';

describe('SecurityComponent', () => {
  let component: SecurityComponent;
  let fixture: ComponentFixture<SecurityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecurityComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isEmailVerified: signal(true),
            getCurrentUser: vi.fn().mockReturnValue({ playerId: 1 }),
            getSessionId: vi.fn().mockReturnValue('session-1'),
            getSessions: vi.fn().mockResolvedValue([]),
            get2FAStatus: vi.fn().mockResolvedValue({ enabled: false }),
            logoutAllDevices: vi.fn().mockResolvedValue({ message: 'ok', closed: 1 }),
            updatePassword: vi.fn().mockResolvedValue(undefined),
            setup2FA: vi.fn().mockResolvedValue({ secret: 'secret', qrCodeDataUrl: 'data:image/png;base64,abc' }),
            confirm2FA: vi.fn().mockResolvedValue({ message: 'ok' }),
            disable2FA: vi.fn().mockResolvedValue({ message: 'ok' }),
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(SecurityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

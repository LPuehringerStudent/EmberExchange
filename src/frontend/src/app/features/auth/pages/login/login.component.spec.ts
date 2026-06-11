import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { BehaviorTrackerService } from '@core/services/behavior-tracker.service';
import { TurnstileService } from '@core/services/turnstile.service';

import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getOAuthStatus: vi.fn().mockResolvedValue({ google: false, github: false }),
            getPowChallenge: vi.fn().mockResolvedValue({ challenge: 'abc', difficulty: 0 }),
            solvePow: vi.fn().mockResolvedValue('0'),
            login: vi.fn(),
            verify2FA: vi.fn(),
            cancel2FA: vi.fn(),
          },
        },
        {
          provide: TurnstileService,
          useValue: {
            initialize: vi.fn().mockResolvedValue(undefined),
            render: vi.fn().mockReturnValue('widget-1'),
            isReady: vi.fn().mockReturnValue(true),
            getToken: vi.fn().mockReturnValue('token'),
            reset: vi.fn(),
          },
        },
        {
          provide: BehaviorTrackerService,
          useValue: {
            startTracking: vi.fn(),
            getToken: vi.fn().mockReturnValue('behavior-token'),
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

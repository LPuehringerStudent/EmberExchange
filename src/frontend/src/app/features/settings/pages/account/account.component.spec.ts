import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

import { AccountComponent } from './account.component';

describe('AccountComponent', () => {
  let component: AccountComponent;
  let fixture: ComponentFixture<AccountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getCurrentUser: vi.fn().mockReturnValue({
              playerId: 1,
              username: 'Alice',
              email: 'alice@example.com',
              motto: '',
              isPublic: true,
            }),
            updateProfile: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountComponent } from './account.component';

describe('AccountComponent', () => {
  let component: Account;
  let fixture: ComponentFixture<Account>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountComponent]
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

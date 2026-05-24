import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SecurityComponent } from './security.component';

describe('SecurityComponent', () => {
  let component: Security;
  let fixture: ComponentFixture<Security>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecurityComponent]
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

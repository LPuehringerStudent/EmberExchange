import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppearanceComponent } from './appearance.component';

describe('AppearanceComponent', () => {
  let component: Appearance;
  let fixture: ComponentFixture<Appearance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppearanceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppearanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

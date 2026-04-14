import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Appearance } from './appearance';

describe('Appearance', () => {
  let component: Appearance;
  let fixture: ComponentFixture<Appearance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Appearance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Appearance);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Merging } from './merging';

describe('Merging', () => {
  let component: Merging;
  let fixture: ComponentFixture<Merging>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Merging]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Merging);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

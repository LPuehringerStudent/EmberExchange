import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Poker } from './poker';

describe('Poker', () => {
  let component: Poker;
  let fixture: ComponentFixture<Poker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Poker]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Poker);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

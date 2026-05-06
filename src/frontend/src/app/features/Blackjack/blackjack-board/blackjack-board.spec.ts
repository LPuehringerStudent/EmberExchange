import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlackjackBoard } from './blackjack-board';

describe('BlackjackBoard', () => {
  let component: BlackjackBoard;
  let fixture: ComponentFixture<BlackjackBoard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlackjackBoard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlackjackBoard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

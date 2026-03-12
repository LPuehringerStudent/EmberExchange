import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import {LootBoxHelper, LootItem} from "../../../../middleground/LootboxHelper";
import {StoveApiService} from '../../services/stove';

@Component({
  selector: 'app-lootbox',
  standalone: true,
  templateUrl: '../html/lootbox.html',
  imports: [CommonModule],
  styleUrls: ['../css/lootbox.css']
})

export class LootboxComponent implements AfterViewInit {
  @ViewChild('itemsContainer') itemsElement!: ElementRef<HTMLElement>;

  items: LootItem[] = [];
  finalItem: LootItem | null = null;
  showOverlay = false;
  showPopup = false;
  resultText = '';
  isOpening = false;

  ngAfterViewInit(): void {
  }


  private lootBoxHelper: LootBoxHelper;

  constructor(private cdr: ChangeDetectorRef,private stoveApi: StoveApiService) {
    this.lootBoxHelper = new LootBoxHelper(cdr);
  }

  openBox(): void {
    if (this.isOpening) return;
    
    this.isOpening = true;
    this.lootBoxHelper.buildStrip();
    this.items = this.lootBoxHelper.items;
    this.showOverlay = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      const itemsEl = this.itemsElement.nativeElement;

      itemsEl.style.transition = 'none';
      itemsEl.style.transform = 'translateX(0px)';

      void itemsEl.offsetHeight;

      itemsEl.style.transition = 'transform 4s cubic-bezier(0.1, 0.9, 0.2, 1)';

      setTimeout(() => {
        const itemEl = itemsEl.querySelector('.item') as HTMLElement;
        if (itemEl) {
          const style = window.getComputedStyle(itemEl);
          const width =
            itemEl.offsetWidth +
            parseInt(style.marginLeft) +
            parseInt(style.marginRight);
          const rollerEl = document.getElementById('roller');
          const rollerWidth = rollerEl?.offsetWidth || 0;
          const centerOffset = rollerWidth / 2 - width / 2;
          const offset = -(40 * width) + centerOffset;

          itemsEl.style.transform = `translateX(${offset}px)`;
        }

        setTimeout(() => {
          this.showResult();
        }, 4000);
      }, 50);
    }, 0);
  }

  private showResult(): void {
    this.finalItem = this.lootBoxHelper.finalItem;
    this.saveLoot(this.lootBoxHelper.returnTypeId(this.finalItem!))
    this.resultText = `You got: ${this.lootBoxHelper.finalItem?.name || 'Unknown'}`;
    this.showPopup = true;
    this.isOpening = false;
    this.cdr.detectChanges();
  }
  saveLoot(typeId: number) {
    this.stoveApi.createStove(typeId, 1).subscribe({
      error: (err) => console.error('Failed to save stove:', err)
    });
  }

  resetAll(): void {
    this.showOverlay = false;
    this.showPopup = false;
    this.isOpening = false;
    const itemsEl = this.itemsElement?.nativeElement;
    if (itemsEl) {
      itemsEl.style.transform = 'translateX(0px)';
    }
  }
}

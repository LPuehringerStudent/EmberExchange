import { AfterViewInit, ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PageBackgroundComponent } from '../../shared/components/page-background/page-background.component';

interface RarityStove {
  src: string;
  alt: string;
  label: string;
  rarity: string;
}

@Component({
  selector: 'app-how-it-works',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, PageBackgroundComponent],
  templateUrl: './how-it-works.component.html',
  styleUrls: ['./how-it-works.component.css']
})
export class HowItWorksComponent implements AfterViewInit {
  readonly rarityShowcase: RarityStove[] = [
    { src: 'assets/stove_sprites/common/standard.png', alt: 'Common Standard Stove', label: 'Common', rarity: 'common' },
    { src: 'assets/stove_sprites/common/rusty.png', alt: 'Common Rusty Stove', label: 'Common', rarity: 'common' },
    { src: 'assets/stove_sprites/rare/forest.png', alt: 'Rare Forest Stove', label: 'Rare', rarity: 'rare' },
    { src: 'assets/stove_sprites/rare/bronze.png', alt: 'Rare Bronze Stove', label: 'Rare', rarity: 'rare' },
    { src: 'assets/stove_sprites/epic/golden.png', alt: 'Epic Golden Stove', label: 'Epic', rarity: 'epic' },
    { src: 'assets/stove_sprites/epic/steampunk.png', alt: 'Epic Steampunk Stove', label: 'Epic', rarity: 'epic' },
    { src: 'assets/stove_sprites/legendary/dragon.png', alt: 'Legendary Dragon Stove', label: 'Legendary', rarity: 'legendary' },
    { src: 'assets/stove_sprites/legendary/crystal.png', alt: 'Legendary Crystal Stove', label: 'Legendary', rarity: 'legendary' },
    { src: 'assets/stove_sprites/secret/galactic-dragon-stove.png', alt: 'Secret Galactic Dragon Stove', label: 'Secret', rarity: 'secret' }
  ];

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
  }
}

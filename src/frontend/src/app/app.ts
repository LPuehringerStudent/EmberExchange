import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MainComponent } from './components/app/main-component';

@Component({
  selector: 'app-root',
  standalone: true,
  //temporary solution with lootbox
  imports: [MainComponent, RouterOutlet],
  template: `
    <app-main></app-main>
    <router-outlet></router-outlet>
  `
})
export class App {}

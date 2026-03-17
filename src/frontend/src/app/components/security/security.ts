// security.component.ts
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './security.html',
  styleUrls: ['./security.css']
})
export class Security {
  twoFactorEnabled = signal<boolean>(false);
  loginAlerts = signal<boolean>(true);
  trustedDevices = signal<boolean>(false);

  toggleTwoFactor() {
    this.twoFactorEnabled.update(v => !v);
  }

  toggleLoginAlerts() {
    this.loginAlerts.update(v => !v);
  }

  toggleTrustedDevices() {
    this.trustedDevices.update(v => !v);
  }
}

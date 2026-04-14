// socials.component.ts
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

interface Friend {
  id: number;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
  offeredMarketstand: boolean;
}

interface FriendRequest {
  id: number;
  name: string;
  avatar: string;
}

@Component({
  selector: 'app-socials',
  imports: [ReactiveFormsModule],
  templateUrl: './socials.component.html',
  styleUrls: ['../../settings.component.css', './socials.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SocialsComponent {
  // Search input for adding friends
  searchQuery = new FormControl('');

  // Current friends list
  friends = signal<Friend[]>([
    { id: 1, name: 'Davidus', avatar: 'D', status: 'online', offeredMarketstand: true },
    { id: 2, name: 'Ayane', avatar: ':-', status: 'away', offeredMarketstand: false },
    { id: 3, name: 'Timmiboy', avatar: '🍺', status: 'offline', offeredMarketstand: false },
    { id: 4, name: 'Lauri', avatar: 'L', status: 'offline', offeredMarketstand: true }
  ]);

  // Incoming friend requests
  requests = signal<FriendRequest[]>([
    { id: 101, name: 'David Zwetti', avatar: 'Z' },
    { id: 102, name: 'Nisi', avatar: 'N' }
  ]);

  // Offer marketstand to friend
  offerMarketstand(friendId: number) {
    this.friends.update(list =>
      list.map(f =>
        f.id === friendId
          ? { ...f, offeredMarketstand: true }
          : f
      )
    );
  }

  // Accept friend request
  acceptRequest(requestId: number) {
    const request = this.requests().find(r => r.id === requestId);
    if (request) {
      const newFriend: Friend = {
        id: request.id,
        name: request.name,
        avatar: request.avatar,
        status: 'offline',
        offeredMarketstand: false
      };
      this.friends.update(list => [...list, newFriend]);
      this.requests.update(list => list.filter(r => r.id !== requestId));
    }
  }

  // Decline friend request
  declineRequest(requestId: number) {
    this.requests.update(list => list.filter(r => r.id !== requestId));
  }

  // Add friend from search
  addFriend() {
    const name = (this.searchQuery.value || '').trim();
    if (name) {
      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
      const newFriend: Friend = {
        id: Date.now(),
        name: name,
        avatar: initials || '??',
        status: 'offline',
        offeredMarketstand: false
      };
      this.friends.update(list => [...list, newFriend]);
      this.searchQuery.setValue('');
    }
  }

  // Remove friend
  removeFriend(friendId: number) {
    this.friends.update(list => list.filter(f => f.id !== friendId));
  }
}

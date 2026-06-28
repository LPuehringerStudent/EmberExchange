import { Injectable, inject } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import type { PlayerStatisticsRow as PlayerStatistics, PlayerAchievement, AchievementDefinition } from '@shared/model';

export interface GloryStove {
  stoveId: number;
  typeId: number;
  currentOwnerId: number;
  mintedAt: string;
  heatLevel: number;
  imageUrl: string;
  name: string;
  rarity: string;
}

export interface PrestigeData {
  playerId: number;
  totalXP: number;
  currentLevel: number;
  prestigeCount: number;
}

export interface ActiveCosmetic {
  themeId?: number;
  name: string;
  cssClass: string;
}

export interface ActiveTitle {
  titleId?: string;
  label: string;
  animation: string;
}

export interface ActiveBanner {
  bannerId?: number;
  name: string;
  cssClass: string;
}

export interface GloryTrophy {
  trophyId: string;
  name: string;
  description: string;
  iconUrl: string | null;
  season: string | null;
  eventName: string | null;
  rarity: string;
  awardedAt: string;
}

export interface GloryProfile {
  playerId: number;
  username: string;
  motto: string;
  avatarUrl: string | null;
  coins: number;
  joinedAt: string;
  isAdmin: boolean;
  provider: string | null;
  stats: PlayerStatistics;
  topStoves: GloryStove[];
  prestige: PrestigeData;
  activeTheme: ActiveCosmetic | null;
  activeTitle: ActiveTitle | null;
  activeBanner: ActiveBanner | null;
  trophies: GloryTrophy[];
  visitCount: number;
  featuredAchievements: string[];
  achievements: PlayerAchievement[];
  achievementDefinitions: AchievementDefinition[];
}

@Injectable({ providedIn: 'root' })
export class HallOfGloryService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  private getHeaders(): HttpHeaders | undefined {
    const sessionId = this.auth.getSessionId();
    return sessionId ? new HttpHeaders({ 'session-id': sessionId }) : undefined;
  }

  getGloryProfile(playerId: number): Observable<GloryProfile> {
    return this.api.get<GloryProfile>(`/players/${playerId}/glory`);
  }

  getGloryProfileByUsername(username: string): Observable<GloryProfile> {
    return this.api.get<GloryProfile>(`/players/username/${encodeURIComponent(username)}/glory`);
  }

  getCustomization(playerId: number): Observable<{
    showcase: any[];
    featuredAchievements: string[];
    themes: any[];
    titles: any[];
    banners: any[];
    trophies: any[];
    visitCount: number;
  }> {
    return this.api.get<any>(`/glory/customization/${playerId}`);
  }

  updateShowcase(playerId: number, slotIndex: number, stoveId: number): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/glory/showcase', { playerId, slotIndex, stoveId }, this.getHeaders());
  }

  removeShowcaseSlot(playerId: number, slotIndex: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(`/glory/showcase/${playerId}/${slotIndex}`, this.getHeaders());
  }

  setFeaturedAchievement(playerId: number, achievementId: string, slotIndex: number): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/glory/achievements', { playerId, achievementId, slotIndex }, this.getHeaders());
  }

  removeFeaturedAchievement(playerId: number, achievementId: string): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(`/glory/achievements/${playerId}/${achievementId}`, this.getHeaders());
  }

  activateTheme(playerId: number, themeId: number): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/glory/theme', { playerId, themeId }, this.getHeaders());
  }

  activateTitle(playerId: number, titleId: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/glory/title', { playerId, titleId }, this.getHeaders());
  }

  activateBanner(playerId: number, bannerId: number): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/glory/banner', { playerId, bannerId }, this.getHeaders());
  }

  prestige(playerId: number): Observable<{ success: boolean; currentLevel: number; prestigeCount: number }> {
    return this.api.post<{ success: boolean; currentLevel: number; prestigeCount: number }>(`/players/${playerId}/prestige`, {}, this.getHeaders());
  }

  recordVisit(visitorId: number, profileId: number): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/glory/visit', { visitorId, profileId }, this.getHeaders());
  }

  // Guestbook
  getGuestbook(playerId: number): Observable<GloryGuestbookEntry[]> {
    return this.api.get<GloryGuestbookEntry[]>(`/glory/guestbook/${playerId}`);
  }

  addGuestbookEntry(playerId: number, authorId: number, message: string): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/glory/guestbook', { playerId, authorId, message }, this.getHeaders());
  }

  deleteGuestbookEntry(entryId: number, requestingPlayerId: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(`/glory/guestbook/${entryId}`, this.getHeaders(), { requestingPlayerId });
  }
}

export interface GloryGuestbookEntry {
  entryId: number;
  playerId: number;
  authorId: number;
  authorName: string;
  message: string;
  postedAt: string;
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {map, Observable, Subject, tap} from 'rxjs';
import {Rarity} from '../../../shared/model';

@Injectable({
  providedIn: 'root'
})
export class StoveApiService {
  private apiUrl = '/api';
  private refreshSubject = new Subject<void>();
  refresh$ = this.refreshSubject.asObservable();

  private http = inject(HttpClient);

  createStove(typeId: number, ownerId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/stoves`, {
      typeId,
      currentOwnerId: ownerId
    }).pipe(
      tap(() => this.refreshSubject.next()) // Notify subscribers
    );
  }

  checkRarity(typeId: number): Observable<Rarity> {
    return this.http.get<{ rarity: Rarity }>(`${this.apiUrl}/stove-types/${typeId}`).pipe(
      map(response => response.rarity)  // Extract just the rarity string
    );
  }
  getStoveName(typeId: number): Observable<{name: string}> {
    return this.http.get<{name: string}>(`${this.apiUrl}/stove-types/${typeId}`);
  }

  getStoves(ownerId: number): Observable<any> {
    // This hits: GET http://localhost:3000/api/players/{ownerId}/stoves
    return this.http.get(`${this.apiUrl}/players/${ownerId}/stoves`);
  }
}

import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = '/api';
  private http = inject(HttpClient);

  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = `Request failed: ${error.status}`;
    if (error.error && typeof error.error === 'object' && 'error' in error.error) {
      message = (error.error as { error: string }).error || message;
    } else if (error.statusText) {
      message = error.statusText;
    }
    return throwError(() => new Error(message));
  }

  get<T>(path: string, headers?: HttpHeaders): Observable<T> {
    return this.http
      .get<T>(`${this.baseUrl}${path}`, { headers })
      .pipe(catchError(err => this.handleError(err)));
  }

  post<T>(path: string, body: unknown, headers?: HttpHeaders): Observable<T> {
    const defaultHeaders = headers ?? new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http
      .post<T>(`${this.baseUrl}${path}`, body, { headers: defaultHeaders })
      .pipe(catchError(err => this.handleError(err)));
  }

  patch<T>(path: string, body: unknown, headers?: HttpHeaders): Observable<T> {
    const defaultHeaders = headers ?? new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http
      .patch<T>(`${this.baseUrl}${path}`, body, { headers: defaultHeaders })
      .pipe(catchError(err => this.handleError(err)));
  }

  delete<T>(path: string, headers?: HttpHeaders): Observable<T> {
    return this.http
      .delete<T>(`${this.baseUrl}${path}`, { headers })
      .pipe(catchError(err => this.handleError(err)));
  }
}

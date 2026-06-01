import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public responseBody?: unknown
  ) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = '/api';
  private http = inject(HttpClient);
  /** Hardcoded to match backend production values.
   *  Previously injected at runtime into index.html. */
  private readonly clientHeader = 'X-DTOTF-JXLBHU';
  private readonly clientHeaderValue = 'vqd7-pf16';

  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = `Request failed: ${error.status}`;
    let body: unknown = undefined;
    if (error.error && typeof error.error === 'object' && 'error' in error.error) {
      message = (error.error as { error: string }).error || message;
      body = error.error;
    } else if (error.statusText) {
      message = error.statusText;
    }
    return throwError(() => new ApiError(message, error.status, body));
  }

  get<T>(path: string, headers?: HttpHeaders, params?: HttpParams): Observable<T> {
    const options: { headers?: HttpHeaders; params?: HttpParams } = {};
    if (headers) options.headers = headers;
    if (params) options.params = params;
    return this.http
      .get<T>(`${this.baseUrl}${path}`, options)
      .pipe(catchError(err => this.handleError(err)));
  }

  post<T>(path: string, body: unknown, headers?: HttpHeaders): Observable<T> {
    const defaultHeaders = headers ?? new HttpHeaders({ 'Content-Type': 'application/json' });
    const headersWithFingerprint = defaultHeaders.set(this.clientHeader, this.clientHeaderValue);
    return this.http
      .post<T>(`${this.baseUrl}${path}`, body, { headers: headersWithFingerprint })
      .pipe(catchError(err => this.handleError(err)));
  }

  patch<T>(path: string, body: unknown, headers?: HttpHeaders): Observable<T> {
    const defaultHeaders = headers ?? new HttpHeaders({ 'Content-Type': 'application/json' });
    const headersWithFingerprint = defaultHeaders.set(this.clientHeader, this.clientHeaderValue);
    return this.http
      .patch<T>(`${this.baseUrl}${path}`, body, { headers: headersWithFingerprint })
      .pipe(catchError(err => this.handleError(err)));
  }

  delete<T>(path: string, headers?: HttpHeaders, body?: unknown): Observable<T> {
    return this.http
      .delete<T>(`${this.baseUrl}${path}`, { headers, body })
      .pipe(catchError(err => this.handleError(err)));
  }
}

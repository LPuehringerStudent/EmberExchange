import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import type {
  GitHubCommit,
  GitHubContributor,
  GitHubRelease,
  GitHubRepoInfo,
} from '@shared/model';

@Injectable({ providedIn: 'root' })
export class GithubService {
  private api = inject(ApiService);

  getCommits(page = 1, perPage = 30): Observable<GitHubCommit[]> {
    return this.api.get<GitHubCommit[]>(`/github/commits?page=${page}&per_page=${perPage}`);
  }

  getContributors(): Observable<GitHubContributor[]> {
    return this.api.get<GitHubContributor[]>('/github/contributors');
  }

  getReleases(): Observable<GitHubRelease[]> {
    return this.api.get<GitHubRelease[]>('/github/releases');
  }

  getRepoInfo(): Observable<GitHubRepoInfo> {
    return this.api.get<GitHubRepoInfo>('/github/repo');
  }
}

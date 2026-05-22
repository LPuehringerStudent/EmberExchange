import { Component, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GithubService } from '../../core/services/github.service';
import type {
  GitHubCommit,
  GitHubContributor,
  GitHubRelease,
  GitHubRepoInfo,
} from '@shared/model';

type Tab = 'changelog' | 'contributors' | 'releases';

@Component({
  selector: 'app-update-log',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './update-log.component.html',
  styleUrls: ['./update-log.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateLogComponent implements OnInit {
  private github = inject(GithubService);

  // State signals
  commits = signal<GitHubCommit[]>([]);
  contributors = signal<GitHubContributor[]>([]);
  releases = signal<GitHubRelease[]>([]);
  repoInfo = signal<GitHubRepoInfo | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  activeTab = signal<Tab>('changelog');
  commitPage = signal(1);
  loadingMore = signal(false);

  readonly tabs: { key: Tab; label: string }[] = [
    { key: 'changelog', label: 'Changelog' },
    { key: 'contributors', label: 'Contributors' },
    { key: 'releases', label: 'Releases' },
  ];

  async ngOnInit(): Promise<void> {
    await this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const [commits, contributors, releases, repoInfo] = await Promise.all([
        firstValueFrom(this.github.getCommits(1, 30)),
        firstValueFrom(this.github.getContributors()),
        firstValueFrom(this.github.getReleases()),
        firstValueFrom(this.github.getRepoInfo()),
      ]);

      this.commits.set(commits);
      this.contributors.set(contributors);
      this.releases.set(releases);
      this.repoInfo.set(repoInfo);
    } catch (err) {
      this.error.set('Unable to load data from GitHub. Please try again later.');
      console.error(err);
    } finally {
      this.loading.set(false);
    }
  }

  async loadMoreCommits(): Promise<void> {
    if (this.loadingMore()) return;
    this.loadingMore.set(true);

    try {
      const nextPage = this.commitPage() + 1;
      const more = await firstValueFrom(this.github.getCommits(nextPage, 30));
      this.commits.update((current) => [...current, ...more]);
      this.commitPage.set(nextPage);
    } catch (err) {
      console.error('Failed to load more commits', err);
    } finally {
      this.loadingMore.set(false);
    }
  }

  setTab(tab: Tab): void {
    this.activeTab.set(tab);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatRelativeDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  openUrl(url: string): void {
    window.open(url, '_blank');
  }
}

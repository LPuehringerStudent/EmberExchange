import {
  Component,
  ChangeDetectionStrategy,
  signal,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { GithubService } from '../../core/services/github.service';
import { ChartComponent } from '../../shared/components/chart/chart.component';
import type {
  GitHubCommit,
  GitHubContributor,
  GitHubRelease,
  GitHubRepoInfo,
  GitHubCommitActivityWeek,
  GitHubLanguages,
  GitHubCodeFrequencyWeek,
} from '@shared/model';
import type { ChartConfiguration } from 'chart.js';

type Tab = 'changelog' | 'contributors' | 'releases' | 'insights';

@Component({
  selector: 'app-update-log',
  standalone: true,
  imports: [CommonModule, ChartComponent],
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

  // Insights signals
  insightsLoaded = signal(false);
  insightsLoading = signal(false);
  commitActivity = signal<GitHubCommitActivityWeek[]>([]);
  languages = signal<GitHubLanguages>({});
  codeFrequency = signal<GitHubCodeFrequencyWeek[]>([]);

  readonly tabs: { key: Tab; label: string }[] = [
    { key: 'changelog', label: 'Changelog' },
    { key: 'contributors', label: 'Contributors' },
    { key: 'releases', label: 'Releases' },
    { key: 'insights', label: 'Insights' },
  ];

  // Insights computed stats
  totalCommits = computed(() =>
    this.contributors().reduce((sum, c) => sum + c.contributions, 0)
  );

  avgCommitsPerWeek = computed(() => {
    const total = this.totalCommits();
    if (total === 0) return 0;
    const createdAt = this.repoInfo()?.createdAt;
    if (!createdAt) return 0;
    const weeks = Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 7)));
    return Math.round((total / weeks) * 10) / 10;
  });

  activeContributors = computed(() => this.contributors().length);

  daysSinceLastCommit = computed(() => {
    const commits = this.commits();
    if (commits.length === 0) return 0;
    const lastDate = new Date(commits[0].date);
    const now = new Date();
    return Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  });

  topLanguage = computed(() => {
    const langs = this.languages();
    const entries = Object.entries(langs);
    if (entries.length === 0) return 'Unknown';
    return entries.reduce((a, b) => (a[1] > b[1] ? a : b))[0];
  });

  // Chart configs
  commitActivityChartConfig = computed<ChartConfiguration | null>(() => {
    const activity = this.commitActivity();
    if (activity.length === 0) return null;

    const labels = activity.map((w) => {
      const d = new Date(w.week * 1000);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    const data = activity.map((w) => w.total);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#e85d04';

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Commits',
            data,
            backgroundColor: accent + '80',
            borderColor: accent,
            borderWidth: 1,
            borderRadius: 4,
            hoverBackgroundColor: accent,
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { display: false },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
          },
        },
      },
    };
  });

  languagesChartConfig = computed<ChartConfiguration | null>(() => {
    const langs = this.languages();
    const entries = Object.entries(langs);
    if (entries.length === 0) return null;

    const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
    const sorted = entries.sort((a, b) => b[1] - a[1]).slice(0, 8);
    const labels = sorted.map(([name, bytes]) => {
      const pct = Math.round((bytes / total) * 100);
      return `${name}  ${pct}%`;
    });
    const data = sorted.map(([, bytes]) => bytes);

    const colors = [
      '#e85d04', '#3b82f6', '#22c55e', '#a855f7', '#f59e0b',
      '#ef4444', '#06b6d4', '#84cc16',
    ];

    const surfaceBg = getComputedStyle(document.documentElement).getPropertyValue('--surface-bg').trim() || '#fff';

    return {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
            borderColor: surfaceBg,
            borderWidth: 2,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
          },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const rawLabel = sorted[ctx.dataIndex][0];
                const val = ctx.parsed;
                const pct = Math.round((val / total) * 100);
                return ` ${rawLabel}: ${pct}%`;
              },
            },
          },
        },
      },
    };
  });

  codeFrequencyChartConfig = computed<ChartConfiguration | null>(() => {
    const freq = this.codeFrequency();
    if (freq.length === 0) return null;

    const labels = freq.map((w) => {
      const d = new Date(w.week * 1000);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });

    return {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Additions',
            data: freq.map((w) => w.additions),
            borderColor: '#22c55e',
            backgroundColor: '#22c55e20',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
          {
            label: 'Deletions',
            data: freq.map((w) => w.deletions),
            borderColor: '#ef4444',
            backgroundColor: '#ef444420',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
        ],
      },
      options: {
        plugins: {
          legend: { position: 'top' },
        },
        scales: {
          x: { display: false },
          y: { beginAtZero: true },
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
      },
    };
  });

  async ngOnInit(): Promise<void> {
    await this.loadInitialData();
  }

  async setTab(tab: Tab): Promise<void> {
    this.activeTab.set(tab);
    if (tab === 'insights' && !this.insightsLoaded()) {
      await this.loadInsightsData();
    }
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

  async loadInsightsData(): Promise<void> {
    this.insightsLoading.set(true);

    try {
      const [activity, langs, frequency] = await Promise.all([
        firstValueFrom(this.github.getCommitActivity()),
        firstValueFrom(this.github.getLanguages()),
        firstValueFrom(this.github.getCodeFrequency()),
      ]);

      this.commitActivity.set(activity);
      this.languages.set(langs);
      this.codeFrequency.set(frequency);
      this.insightsLoaded.set(true);
    } catch (err) {
      console.error('Failed to load insights data', err);
    } finally {
      this.insightsLoading.set(false);
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

  contributorPercentage(contributor: GitHubContributor): number {
    const total = this.contributors().reduce((sum, c) => sum + c.contributions, 0);
    if (total === 0) return 0;
    return Math.round((contributor.contributions / total) * 100);
  }
}

import axios, { AxiosInstance, AxiosError } from "axios";
import { execSync } from "child_process";
import {
    GitHubCommit,
    GitHubContributor,
    GitHubRelease,
    GitHubRepoInfo,
    GitHubCommitActivityWeek,
    GitHubLanguages,
    GitHubCodeFrequencyWeek,
} from "../../shared/model";

const OWNER = "LPuehringerStudent";
const REPO = "EmberExchange";

// Map git author names to GitHub logins so the update log shows the
// real local commit counts even when code was pulled in manually.
const GIT_AUTHOR_TO_LOGIN: Record<string, string> = {
    "Muhammad Ayan": "ayan2310",
    "LPuehringerStudent": "LPuehringerStudent",
    "ayan2310": "ayan2310",
    "David-Fruehwirt": "David-Fruehwirt",
    "Timon-Brindl": "Timon-Brindl",
    "dependabot[bot]": "dependabot[bot]",
};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function handleAxiosError(err: unknown): never {
    if (err instanceof AxiosError && err.response?.status === 403) {
        const msg = (err.response.data as { message?: string })?.message || "";
        if (msg.toLowerCase().includes("rate limit")) {
            throw new Error("GitHub API rate limit exceeded. Add a GITHUB_API_TOKEN to your .env file and restart the server.");
        }
    }
    throw err;
}

interface CacheEntry<T> {
    data: T;
    fetchedAt: number;
}

class Cache {
    private store = new Map<string, CacheEntry<unknown>>();

    get<T>(key: string): T | undefined {
        const entry = this.store.get(key) as CacheEntry<T> | undefined;
        if (!entry) return undefined;
        if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
            this.store.delete(key);
            return undefined;
        }
        return entry.data;
    }

    set<T>(key: string, data: T): void {
        this.store.set(key, { data, fetchedAt: Date.now() });
    }
}

export class GitHubService {
    private client: AxiosInstance;
    private cache = new Cache();

    constructor() {
        const token = process.env.GITHUB_API_TOKEN || "";
        const headers: Record<string, string> = {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        this.client = axios.create({
            baseURL: "https://api.github.com",
            headers,
            timeout: 10000,
        });
    }

    async getCommits(page = 1, perPage = 30): Promise<GitHubCommit[]> {
        const cacheKey = `commits:${page}:${perPage}`;
        const cached = this.cache.get<GitHubCommit[]>(cacheKey);
        if (cached) return cached;

        try {
            const response = await this.client.get(
                `/repos/${OWNER}/${REPO}/commits`,
                { params: { page, per_page: perPage } }
            );

        const commits: GitHubCommit[] = response.data.map((c: unknown) => {
            const commit = c as {
                sha: string;
                html_url: string;
                commit: {
                    message: string;
                    author: { name: string; date: string };
                };
                author: { login: string; avatar_url: string } | null;
            };
            const msg = commit.commit.message;
            const lines = msg.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
            const title = lines[0] || "";
            const body = lines.slice(1);
            return {
                sha: commit.sha,
                shortSha: commit.sha.substring(0, 7),
                message: msg,
                messageTitle: title,
                messageBody: body,
                authorName: commit.commit.author.name,
                authorLogin: commit.author?.login || commit.commit.author.name,
                authorAvatar: commit.author?.avatar_url || "",
                date: commit.commit.author.date,
                url: commit.html_url,
            };
        });

            this.cache.set(cacheKey, commits);
            return commits;
        } catch (err) {
            handleAxiosError(err);
        }
    }

    async getContributors(): Promise<GitHubContributor[]> {
        const cacheKey = "contributors";
        const cached = this.cache.get<GitHubContributor[]>(cacheKey);
        if (cached) return cached;

        try {
            // Count commits from the local git history so the numbers stay
            // accurate even when code is merged manually instead of via GitHub.
            const shortlog = execSync("git shortlog -sn HEAD", {
                cwd: process.cwd(),
                encoding: "utf-8",
                timeout: 10000,
            });

            const counts = new Map<string, number>();
            for (const line of shortlog.split("\n")) {
                const match = line.trim().match(/^(\d+)\s+(.+)$/);
                if (!match) continue;
                const count = parseInt(match[1], 10);
                const author = match[2].trim();
                const login = GIT_AUTHOR_TO_LOGIN[author] || author;
                counts.set(login, (counts.get(login) || 0) + count);
            }

            const contributors: GitHubContributor[] = Array.from(counts.entries())
                .map(([login, contributions]) => ({
                    login,
                    contributions,
                    avatarUrl: `https://github.com/${login}.png`,
                    htmlUrl: `https://github.com/${login}`,
                }))
                .sort((a, b) => b.contributions - a.contributions);

            this.cache.set(cacheKey, contributors);
            return contributors;
        } catch (err) {
            // Fall back to GitHub API if git is unavailable (e.g. deployed
            // without the .git directory).
            console.error("[GitHub] local git shortlog failed, falling back to API:", err);
            try {
                const response = await this.client.get(
                    `/repos/${OWNER}/${REPO}/contributors`
                );

                const contributors: GitHubContributor[] = response.data.map(
                    (c: unknown) => {
                        const contributor = c as {
                            login: string;
                            avatar_url: string;
                            html_url: string;
                            contributions: number;
                        };
                        return {
                            login: contributor.login,
                            avatarUrl: contributor.avatar_url,
                            htmlUrl: contributor.html_url,
                            contributions: contributor.contributions,
                        };
                    }
                );

                this.cache.set(cacheKey, contributors);
                return contributors;
            } catch (apiErr) {
                handleAxiosError(apiErr);
            }
        }
    }

    async getReleases(): Promise<GitHubRelease[]> {
        const cacheKey = "releases";
        const cached = this.cache.get<GitHubRelease[]>(cacheKey);
        if (cached) return cached;

        try {
            const response = await this.client.get(
                `/repos/${OWNER}/${REPO}/releases`,
                { params: { per_page: 10 } }
            );

            const releases: GitHubRelease[] = response.data.map((r: unknown) => {
            const release = r as {
                tag_name: string;
                name: string;
                body: string;
                published_at: string;
                html_url: string;
                prerelease: boolean;
            };
            return {
                tagName: release.tag_name,
                name: release.name,
                body: release.body || "",
                publishedAt: release.published_at,
                htmlUrl: release.html_url,
                prerelease: release.prerelease,
            };
        });

            this.cache.set(cacheKey, releases);
            return releases;
        } catch (err) {
            handleAxiosError(err);
        }
    }

    async getRepoInfo(): Promise<GitHubRepoInfo> {
        const cacheKey = "repo";
        const cached = this.cache.get<GitHubRepoInfo>(cacheKey);
        if (cached) return cached;

        try {
            const response = await this.client.get(`/repos/${OWNER}/${REPO}`);
        const repo = response.data as {
            name: string;
            full_name: string;
            description: string;
            stargazers_count: number;
            forks_count: number;
            open_issues_count: number;
            language: string;
            created_at: string;
            updated_at: string;
            html_url: string;
        };

        const info: GitHubRepoInfo = {
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description || "",
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            openIssues: repo.open_issues_count,
            language: repo.language || "",
            createdAt: repo.created_at,
            updatedAt: repo.updated_at,
            htmlUrl: repo.html_url,
        };

            this.cache.set(cacheKey, info);
            return info;
        } catch (err) {
            handleAxiosError(err);
        }
    }

    async getCommitActivity(): Promise<GitHubCommitActivityWeek[]> {
        const cacheKey = "commit-activity";
        const cached = this.cache.get<GitHubCommitActivityWeek[]>(cacheKey);
        if (cached) return cached;

        try {
            let response = await this.client.get(
                `/repos/${OWNER}/${REPO}/stats/commit_activity`
            );
            // GitHub may return 202 if stats are being computed; retry once after 2s
            if (response.status === 202) {
                await new Promise((r) => setTimeout(r, 2000));
                response = await this.client.get(
                    `/repos/${OWNER}/${REPO}/stats/commit_activity`
                );
            }
            if (response.status === 202) {
                return [];
            }
            const data = response.data as { week: number; total: number }[];
            const activity = data.map((w) => ({ week: w.week, total: w.total }));
            this.cache.set(cacheKey, activity);
            return activity;
        } catch (err) {
            handleAxiosError(err);
        }
    }

    async getLanguages(): Promise<GitHubLanguages> {
        const cacheKey = "languages";
        const cached = this.cache.get<GitHubLanguages>(cacheKey);
        if (cached) return cached;

        try {
            const response = await this.client.get(`/repos/${OWNER}/${REPO}/languages`);
            const languages = response.data as GitHubLanguages;
            this.cache.set(cacheKey, languages);
            return languages;
        } catch (err) {
            handleAxiosError(err);
        }
    }

    async getCodeFrequency(): Promise<GitHubCodeFrequencyWeek[]> {
        const cacheKey = "code-frequency";
        const cached = this.cache.get<GitHubCodeFrequencyWeek[]>(cacheKey);
        if (cached) return cached;

        try {
            let response = await this.client.get(
                `/repos/${OWNER}/${REPO}/stats/code_frequency`
            );
            if (response.status === 202) {
                await new Promise((r) => setTimeout(r, 2000));
                response = await this.client.get(
                    `/repos/${OWNER}/${REPO}/stats/code_frequency`
                );
            }
            if (response.status === 202) {
                return [];
            }
            const data = response.data as [number, number, number][];
            const frequency = data.map((row) => ({
                week: row[0],
                additions: row[1],
                deletions: Math.abs(row[2]),
            }));
            this.cache.set(cacheKey, frequency);
            return frequency;
        } catch (err) {
            handleAxiosError(err);
        }
    }
}

import axios, { AxiosInstance } from "axios";
import {
    GitHubCommit,
    GitHubContributor,
    GitHubRelease,
    GitHubRepoInfo,
} from "../../shared/model";

const OWNER = "LPuehringerStudent";
const REPO = "EmberExchange";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
    }

    async getContributors(): Promise<GitHubContributor[]> {
        const cacheKey = "contributors";
        const cached = this.cache.get<GitHubContributor[]>(cacheKey);
        if (cached) return cached;

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
    }

    async getReleases(): Promise<GitHubRelease[]> {
        const cacheKey = "releases";
        const cached = this.cache.get<GitHubRelease[]>(cacheKey);
        if (cached) return cached;

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
    }

    async getRepoInfo(): Promise<GitHubRepoInfo> {
        const cacheKey = "repo";
        const cached = this.cache.get<GitHubRepoInfo>(cacheKey);
        if (cached) return cached;

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
    }
}

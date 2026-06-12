const getMock = jest.fn();
const execSyncMock = jest.fn();

jest.mock('axios', () => {
  class MockAxiosError extends Error {
    response?: { status: number; data?: unknown };
  }
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => ({ get: getMock })),
    },
    AxiosError: MockAxiosError,
  };
});

jest.mock('child_process', () => ({
  execSync: execSyncMock,
}));

import { GitHubService } from '../../backend/services/github-service';

describe('GitHubService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps commits and caches repeated calls', async () => {
    getMock.mockResolvedValueOnce({
      data: [{
        sha: 'abcdef123456',
        html_url: 'https://github.test/commit',
        commit: {
          message: 'Title\n\nBody line',
          author: { name: 'Alice', date: '2026-01-01' },
        },
        author: { login: 'alice', avatar_url: 'avatar.png' },
      }],
    });
    const service = new GitHubService();

    const first = await service.getCommits();
    const second = await service.getCommits();

    expect(first[0]).toEqual(expect.objectContaining({
      shortSha: 'abcdef1',
      messageTitle: 'Title',
      messageBody: ['Body line'],
      authorLogin: 'alice',
    }));
    expect(second).toEqual(first);
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it('counts contributors from local git history', async () => {
    execSyncMock.mockReturnValueOnce('   42\tdev\n    7\tother');
    const service = new GitHubService();

    const contributors = await service.getContributors();

    expect(execSyncMock).toHaveBeenCalledWith('git shortlog -sn HEAD', expect.any(Object));
    expect(contributors).toEqual([
      { login: 'dev', avatarUrl: 'https://github.com/dev.png', htmlUrl: 'https://github.com/dev', contributions: 42 },
      { login: 'other', avatarUrl: 'https://github.com/other.png', htmlUrl: 'https://github.com/other', contributions: 7 },
    ]);
  });

  it('falls back to GitHub API when git shortlog fails', async () => {
    execSyncMock.mockImplementationOnce(() => {
      throw new Error('not a git repo');
    });
    getMock.mockResolvedValueOnce({ data: [{ login: 'dev', avatar_url: 'a', html_url: 'h', contributions: 9 }] });
    const service = new GitHubService();

    expect(await service.getContributors()).toEqual([{ login: 'dev', avatarUrl: 'a', htmlUrl: 'h', contributions: 9 }]);
  });

  it('maps releases, repo info, languages and stats', async () => {
    getMock
      .mockResolvedValueOnce({ data: [{ tag_name: 'v1', name: 'One', body: null, published_at: 'now', html_url: 'url', prerelease: false }] })
      .mockResolvedValueOnce({ data: { name: 'EmberExchange', full_name: 'x/EmberExchange', description: null, stargazers_count: 1, forks_count: 2, open_issues_count: 3, language: null, created_at: 'c', updated_at: 'u', html_url: 'url' } })
      .mockResolvedValueOnce({ status: 200, data: [{ week: 1, total: 5 }] })
      .mockResolvedValueOnce({ data: { TypeScript: 100 } })
      .mockResolvedValueOnce({ status: 200, data: [[1, 10, -4]] });
    const service = new GitHubService();

    expect(await service.getReleases()).toEqual([{ tagName: 'v1', name: 'One', body: '', publishedAt: 'now', htmlUrl: 'url', prerelease: false }]);
    expect(await service.getRepoInfo()).toEqual(expect.objectContaining({ description: '', language: '' }));
    expect(await service.getCommitActivity()).toEqual([{ week: 1, total: 5 }]);
    expect(await service.getLanguages()).toEqual({ TypeScript: 100 });
    expect(await service.getCodeFrequency()).toEqual([{ week: 1, additions: 10, deletions: 4 }]);
  });

  it('returns empty stats while GitHub is still computing them', async () => {
    getMock.mockResolvedValue({ status: 202, data: [] });
    const service = new GitHubService();

    expect(await service.getCommitActivity()).toEqual([]);
  });
});

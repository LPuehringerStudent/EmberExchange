import express from "express";
import { StatusCodes } from "http-status-codes";
import { GitHubService } from "../services/github-service";

export const githubRouter = express.Router();
const service = new GitHubService();

/**
 * @openapi
 * /github/commits:
 *   get:
 *     summary: Get recent GitHub commits
 *     description: Retrieves the latest commits from the EmberExchange repository
 *     tags:
 *       - GitHub
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: per_page
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of commits per page
 *     responses:
 *       200:
 *         description: List of commits
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GitHubCommit'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
githubRouter.get("/github/commits", async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const perPage = parseInt(req.query.per_page as string) || 30;
        const commits = await service.getCommits(page, perPage);
        res.status(StatusCodes.OK).json(commits);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: "Failed to fetch commits from GitHub",
        });
    }
});

/**
 * @openapi
 * /github/contributors:
 *   get:
 *     summary: Get GitHub contributors
 *     description: Retrieves contributor statistics for the EmberExchange repository
 *     tags:
 *       - GitHub
 *     responses:
 *       200:
 *         description: List of contributors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GitHubContributor'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
githubRouter.get("/github/contributors", async (_req, res) => {
    try {
        const contributors = await service.getContributors();
        res.status(StatusCodes.OK).json(contributors);
    } catch (err) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            error: "Failed to fetch contributors from GitHub",
        });
    }
});

/**
 * @openapi
 * /github/releases:
 *   get:
 *     summary: Get GitHub releases
 *     description: Retrieves recent releases from the EmberExchange repository
 *     tags:
 *       - GitHub
 *     responses:
 *       200:
 *         description: List of releases
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GitHubRelease'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
githubRouter.get("/github/releases", async (_req, res) => {
    try {
        const releases = await service.getReleases();
        res.status(StatusCodes.OK).json(releases);
    } catch (err) {
        console.error("[GitHub] getReleases error:", err);
        const message = err instanceof Error ? err.message : "Failed to fetch releases from GitHub";
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: message });
    }
});

/**
 * @openapi
 * /github/repo:
 *   get:
 *     summary: Get repository info
 *     description: Retrieves metadata about the EmberExchange repository
 *     tags:
 *       - GitHub
 *     responses:
 *       200:
 *         description: Repository information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GitHubRepoInfo'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
githubRouter.get("/github/repo", async (_req, res) => {
    try {
        const info = await service.getRepoInfo();
        res.status(StatusCodes.OK).json(info);
    } catch (err) {
        console.error("[GitHub] getRepoInfo error:", err);
        const message = err instanceof Error ? err.message : "Failed to fetch repository info from GitHub";
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: message });
    }
});

githubRouter.get("/github/commit-activity", async (_req, res) => {
    try {
        const activity = await service.getCommitActivity();
        res.status(StatusCodes.OK).json(activity);
    } catch (err) {
        console.error("[GitHub] getCommitActivity error:", err);
        const message = err instanceof Error ? err.message : "Failed to fetch commit activity from GitHub";
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: message });
    }
});

githubRouter.get("/github/languages", async (_req, res) => {
    try {
        const languages = await service.getLanguages();
        res.status(StatusCodes.OK).json(languages);
    } catch (err) {
        console.error("[GitHub] getLanguages error:", err);
        const message = err instanceof Error ? err.message : "Failed to fetch languages from GitHub";
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: message });
    }
});

githubRouter.get("/github/code-frequency", async (_req, res) => {
    try {
        const frequency = await service.getCodeFrequency();
        res.status(StatusCodes.OK).json(frequency);
    } catch (err) {
        console.error("[GitHub] getCodeFrequency error:", err);
        const message = err instanceof Error ? err.message : "Failed to fetch code frequency from GitHub";
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: message });
    }
});
